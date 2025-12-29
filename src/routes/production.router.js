import express from 'express';
import ProductionController from '../controllers/production.controller.js';

const router = express.Router();

/**
 * ============================================================================
 * PRODUCTION TEMPLATES
 * ============================================================================
 */

// GET /production/templates - Get all active templates available for production
router.get('/templates', ProductionController.getAvailableTemplates);

/**
 * ============================================================================
 * PRODUCTION CALCULATION
 * ============================================================================
 */

// POST /production/calculate - Calculate material requirements and feasibility
// Body: { production_plan: [{ template_id, quantity }] }
router.post('/calculate', ProductionController.calculateRequirements);

/**
 * ============================================================================
 * PRODUCTION EXECUTION
 * ============================================================================
 */

// POST /production/execute - Execute bulk production
// Body: { production_plan: [{ template_id, quantity }], notes }
router.post('/execute', ProductionController.executeProduction);

/**
 * ============================================================================
 * PRODUCTION HISTORY
 * ============================================================================
 */

// GET /production/history - Get production history (grouped by batch)
router.get('/history', ProductionController.getProductionHistory);

export default router;
