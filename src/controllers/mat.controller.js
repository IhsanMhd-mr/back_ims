import MaterialRepo from '../repositories/mat.repository.js';
import { Op } from 'sequelize';

const MaterialController = {
    create: async (req, res) => {
        try {
            const payload = req.body || {};
            const result = await MaterialRepo.createMaterialEntry(payload);
            if (result.success) return res.status(201).json(result);
            return res.status(400).json(result);
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    },

    getAll: async (req, res) => {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 20;
            const filters = {};
            if (req.query.status) filters.status = req.query.status;
            if (req.query.date) filters.date = req.query.date; // DATEONLY format: 2025-12-06
            const result = await MaterialRepo.getMaterials({ page, limit, filters, order: [['createdAt', 'DESC']] });
            if (result.success) return res.status(200).json(result);
            return res.status(400).json(result);
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    },

    search: async (req, res) => {
        try {
            const searchTerm = req.query.q || req.query.search || '';
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 20;
            const result = await MaterialRepo.searchMaterials({ searchTerm, page, limit, order: [['createdAt', 'DESC']] });
            if (result.success) return res.status(200).json(result);
            return res.status(400).json(result);
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    },

    getById: async (req, res) => {
        try {
            const id = Number(req.params.id);
            if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
            const result = await MaterialRepo.getMaterialById(id);
            if (!result.success) return res.status(404).json(result);
            return res.status(200).json(result);
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    },

    update: async (req, res) => {
        try {
            const id = Number(req.params.id);
            if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
            const payload = req.body || {};
            // optional: set payload.updatedBy from req.user if auth exists
            const result = await MaterialRepo.updateMaterial(id, payload);
            if (result.success) return res.status(200).json(result);
            if (result.message === 'Material not found') return res.status(404).json(result);
            return res.status(400).json(result);
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    },

    statusUpdate: async (req, res) => {
        try {
            const id = Number(req.params.id);
            const statusParam = req.params.params; // route uses :params
            if (!id || !statusParam) return res.status(400).json({ success: false, message: 'Invalid parameters' });
            const status = String(statusParam);
            const result = await MaterialRepo.updateMaterialStatus(id, status);
            if (result.success) return res.status(200).json(result);
            if (result.message === 'Material not found') return res.status(404).json(result);
            return res.status(400).json(result);
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    },

    remove: async (req, res) => {
        try {
            const id = Number(req.params.id);
            if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
            const deletedBy = req.body?.deletedBy ?? req.query?.deletedBy ?? null;
            const result = await MaterialRepo.deleteMaterial(id, deletedBy);
            if (result.success) return res.status(200).json(result);
            if (result.message === 'Material not found') return res.status(404).json(result);
            return res.status(400).json(result);
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    },

    adminDelete: async (req, res) => {
        try {
            const id = Number(req.params.id);
            if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
            const result = await MaterialRepo.hardDeleteMaterial(id);
            if (result.success) return res.status(200).json(result);
            if (result.message === 'Material not found') return res.status(404).json(result);
            return res.status(400).json(result);
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    },

    getSummaries: async (req, res) => {
        try {
            const traceId = req.traceId || req.requestId || 'no-trace';
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 20;
            const filters = {};
            if (req.query.status) filters.status = req.query.status;
            if (req.query.name) filters.name = req.query.name;
            if (req.query.sku) filters.sku = req.query.sku;

            const result = await MaterialRepo.getMaterialSummaries({ page, limit, filters });
            if (result.success) return res.status(200).json(result);
            return res.status(400).json(result);
        } catch (err) {
            const traceId = req.traceId || req.requestId || 'no-trace';
            console.error(`[MaterialController][${traceId}] GET SUMMARIES - Error:`, err.message);
            return res.status(500).json({ success: false, message: err.message, traceId });
        }
    },

    // GET /material/skus - return unique sku + name pairs
    listSkus: async (req, res) => {
        try {
            const result = await MaterialRepo.getMaterialSkuGroups();
            if (result.success) return res.status(200).json(result);
            return res.status(400).json(result);
        } catch (err) {
            const traceId = req.traceId || req.requestId || 'no-trace';
            console.error(`[MaterialController][${traceId}] LIST SKUS - Error:`, err.message);
            return res.status(500).json({ success: false, message: err.message, traceId });
        }
    },

    // GET /material/skus/:sku - return all material variants for a given sku
    getSkuVariants: async (req, res) => {
        try {
            const sku = String(req.params.sku || '').trim();
            if (!sku) return res.status(400).json({ success: false, message: 'sku is required' });
            const result = await MaterialRepo.getMaterialsBySku(sku);
            if (result.success) return res.status(200).json(result);
            return res.status(400).json(result);
        } catch (err) {
            const traceId = req.traceId || req.requestId || 'no-trace';
            console.error(`[MaterialController][${traceId}] GET SKU VARIANTS - Error:`, err.message);
            return res.status(500).json({ success: false, message: err.message, traceId });
        }
    },

    // GET /material/variant/:variant_id - fetch single material variant by its variant_id
    getByVariantId: async (req, res) => {
        try {
            const traceId = req.traceId || req.requestId || 'no-trace';
            const variantId = String(req.params.variant_id || '').trim();
            if (!variantId) return res.status(400).json({ success: false, message: 'variant_id is required' });
            const result = await MaterialRepo.getMaterialByVariantId(variantId);
            if (!result.success) return res.status(404).json(result);
            return res.status(200).json(result);
        } catch (err) {
            const traceId = req.traceId || req.requestId || 'no-trace';
            console.error(`[MaterialController][${traceId}] GET BY VARIANT - Error:`, err.message);
            return res.status(500).json({ success: false, message: err.message, traceId });
        }
    },

    cloneWithPrice: async (req, res) => {
        try {
            const traceId = req.traceId || req.requestId || 'no-trace';
            const { sourceVariantId, newVariantId, overrides = {}, createdBy = null } = req.body || {};
            if (!sourceVariantId) {
                return res.status(400).json({ success: false, message: 'sourceVariantId is required' });
            }

            console.log(`[MaterialController][${traceId}] CLONE - source:${sourceVariantId} -> new:${newVariantId || '[auto]'} overrides:`, overrides);

            // Pass undefined for newVariantId when not provided; repository will auto-generate the next suffix (sku*1, sku*2 ...)
            const result = await MaterialRepo.cloneMaterialWithPrice({ sourceVariantId, newVariantId, overrides, createdBy });
            if (result.success) return res.status(201).json(result);

            // conflict or not found
            if (result.message && result.message.includes('exists')) return res.status(409).json(result);
            if (result.message && result.message.includes('not found')) return res.status(404).json(result);
            return res.status(400).json(result);
        } catch (err) {
            const traceId = req.traceId || req.requestId || 'no-trace';
            console.error(`[MaterialController][${traceId}] CLONE - Error:`, err.message);
            return res.status(500).json({ success: false, message: err.message, traceId });
        }
    }
};

export default MaterialController;