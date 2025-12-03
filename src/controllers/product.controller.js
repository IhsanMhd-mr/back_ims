import { ProductRepo } from '../repositories/product.repository.js';

const ProductController = {
    create: async (req, res) => {
        try {
            const traceId = req.traceId || req.requestId || 'no-trace';
            // console.log(`[ProductController][${traceId}] CREATE - Received payload:`,
                // JSON.stringify(req.body, null, 2));
            const payload = req.body || {};
            const result = await ProductRepo.createProductEntry(payload);
            // console.log(`[ProductController][${traceId}] CREATE - Repository result:`, result.success ? 'SUCCESS' : 'FAILED', result.message);
            if (result.success) return res.status(201).json(result);
            return res.status(400).json(result);
        } catch (err) {
            const traceId = req.traceId || req.requestId || 'no-trace';
            console.error(`[ProductController][${traceId}] CREATE - Error:`, err.message);
            return res.status(500).json({ success: false, message: err.message, traceId });
        }
    },

    getAll: async (req, res) => {
        try {
            const traceId = req.traceId || req.requestId || 'no-trace';
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 20;
            const filters = {};
            if (req.query.status) filters.status = req.query.status;
            // console.log(`[ProductController][${traceId}] GET ALL - Query params:`, { page, limit, filters });
            
            const result = await ProductRepo.getProducts({ page, limit, filters });

            // normalize Sequelize instances to plain objects for consistent API responses
            const responsePayload = { ...result };
            if (Array.isArray(result.data)) {
                responsePayload.data = result.data.map(item => (typeof item?.toJSON === 'function' ? item.toJSON() : item));
            }
            // console.log(`[ProductController][${traceId}] GET ALL - Normalized data:`, responsePayload.data);

            // console.log(`[ProductController][${traceId}] GET ALL - Repository returned:`, {
            //     success: responsePayload.success,
            //     recordCount: responsePayload.data?.length || 0,
            //     total: responsePayload.meta?.total || 0
            // });

            if (responsePayload.success) return res.status(200).json(responsePayload);
            return res.status(400).json(result);
        } catch (err) {
            const traceId = req.traceId || req.requestId || 'no-trace';
            console.error(`[ProductController][${traceId}] GET ALL - Error:`, err.message);
            return res.status(500).json({ success: false, message: err.message, traceId });
        }
    },

    search: async (req, res) => {
        try {
            const searchTerm = req.query.q || req.query.search || '';
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 20;
            const result = await ProductRepo.searchProducts({ searchTerm, page, limit });
            if (result.success) return res.status(200).json(result);
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

            const result = await ProductRepo.getProductSummaries({ page, limit, filters });
            if (result.success) return res.status(200).json(result);
            return res.status(400).json(result);
        } catch (err) {
            const traceId = req.traceId || req.requestId || 'no-trace';
            console.error(`[ProductController][${traceId}] GET SUMMARIES - Error:`, err.message);
            return res.status(500).json({ success: false, message: err.message, traceId });
        }
    },

    // GET /product/skus - return unique sku + name pairs
    listSkus: async (req, res) => {
        try {
            const result = await ProductRepo.getSkuGroups();
            if (result.success) return res.status(200).json(result);
            return res.status(400).json(result);
        } catch (err) {
            const traceId = req.traceId || req.requestId || 'no-trace';
            console.error(`[ProductController][${traceId}] LIST SKUS - Error:`, err.message);
            return res.status(500).json({ success: false, message: err.message, traceId });
        }
    },

    // GET /product/skus/:sku - return all product variants for a given sku
    getSkuVariants: async (req, res) => {
        try {
            const sku = String(req.params.sku || '').trim();
            if (!sku) return res.status(400).json({ success: false, message: 'sku is required' });
            const result = await ProductRepo.getProductsBySku(sku);
            if (result.success) return res.status(200).json(result);
            return res.status(400).json(result);
        } catch (err) {
            const traceId = req.traceId || req.requestId || 'no-trace';
            console.error(`[ProductController][${traceId}] GET SKU VARIANTS - Error:`, err.message);
            return res.status(500).json({ success: false, message: err.message, traceId });
        }
    },

    getById: async (req, res) => {
        try {
            const traceId = req.traceId || req.requestId || 'no-trace';
            const id = Number(req.params.id);
            // console.log(`[ProductController][${traceId}] GET BY ID - Requested ID:`, id);
            if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
            const result = await ProductRepo.getProductById(id);
            // console.log(`[ProductController][${traceId}] GET BY ID - Result:`, result.success ? 'FOUND' : 'NOT FOUND');
            if (!result.success) return res.status(404).json(result);
            return res.status(200).json(result);
        } catch (err) {
            const traceId = req.traceId || req.requestId || 'no-trace';
            console.error(`[ProductController][${traceId}] GET BY ID - Error:`, err.message);
            return res.status(500).json({ success: false, message: err.message, traceId });
        }
    },

    // GET /product/variant/:variant_id - fetch single product variant by its variant_id
    getByVariantId: async (req, res) => {
        try {
            const traceId = req.traceId || req.requestId || 'no-trace';
            const variantId = String(req.params.variant_id || '').trim();
            if (!variantId) return res.status(400).json({ success: false, message: 'variant_id is required' });
            const result = await ProductRepo.getProductByVariantId(variantId);
            if (!result.success) return res.status(404).json(result);
            return res.status(200).json(result);
        } catch (err) {
            const traceId = req.traceId || req.requestId || 'no-trace';
            console.error(`[ProductController][${traceId}] GET BY VARIANT - Error:`, err.message);
            return res.status(500).json({ success: false, message: err.message, traceId });
        }
    },

    update: async (req, res) => {
        try {
            const traceId = req.traceId || req.requestId || 'no-trace';
            const id = Number(req.params.id);
            // console.log(`[ProductController][${traceId}] UPDATE - ID:`, id, 'Payload:', JSON.stringify(req.body, null, 2));
            if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
            const payload = req.body || {};
            const result = await ProductRepo.updateProduct(id, payload);
            // console.log(`[ProductController][${traceId}] UPDATE - Result:`, result.success ? 'SUCCESS' : 'FAILED', result.message);
            if (result.success) return res.status(200).json(result);
            if (result.message === 'Product not found') return res.status(404).json(result);
            return res.status(400).json(result);
        } catch (err) {
            const traceId = req.traceId || req.requestId || 'no-trace';
            console.error(`[ProductController][${traceId}] UPDATE - Error:`, err.message);
            return res.status(500).json({ success: false, message: err.message, traceId });
        }
    },

    statusUpdate: async (req, res) => {
        try {
            const id = Number(req.params.id);
            const statusParam = req.params.params; // route uses :params
            if (!id || !statusParam) return res.status(400).json({ success: false, message: 'Invalid parameters' });
            const status = String(statusParam);
            const result = await ProductRepo.updateProductStatus(id, status);
            if (result.success) return res.status(200).json(result);
            if (result.message === 'Product not found') return res.status(404).json(result);
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
            const result = await ProductRepo.deleteProduct(id, deletedBy);
            if (result.success) return res.status(200).json(result);
            if (result.message === 'Product not found') return res.status(404).json(result);
            return res.status(400).json(result);
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    },

    adminDelete: async (req, res) => {
        try {
            const id = Number(req.params.id);
            if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
            const result = await ProductRepo.hardDeleteProduct(id);
            if (result.success) return res.status(200).json(result);
            if (result.message === 'Product not found') return res.status(404).json(result);
            return res.status(400).json(result);
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
,

    cloneWithPrice: async (req, res) => {
        try {
            const traceId = req.traceId || req.requestId || 'no-trace';
            const { sourceVariantId, newVariantId, overrides = {}, createdBy = null } = req.body || {};
            if (!sourceVariantId) {
                return res.status(400).json({ success: false, message: 'sourceVariantId is required' });
            }

            console.log(`[ProductController][${traceId}] CLONE - source:${sourceVariantId} -> new:${newVariantId || '[auto]'} overrides:`, overrides);

            // Pass undefined for newVariantId when not provided; repository will auto-generate the next suffix (sku*1, sku*2 ...)
            const result = await ProductRepo.cloneProductWithPrice({ sourceVariantId, newVariantId, overrides, createdBy });
            if (result.success) return res.status(201).json(result);

            // conflict or not found
            if (result.message && result.message.includes('exists')) return res.status(409).json(result);
            if (result.message && result.message.includes('not found')) return res.status(404).json(result);
            return res.status(400).json(result);
        } catch (err) {
            const traceId = req.traceId || req.requestId || 'no-trace';
            console.error(`[ProductController][${traceId}] CLONE - Error:`, err.message);
            return res.status(500).json({ success: false, message: err.message, traceId });
        }
    }
};

export default ProductController;