import { ConversionTemplate } from '../models/conversion-template.model.js';
import { ConversionRecord } from '../models/conversion-record.model.js';
import { Stock } from '../models/stock.model.js';
import { Op } from 'sequelize';

/**
 * Conversion Repository
 * Handles all operations related to conversion templates and records
 */
const ConversionRepo = {
  /**
   * Create a new conversion template
   */
  createTemplate: async (templateData) => {
    try {
      const {
        template_name,
        description,
        inputs,
        outputs,
        created_by,
      } = templateData;

      if (!template_name || !inputs?.length || !outputs?.length) {
        return {
          success: false,
          message: 'template_name, inputs, and outputs are required',
        };
      }

      const newTemplate = await ConversionTemplate.create({
        template_name,
        description,
        template_data: { inputs, outputs },
        created_by,
        status: 'ACTIVE',
      });

      return {
        success: true,
        data: newTemplate,
        message: 'Template created successfully',
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  /**
   * Get all templates (paginated)
   */
  getTemplates: async ({ page = 1, limit = 20, status = 'ACTIVE' } = {}) => {
    try {
      const offset = (page - 1) * limit;
      const where = status ? { status } : {};

      const { rows, count } = await ConversionTemplate.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
      });

      return {
        success: true,
        data: rows,
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit),
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  /**
   * Get template by ID
   */
  getTemplateById: async (templateId) => {
    try {
      const template = await ConversionTemplate.findByPk(templateId);

      if (!template) {
        return { success: false, message: 'Template not found' };
      }

      return { success: true, data: template };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  /**
   * Get template by name
   */
  getTemplateByName: async (templateName) => {
    try {
      const template = await ConversionTemplate.findOne({
        where: { template_name: templateName },
      });

      if (!template) {
        return { success: false, message: 'Template not found' };
      }

      return { success: true, data: template };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  /**
   * Update template
   */
  updateTemplate: async (templateId, updates) => {
    try {
      const template = await ConversionTemplate.findByPk(templateId);

      if (!template) {
        return { success: false, message: 'Template not found' };
      }

      // If template_data is being updated, ensure it has valid structure
      if (updates.inputs || updates.outputs) {
        updates.template_data = {
          inputs: updates.inputs || template.template_data.inputs,
          outputs: updates.outputs || template.template_data.outputs,
        };
        delete updates.inputs;
        delete updates.outputs;
      }

      await template.update(updates);

      return {
        success: true,
        data: template,
        message: 'Template updated successfully',
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  /**
   * Delete/archive template
   */
  deleteTemplate: async (templateId, deletedBy) => {
    try {
      const template = await ConversionTemplate.findByPk(templateId);

      if (!template) {
        return { success: false, message: 'Template not found' };
      }

      await template.update({ status: 'ARCHIVED', deleted_by: deletedBy });
      await template.destroy(); // soft-delete via paranoid

      return { success: true, message: 'Template archived successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  /**
   * Get available stock for a SKU
   */
  getStockBySku: async (sku, itemType = null) => {
    try {
      const where = { sku, status: 'ACTIVE' };

      if (itemType) {
        where.item_type = itemType;
      }

      const stocks = await Stock.findAll({
        where,
        order: [['date', 'ASC']], // FIFO
      });

      if (!stocks || stocks.length === 0) {
        return {
          success: false,
          available_qty: 0,
          message: 'No stock found for this SKU',
        };
      }

      // Calculate total available quantity
      const totalQty = stocks.reduce((sum, s) => sum + (s.qty || 0), 0);

      return {
        success: true,
        sku,
        available_qty: totalQty,
        unit: stocks[0].unit,
        item_type: stocks[0].item_type,
        batches: stocks.map((s) => ({
          batch_number: s.batch_number,
          qty: s.qty,
          cost: s.cost,
          date: s.date,
        })),
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  /**
   * Create conversion record (after successful stock movements)
   */
  createConversionRecord: async (conversionData) => {
    try {
      const {
        conversion_ref,
        template_id,
        template_name,
        inputs,
        outputs,
        total_input_cost,
        created_by,
        notes,
      } = conversionData;

      if (!conversion_ref || !inputs || !outputs) {
        return {
          success: false,
          message: 'conversion_ref, inputs, and outputs are required',
        };
      }

      const newRecord = await ConversionRecord.create({
        conversion_ref,
        template_id,
        template_name,
        inputs,
        outputs,
        total_input_cost: total_input_cost || 0,
        notes,
        created_by,
        status: 'COMPLETED',
      });

      return {
        success: true,
        data: newRecord,
        message: 'Conversion record created successfully',
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  /**
   * Get conversion records (paginated)
   */
  getConversionRecords: async ({
    page = 1,
    limit = 20,
    status = 'COMPLETED',
  } = {}) => {
    try {
      const offset = (page - 1) * limit;
      const where = status ? { status } : {};

      const { rows, count } = await ConversionRecord.findAndCountAll({
        where,
        include: [
          {
            model: ConversionTemplate,
            as: 'template',
            attributes: ['id', 'template_name'],
          },
        ],
        limit,
        offset,
        order: [['createdAt', 'DESC']],
      });

      return {
        success: true,
        data: rows,
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit),
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  /**
   * Get conversion record by ID
   */
  getConversionRecordById: async (recordId) => {
    try {
      const record = await ConversionRecord.findByPk(recordId, {
        include: [
          {
            model: ConversionTemplate,
            as: 'template',
          },
        ],
      });

      if (!record) {
        return { success: false, message: 'Conversion record not found' };
      }

      return { success: true, data: record };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  /**
   * Get conversion record by reference
   */
  getConversionRecordByRef: async (conversionRef) => {
    try {
      const record = await ConversionRecord.findOne({
        where: { conversion_ref: conversionRef },
        include: [
          {
            model: ConversionTemplate,
            as: 'template',
          },
        ],
      });

      if (!record) {
        return { success: false, message: 'Conversion record not found' };
      }

      return { success: true, data: record };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },
};

export default ConversionRepo;
