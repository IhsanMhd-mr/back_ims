import { ConversionTemplate } from '../models/conversion-template.model.js';
import { ConversionRecord } from '../models/conversion-record.model.js';
import { Stock } from '../models/stock.model.js';
import { refreshCurrentValueBulk } from '../models/stock.model.js';
import ConversionRepo from './conversion.repository.js';
import { Op } from 'sequelize';

/**
 * Production Repository
 * Handles daily production operations using existing conversion templates
 */
const ProductionRepo = {
  /**
   * Get all active templates suitable for production
   */
  getActiveTemplates: async () => {
    try {
      const templates = await ConversionTemplate.findAll({
        where: { status: 'ACTIVE' },
        order: [['template_name', 'ASC']],
        attributes: ['id', 'template_name', 'description', 'template_data', 'createdAt'],
      });

      return {
        success: true,
        data: templates,
        total: templates.length,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  /**
   * Calculate material requirements for multiple templates with quantities
   * Input: [{ template_id, quantity }]
   * Output: aggregated material requirements, product outputs, and feasibility
   */
  calculateRequirements: async (productionPlan) => {
    try {
      if (!Array.isArray(productionPlan) || productionPlan.length === 0) {
        return {
          success: false,
          message: 'productionPlan must be a non-empty array',
        };
      }

      const materialRequirements = {}; // { sku: { qty, unit, item_type, item_name } }
      const productOutputs = {}; // { sku: { qty, unit, item_type, item_name } }
      const templateDetails = [];

      // Step 1: Calculate requirements from each template
      for (const plan of productionPlan) {
        const { template_id, quantity, multiplier } = plan;
        const actualQuantity = quantity || multiplier || 1;

        if (!template_id || actualQuantity <= 0) {
          return {
            success: false,
            message: 'Each plan item must have template_id and positive quantity/multiplier',
          };
        }

        // Fetch template
        const templateResult = await ConversionRepo.getTemplateById(template_id);
        if (!templateResult.success) {
          return {
            success: false,
            message: `Template ${template_id} not found`,
          };
        }

        const template = templateResult.data;
        const { inputs, outputs } = template.template_data;

        // Aggregate inputs (materials)
        for (const input of inputs) {
          const requiredQty = input.qty * actualQuantity;
          const key = `${input.sku}_${input.item_type}`;

          if (!materialRequirements[key]) {
            materialRequirements[key] = {
              sku: input.sku,
              item_type: input.item_type,
              item_name: input.item_name,
              unit: input.unit,
              qty: 0,
              fk_id: input.fk_id,
              variant_id: input.variant_id,
            };
          }
          materialRequirements[key].qty += requiredQty;
        }

        // Aggregate outputs (products)
        for (const output of outputs) {
          const producedQty = output.qty * actualQuantity;
          const key = `${output.sku}_${output.item_type}`;

          if (!productOutputs[key]) {
            productOutputs[key] = {
              sku: output.sku,
              item_type: output.item_type,
              item_name: output.item_name,
              unit: output.unit,
              qty: 0,
              fk_id: output.fk_id,
              variant_id: output.variant_id,
              cost: output.cost || 0,
            };
          }
          productOutputs[key].qty += producedQty;
        }

        templateDetails.push({
          template_id,
          template_name: template.template_name,
          quantity: actualQuantity,
        });
      }

      // Step 2: Check stock availability for all materials
      const materialAvailability = [];
      let allFeasible = true;

      for (const key in materialRequirements) {
        const material = materialRequirements[key];
        const stockResult = await ConversionRepo.getStockBySku(
          material.sku,
          material.item_type
        );

        const available = stockResult.success ? stockResult.available_qty : 0;
        const shortage = Math.max(0, material.qty - available);
        const isFeasible = available >= material.qty;

        if (!isFeasible) {
          allFeasible = false;
        }

        materialAvailability.push({
          sku: material.sku,
          item_type: material.item_type,
          item_name: material.item_name,
          unit: material.unit,
          required: material.qty,
          available,
          shortage,
          feasible: isFeasible,
        });
      }

      return {
        success: true,
        data: {
          materials: materialAvailability,
          products: Object.values(productOutputs),
          templates: templateDetails,
          feasible: allFeasible,
          summary: {
            total_materials: materialAvailability.length,
            total_products: Object.keys(productOutputs).length,
            total_templates: templateDetails.length,
          },
        },
      };
    } catch (error) {
      console.error('[ProductionRepo] calculateRequirements ERROR:', error);
      return { success: false, message: error.message };
    }
  },

  /**
   * Execute bulk production for multiple templates
   * This is an atomic transaction - all or nothing
   */
  executeBulkProduction: async (productionData) => {
    const t = await Stock.sequelize.transaction();

    try {
      const { production_plan, notes, created_by } = productionData;

      if (!Array.isArray(production_plan) || production_plan.length === 0) {
        await t.rollback();
        return {
          success: false,
          message: 'production_plan is required and must be non-empty',
        };
      }

      // Step 1: Calculate and validate requirements
      const requirements = await ProductionRepo.calculateRequirements(production_plan);

      if (!requirements.success) {
        await t.rollback();
        return requirements;
      }

      if (!requirements.data.feasible) {
        await t.rollback();
        return {
          success: false,
          message: 'Insufficient materials for production',
          shortages: requirements.data.materials.filter((m) => !m.feasible),
        };
      }

      // Generate production batch reference
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const productionRef = `PROD-${year}${month}${day}-${Math.random()
        .toString(36)
        .substr(2, 9)
        .toUpperCase()}`;
      const batchNumber = productionRef;

      // Step 2: Deduct materials (create OUT movements)
      const outMovements = [];
      let totalInputCost = 0;

      for (const material of requirements.data.materials) {
        // Get FIFO batches
        const batches = await Stock.findAll({
          where: {
            sku: material.sku,
            item_type: material.item_type,
            status: 'ACTIVE',
            qty: { [Op.gt]: 0 },
          },
          order: [['date', 'ASC']],
          transaction: t,
        });

        let remainingQty = material.required;
        let materialCost = 0;

        for (const batch of batches) {
          if (remainingQty <= 0) break;

          const qtyToRemove = Math.min(batch.qty, remainingQty);
          materialCost += qtyToRemove * (batch.cost || 0);

          // Create OUT movement
          const outMovement = await Stock.create(
            {
              item_type: material.item_type,
              fk_id: material.fk_id,
              sku: material.sku,
              variant_id: material.variant_id,
              item_name: material.item_name,
              batch_number: batchNumber,
              qty: qtyToRemove,
              unit: material.unit,
              cost: batch.cost || 0,
              date: today.toISOString().split('T')[0],
              movement_type: 'OUT',
              source: 'PRODUCTION',
              description: `Used in daily production: ${productionRef}`,
              status: 'ACTIVE',
              createdBy: created_by,
            },
            { transaction: t }
          );

          outMovements.push(outMovement);
          remainingQty -= qtyToRemove;

          // Update batch qty
          batch.qty -= qtyToRemove;
          if (batch.qty <= 0) {
            await batch.update({ status: 'INACTIVE' }, { transaction: t });
          } else {
            await batch.save({ transaction: t });
          }
        }

        totalInputCost += materialCost;
      }

      // Step 3: Add products (create IN movements)
      const inMovements = [];

      for (const product of requirements.data.products) {
        const inMovement = await Stock.create(
          {
            item_type: product.item_type,
            fk_id: product.fk_id,
            sku: product.sku,
            variant_id: product.variant_id,
            item_name: product.item_name,
            batch_number: batchNumber,
            qty: product.qty,
            unit: product.unit,
            cost: product.cost || 0,
            date: today.toISOString().split('T')[0],
            movement_type: 'IN',
            source: 'PRODUCTION',
            description: `Produced in daily production: ${productionRef}`,
            status: 'ACTIVE',
            createdBy: created_by,
          },
          { transaction: t }
        );

        inMovements.push(inMovement);
      }

      // Step 4: Create conversion records for each template in the plan
      const conversionRecords = [];

      for (const plan of production_plan) {
        const { template_id, quantity } = plan;
        const actualQuantity = quantity || 1;

        const templateResult = await ConversionRepo.getTemplateById(template_id);
        if (!templateResult.success) continue;

        const template = templateResult.data;
        const { inputs, outputs } = template.template_data;

        // Scale inputs and outputs by quantity
        const scaledInputs = inputs.map((i) => ({
          ...i,
          qty: i.qty * actualQuantity,
        }));
        const scaledOutputs = outputs.map((o) => ({
          ...o,
          qty: o.qty * actualQuantity,
        }));

        const conversionRef = `${productionRef}-T${template_id}`;

        const recordResult = await ConversionRepo.createConversionRecord({
          conversion_ref: conversionRef,
          template_id,
          template_name: template.template_name,
          inputs: scaledInputs,
          outputs: scaledOutputs,
          total_input_cost: totalInputCost / production_plan.length, // distribute cost
          notes: notes || `Daily production batch: ${productionRef}`,
          created_by,
        });

        if (recordResult.success) {
          conversionRecords.push(recordResult.data);
        }
      }

      // Commit transaction
      await t.commit();

      // Refresh current values (async, non-blocking)
      const allMovements = [...outMovements, ...inMovements];
      refreshCurrentValueBulk(allMovements).catch((err) =>
        console.error('Refresh error:', err)
      );

      return {
        success: true,
        data: {
          production_ref: productionRef,
          materials_consumed: requirements.data.materials.length,
          products_produced: requirements.data.products.length,
          templates_used: requirements.data.templates.length,
          movements_created: outMovements.length + inMovements.length,
          conversion_records: conversionRecords.length,
        },
        message: 'Daily production executed successfully',
      };
    } catch (error) {
      await t.rollback();
      console.error('[ProductionRepo] executeBulkProduction ERROR:', error);
      return { success: false, message: error.message };
    }
  },

  /**
   * Get production history (conversion records filtered by production source)
   */
  getProductionHistory: async ({ page = 1, limit = 20, date_from, date_to } = {}) => {
    try {
      const offset = (page - 1) * limit;
      const where = { status: 'COMPLETED' };

      // Filter by date range if provided
      if (date_from || date_to) {
        where.createdAt = {};
        if (date_from) {
          where.createdAt[Op.gte] = new Date(date_from);
        }
        if (date_to) {
          where.createdAt[Op.lte] = new Date(date_to);
        }
      }

      const { rows, count } = await ConversionRecord.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        attributes: [
          'id',
          'conversion_ref',
          'template_id',
          'template_name',
          'inputs',
          'outputs',
          'total_input_cost',
          'notes',
          'createdAt',
        ],
      });

      // Group by production batch (same date and similar ref prefix)
      const groupedProduction = {};

      for (const record of rows) {
        // Extract production ref prefix (e.g., PROD-20251229-ABC)
        const ref = record.conversion_ref;
        const batchRef = ref.includes('-T') ? ref.split('-T')[0] : ref;

        if (!groupedProduction[batchRef]) {
          groupedProduction[batchRef] = {
            production_ref: batchRef,
            date: record.createdAt,
            templates: [],
            total_cost: 0,
          };
        }

        groupedProduction[batchRef].templates.push({
          template_id: record.template_id,
          template_name: record.template_name,
          inputs: record.inputs,
          outputs: record.outputs,
        });
        groupedProduction[batchRef].total_cost += parseFloat(
          record.total_input_cost || 0
        );
      }

      return {
        success: true,
        data: Object.values(groupedProduction),
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit),
      };
    } catch (error) {
      console.error('[ProductionRepo] getProductionHistory ERROR:', error);
      return { success: false, message: error.message };
    }
  },
};

export default ProductionRepo;
