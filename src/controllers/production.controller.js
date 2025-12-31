import ProductionRepo from '../repositories/production.repository.js';

/**
 * Production Controller
 * Handles daily production operations using conversion templates
 */
const ProductionController = {
  /**
   * GET /production/templates
   * Get all active templates available for production
   */
  getAvailableTemplates: async (req, res) => {
    try {
      const result = await ProductionRepo.getActiveTemplates();

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * POST /production/calculate
   * Calculate material requirements and product outputs for a production plan
   * Body: { production_plan: [{ template_id, quantity }] }
   */
  calculateRequirements: async (req, res) => {
    try {
      const { production_plan } = req.body;

      if (!production_plan || !Array.isArray(production_plan)) {
        return res.status(400).json({
          success: false,
          message: 'production_plan array is required',
        });
      }

      const result = await ProductionRepo.calculateRequirements(production_plan);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * POST /production/execute
   * Execute bulk production for multiple templates
   * Body: { production_plan: [{ template_id, quantity }], notes, created_by }
   */
  executeProduction: async (req, res) => {
    try {
      const { production_plan, notes } = req.body;
      const created_by = req.user?.id || null;

      if (!production_plan || !Array.isArray(production_plan)) {
        return res.status(400).json({
          success: false,
          message: 'production_plan array is required',
        });
      }

      if (production_plan.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'production_plan cannot be empty',
        });
      }

      const result = await ProductionRepo.executeBulkProduction({
        production_plan,
        notes,
        created_by,
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
   * GET /production/history
   * Get production history (grouped by batch)
   */
  getProductionHistory: async (req, res) => {
    try {
      const { page = 1, limit = 20, date_from, date_to } = req.query;

      const result = await ProductionRepo.getProductionHistory({
        page: parseInt(page),
        limit: parseInt(limit),
        date_from,
        date_to,
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },
};

export default ProductionController;
