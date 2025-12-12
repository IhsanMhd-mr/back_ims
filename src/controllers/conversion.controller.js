import ConversionRepo from '../repositories/conversion.repository.js';
import StockRepo from '../repositories/stock.repository.js';
import { Stock, refreshCurrentValueBulk } from '../models/stock.model.js';
import { Op } from 'sequelize';

/**
 * Conversion Controller
 * Handles all conversion-related endpoints
 */
const ConversionController = {
  /**
   * GET /conversion/templates
   * Get all conversion templates (paginated, filtered by status)
   */
  getTemplates: async (req, res) => {
    try {
      const { page = 1, limit = 20, status = 'ACTIVE' } = req.query;

      const result = await ConversionRepo.getTemplates({
        page: parseInt(page),
        limit: parseInt(limit),
        status,
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * GET /conversion/templates/:id
   * Get a specific template by ID
   */
  getTemplateById: async (req, res) => {
    try {
      const { id } = req.params;

      const result = await ConversionRepo.getTemplateById(id);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * POST /conversion/templates
   * Create a new conversion template
   */
  createTemplate: async (req, res) => {
    try {
      const { template_name, description, inputs, outputs } = req.body;
      const userId = req.user?.id || null;

      if (!template_name || !inputs?.length || !outputs?.length) {
        return res.status(400).json({
          success: false,
          message: 'template_name, inputs array, and outputs array are required',
        });
      }

      const result = await ConversionRepo.createTemplate({
        template_name,
        description,
        inputs,
        outputs,
        created_by: userId,
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(201).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * PUT /conversion/templates/:id
   * Update a conversion template
   */
  updateTemplate: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const result = await ConversionRepo.updateTemplate(id, updates);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * DELETE /conversion/templates/:id
   * Archive/delete a template
   */
  deleteTemplate: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id || null;

      const result = await ConversionRepo.deleteTemplate(id, userId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * GET /conversion/stock-check?sku=SAND-100
   * Check available stock for a SKU
   */
  checkStock: async (req, res) => {
    try {
      const { sku, item_type } = req.query;

      if (!sku) {
        return res.status(400).json({
          success: false,
          message: 'sku query parameter is required',
        });
      }

      const result = await ConversionRepo.getStockBySku(sku, item_type);

      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * POST /conversion/execute
   * Execute a conversion transaction
   * 1. Validate stock availability
   * 2. Create OUT movements for inputs
   * 3. Create IN movements for outputs
   * 4. Create conversion record
   */
  executeConversion: async (req, res) => {
    const t = await Stock.sequelize.transaction();

    try {
      const {
        template_id,
        template_name,
        inputs, // [{ sku, qty, unit, item_type, fk_id }]
        outputs, // [{ sku, qty, unit, item_type, fk_id }]
        notes,
      } = req.body;
      const userId = req.user?.id || null;

      if (!inputs?.length || !outputs?.length) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'inputs and outputs are required',
        });
      }

      // Generate a matching batch number for the entire conversion
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      // const batchNumber = `PROD-${year}${month}${day}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Generate conversion reference early (needed for stock descriptions)
      const conversionRef = `CONV-${year}${month}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const batchNumber = conversionRef; // Use conversion reference as batch number
      // Step 1: Validate stock availability for all inputs
      const stockValidation = [];
      for (const input of inputs) {
        const stock = await ConversionRepo.getStockBySku(input.sku, input.item_type);
        if (!stock.success || stock.available_qty < input.qty) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${input.sku}. Required: ${input.qty}, Available: ${stock.available_qty}`,
          });
        }
        stockValidation.push(stock);
      }

      // Step 2: Create OUT movements for inputs
      const outMovements = [];
      let totalInputCost = 0;

      for (const input of inputs) {
        // Get FIFO batches
        const batches = await Stock.findAll({
          where: {
            sku: input.sku,
            item_type: input.item_type,
            status: 'ACTIVE',
          },
          order: [['date', 'ASC']],
          transaction: t,
        });

        let remainingQty = input.qty;
        let inputCost = 0;

        for (const batch of batches) {
          if (remainingQty <= 0) break;

          const qtyToRemove = Math.min(batch.qty, remainingQty);
          inputCost += qtyToRemove * batch.cost;

          // Create OUT movement
          // MATERIAL OUT -> source: 'PRODUCTION' (used in production)
          const outMovement = await Stock.create(
            {
              item_type: input.item_type,
              fk_id: input.fk_id,
              sku: input.sku,
              variant_id: input.variant_id,
              item_name: input.item_name,
              batch_number: batchNumber,
              qty: qtyToRemove,
              unit: input.unit,
              cost: batch.cost,
              date: new Date().toISOString().split('T')[0],
              movement_type: 'OUT',
              source: 'PRODUCTION',
              description: `Spent in conversion: ${conversionRef}`,
              status: 'ACTIVE',
              createdBy: userId,
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

        totalInputCost += inputCost;
      }

      // Step 3: Create IN movements for outputs
      const inMovements = [];

      for (const output of outputs) {
        // PRODUCT IN -> source: 'PRODUCTION' (produced)
        const inMovement = await Stock.create(
          {
            item_type: output.item_type,
            fk_id: output.fk_id,
            sku: output.sku,
            variant_id: output.variant_id,
            item_name: output.item_name,
            batch_number: batchNumber,
            qty: output.qty,
            unit: output.unit,
            cost: output.cost || 0,
            date: new Date().toISOString().split('T')[0],
            movement_type: 'IN',
            source: 'PRODUCTION',
            description: `Produced in conversion: ${conversionRef}`,
            status: 'ACTIVE',
            createdBy: userId,
          },
          { transaction: t }
        );

        inMovements.push(inMovement);
      }

      // Step 4: Create conversion record
      const recordResult = await ConversionRepo.createConversionRecord({
        conversion_ref: conversionRef,
        template_id,
        template_name,
        inputs: inputs.map((i) => ({
          sku: i.sku,
          qty: i.qty,
          unit: i.unit,
          item_type: i.item_type,
          fk_id: i.fk_id,
        })),
        outputs: outputs.map((o) => ({
          sku: o.sku,
          qty: o.qty,
          unit: o.unit,
          item_type: o.item_type,
          fk_id: o.fk_id,
        })),
        total_input_cost: totalInputCost,
        notes,
        created_by: userId,
      });

      if (!recordResult.success) {
        await t.rollback();
        return res.status(400).json(recordResult);
      }

      // Commit transaction
      await t.commit();

      // Refresh current values for all affected items (inputs and outputs)
      const allMovements = [...outMovements, ...inMovements];
      await refreshCurrentValueBulk(allMovements).catch(err => console.error('Refresh error:', err));

      return res.status(201).json({
        success: true,
        data: {
          conversion_record: recordResult.data,
          conversion_ref: conversionRef,
          movements_created: outMovements.length + inMovements.length,
        },
        message: 'Conversion executed successfully',
      });
    } catch (err) {
      await t.rollback();
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * GET /conversion/records
   * Get all conversion records (paginated)
   */
  getRecords: async (req, res) => {
    try {
      const { page = 1, limit = 20, status = 'COMPLETED' } = req.query;

      const result = await ConversionRepo.getConversionRecords({
        page: parseInt(page),
        limit: parseInt(limit),
        status,
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * GET /conversion/records/:id
   * Get a specific conversion record
   */
  getRecordById: async (req, res) => {
    try {
      const { id } = req.params;

      const result = await ConversionRepo.getConversionRecordById(id);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },
};

export default ConversionController;
