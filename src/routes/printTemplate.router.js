import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const printTemplateRouter = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Correct path using __dirname (this file's directory)
// backend/src/routes -> ../../../ -> project root -> frontend/src/templates/printTemplates.json
const PRINT_TEMPLATES_PATH = path.join(__dirname, '../../../frontend/src/templates/printTemplates.json');

// Get current print templates
printTemplateRouter.get('/templates', async (req, res) => {
  try {
    const data = await fs.readFile(PRINT_TEMPLATES_PATH, 'utf-8');
    const templates = JSON.parse(data);
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Failed to read print templates:', error.message);
    res.status(500).json({ success: false, error: 'Failed to read print templates', details: error.message });
  }
});

// Save/Update print templates
printTemplateRouter.post('/templates/save', async (req, res) => {
  try {
    const { templates, documentTypes } = req.body;

    if (!templates || !documentTypes) {
      return res.status(400).json({ success: false, error: 'Missing templates or documentTypes' });
    }

    // Read current file to merge
    let currentData = {};
    try {
      const existingData = await fs.readFile(PRINT_TEMPLATES_PATH, 'utf-8');
      currentData = JSON.parse(existingData);
    } catch (e) {
      console.warn('Existing file not found, creating new');
    }

    // Merge with existing data
    const updatedData = {
      ...currentData,
      templates,
      documentTypes
    };

    // Write updated data back to file
    await fs.writeFile(PRINT_TEMPLATES_PATH, JSON.stringify(updatedData, null, 2), 'utf-8');

    res.json({ success: true, message: 'Print templates saved successfully', data: updatedData });
  } catch (error) {
    console.error('Failed to save print templates:', error.message);
    res.status(500).json({ success: false, error: 'Failed to save print templates', details: error.message });
  }
});

// Save specific template field visibility
printTemplateRouter.post('/templates/:templateType/save-fields', async (req, res) => {
  try {
    const { templateType } = req.params;
    const { fieldVisibility } = req.body;

    console.log(`Saving fields for template: ${templateType}`);

    if (!fieldVisibility) {
      return res.status(400).json({ success: false, error: 'Missing fieldVisibility' });
    }

    // Read current file or create it
    let templates;
    try {
      const data = await fs.readFile(PRINT_TEMPLATES_PATH, 'utf-8');
      templates = JSON.parse(data);
    } catch (e) {
      // File doesn't exist, create default structure
      console.log('Creating new printTemplates.json file');
      templates = {
        templates: {
          color: {
            id: 'color',
            name: 'Color Invoice',
            icon: '🎨',
            description: 'Colorful invoice template with formatted layout',
            type: 'color',
            defaultFields: fieldVisibility
          },
          simple: {
            id: 'simple',
            name: 'Simple Receipt',
            icon: '📄',
            description: 'Plain text receipt template for basic printing',
            type: 'simple',
            defaultFields: {}
          }
        },
        documentTypes: {
          bill: { name: 'Bill', icon: '📋', fieldsList: [] },
          grn: { name: 'GRN - Goods Receipt Note', icon: '📦', fieldsList: [] },
          wastage: { name: 'Wastage', icon: '♻️', fieldsList: [] },
          return: { name: 'Return', icon: '↩️', fieldsList: [] }
        }
      };
    }

    // Update the template's default fields
    if (templates.templates && templates.templates[templateType]) {
      templates.templates[templateType].defaultFields = fieldVisibility;
      
      // Write back to file
      await fs.writeFile(PRINT_TEMPLATES_PATH, JSON.stringify(templates, null, 2), 'utf-8');
      
      console.log(`Successfully saved fields for ${templateType}`);
      res.json({ success: true, message: 'Template fields saved successfully', data: templates.templates[templateType] });
    } else {
      res.status(400).json({ success: false, error: `Template ${templateType} not found` });
    }
  } catch (error) {
    console.error('Failed to save template fields:', error.message);
    res.status(500).json({ success: false, error: 'Failed to save template fields', details: error.message });
  }
});

export default printTemplateRouter;
