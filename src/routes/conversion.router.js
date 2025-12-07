import express from 'express';
import ConversionController from '../controllers/conversion.controller.js';

const router = express.Router();

/**
 * ============================================================================
 * CONVERSION TEMPLATES
 * ============================================================================
 */

// GET /conversion/templates - Get all templates (paginated, filtered by status)
router.get('/templates', ConversionController.getTemplates);

// GET /conversion/templates/:id - Get a specific template
router.get('/templates/:id', ConversionController.getTemplateById);

// POST /conversion/templates - Create a new template
router.post('/templates', ConversionController.createTemplate);

// PUT /conversion/templates/:id - Update a template
router.put('/templates/:id', ConversionController.updateTemplate);

// DELETE /conversion/templates/:id - Archive/delete a template
router.delete('/templates/:id', ConversionController.deleteTemplate);

/**
 * ============================================================================
 * STOCK CHECKING
 * ============================================================================
 */

// GET /conversion/stock-check?sku=SAND-100 - Check available stock for a SKU
router.get('/stock-check', ConversionController.checkStock);

/**
 * ============================================================================
 * CONVERSION EXECUTION
 * ============================================================================
 */

// POST /conversion/execute - Execute a conversion transaction
router.post('/execute', ConversionController.executeConversion);

/**
 * ============================================================================
 * CONVERSION RECORDS
 * ============================================================================
 */

// GET /conversion/records - Get all conversion records (paginated)
router.get('/records', ConversionController.getRecords);

// GET /conversion/records/:id - Get a specific conversion record
router.get('/records/:id', ConversionController.getRecordById);

export default router;
