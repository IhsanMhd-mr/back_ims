import { Product } from '../models/product.model.js';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';

const ProductRepo = {
    createProductEntry: async (productData) => {
        try {
            console.log('[ProductRepo] CREATE - Creating product with data:', JSON.stringify(productData, null, 2));
            // ensure variant_id is set from SKU
            productData.variant_id = productData.sku;
            // map incoming frontend `qty` or legacy `weight` to the new `quantity` column
            if (productData.qty !== undefined && productData.qty !== null) {
                productData.quantity = parseInt(productData.qty, 10);
            } else if (productData.weight !== undefined && productData.weight !== null) {
                productData.quantity = parseInt(productData.weight, 10);
            }
            console.log('[ProductRepo] CREATE - Creating product with data:', JSON.stringify(productData, null, 2));
            
            const newProduct = await Product.create(productData);
            console.log('[ProductRepo] CREATE - Product created successfully:', newProduct.id);
            return { success: true, data: newProduct, message: 'Product created successfully' };
        } catch (error) {
            console.error('[ProductRepo] CREATE - Error creating product:', error.message);
            return { success: false, message: error.message };
        }
    },

    getProducts: async ({ page = 1, limit = 20, filters = {}, order = [['createdAt', 'DESC']] } = {}) => {
        try {
            console.log('[ProductRepo] GET ALL - Query params:', { page, limit, filters });
            const offset = (page - 1) * limit;
            const where = { ...filters };
            const { rows: data, count: total } = await Product.findAndCountAll({
                where,
                order,
                limit,
                offset
            });
            console.log('[ProductRepo] GET ALL - Query result:', { recordCount: data.length, total, pages: Math.ceil(total / limit) });

            return {
                success: true,
                data,
                meta: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('[ProductRepo] GET ALL - Query error:', error.message);
            return { success: false, message: error.message };
        }
    },

    // Return a lightweight product list with selected attributes for frontends
    getProductSummaries: async ({ page = 1, limit = 20, filters = {}, order = [['createdAt', 'DESC']] } = {}) => {
        try {
            const offset = (page - 1) * limit;
            // build where clause; support name partial match alongside other filters
            const where = {};
            if (filters) {
                if (filters.status) where.status = filters.status;
                if (filters.name) where.name = { [Op.iLike]: `%${filters.name}%` };
                if (filters.sku) where.sku = filters.sku;
            }
            const attributes = ['id','sku','variant_id','name','cost','mrp','quantity','unit','tags','status'];
            const { rows: data, count: total } = await Product.findAndCountAll({ where, order, limit, offset, attributes });
            return {
                success: true,
                data,
                meta: { total, page, limit, pages: Math.ceil(total / limit) }
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    // Return distinct SKU groups (sku + name) for listing
    getSkuGroups: async ({ order = [['sku', 'ASC']] } = {}) => {
        try {
            const data = await Product.findAll({ attributes: ['sku', 'name'], group: ['sku', 'name'], order });
            return { success: true, data };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    // Return full product records for a given SKU (all variants)
    getProductsBySku: async (sku) => {
        try {
            if (!sku) return { success: false, message: 'sku is required' };
            const data = await Product.findAll({ where: { sku }, order: [['variant_id', 'ASC']] });
            return { success: true, data };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    getProductById: async (id) => {
        try {
            console.log('[ProductRepo] GET BY ID - Fetching product with id:', id);
            const product = await Product.findByPk(id);
            if (!product) {
                console.log('[ProductRepo] GET BY ID - Product not found');
                return { success: false, message: 'Product not found' };
            }
            console.log('[ProductRepo] GET BY ID - Product found:', product.id);
            return { success: true, data: product };
        } catch (error) {
            console.error('[ProductRepo] GET BY ID - Error:', error.message);
            return { success: false, message: error.message };
        }
    },

    // Find a product by its variant_id (string identifier)
    getProductByVariantId: async (variantId) => {
        try {
            if (!variantId) return { success: false, message: 'variantId is required' };
            console.log('[ProductRepo] GET BY VARIANT - Fetching product with variant_id:', variantId);
            const product = await Product.findOne({ where: { variant_id: variantId } });
            if (!product) {
                console.log('[ProductRepo] GET BY VARIANT - Product not found');
                return { success: false, message: 'Product not found' };
            }
            console.log('[ProductRepo] GET BY VARIANT - Product found:', product.id);
            return { success: true, data: product };
        } catch (error) {
            console.error('[ProductRepo] GET BY VARIANT - Error:', error.message);
            return { success: false, message: error.message };
        }
    },

    updateProduct: async (id, updateData) => {
        try {
            const product = await Product.findByPk(id);
            if (!product) return { success: false, message: 'Product not found' };
            await product.update(updateData);
            return { success: true, data: product, message: 'Product updated successfully' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    updateProductStatus: async (id, status) => {
        try {
            const product = await Product.findByPk(id);
            if (!product) return { success: false, message: 'Product not found' };
            await product.update({ status });
            return { success: true, data: product, message: 'Product status updated successfully' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    // Soft-delete: sets status='deleted' and lets paranoid handle deletedAt if needed
    deleteProduct: async (id, deletedBy = null) => {
        try {
            const product = await Product.findByPk(id);
            if (!product) return { success: false, message: 'Product not found' };
            await product.update({ status: 'deleted', deletedBy });
            await product.destroy(); // with paranoid:true it sets deletedAt
            return { success: true, message: 'Product soft-deleted successfully' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    // Hard delete for admin
    hardDeleteProduct: async (id) => {
        try {
            const product = await Product.findByPk(id, { paranoid: false });
            if (!product) return { success: false, message: 'Product not found' };
            await product.destroy({ force: true });
            return { success: true, message: 'Product permanently deleted' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    searchProducts: async ({ searchTerm = '', page = 1, limit = 20, order = [['createdAt', 'DESC']] } = {}) => {
        try {
            const offset = (page - 1) * limit;
            const where = {
                [Op.or]: [
                    { name: { [Op.iLike]: `%${searchTerm}%` } },
                    { description: { [Op.iLike]: `%${searchTerm}%` } }
                ]
            };
            const { rows: data, count: total } = await Product.findAndCountAll({
                where,
                limit,
                offset,
                order
            });
            return {
                success: true,
                data,
                meta: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
,

    /**
     * Clone an existing product (identified by sourceVariantId) into a new product record
     * with a new variant_id and optional overridden fields (for example different cost/mrp).
     *
     * Params:
     *  - sourceVariantId: string (existing product variant_id to clone)
     *  - newVariantId: string (new unique variant_id for cloned product)
     *  - overrides: object (fields to override on the cloned record, e.g., { cost: '123', mrp: '150' })
     *  - createdBy: integer|null (optional user id)
     */
    cloneProductWithPrice: async ({ sourceVariantId, newVariantId, overrides = {}, createdBy = null } = {}) => {
        const t = await sequelize.transaction();
        try {
            console.log('[ProductRepo] CLONE - source:', sourceVariantId, 'new:', newVariantId, 'overrides:', overrides);

            const source = await Product.findOne({ where: { variant_id: sourceVariantId }, transaction: t });
            if (!source) {
                await t.rollback();
                return { success: false, message: 'Source product not found' };
            }

            // If newVariantId not provided, generate next one according to scheme:
            // base = sku (sourceVariantId split on '*'), then sku*1, sku*2, ...
            if (!newVariantId) {
                const baseSku = String(sourceVariantId).split('*')[0];
                // find existing variant_ids that start with baseSku
                const candidates = await Product.findAll({
                    where: { variant_id: { [Op.iLike]: `${baseSku}%` } },
                    attributes: ['variant_id'],
                    transaction: t
                });

                // compute highest numeric suffix for pattern baseSku*<num>
                let maxNum = 0;
                const esc = baseSku.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const re = new RegExp(`^${esc}\*(\\d+)$`, 'i');
                for (const row of candidates) {
                    const vid = String(row.variant_id || '');
                    if (vid.toLowerCase() === baseSku.toLowerCase()) continue; // base exists
                    const m = vid.match(re);
                    if (m) {
                        const n = parseInt(m[1], 10);
                        if (!Number.isNaN(n) && n > maxNum) maxNum = n;
                    }
                }

                const nextNumber = maxNum + 1;
                newVariantId = `${baseSku}*${nextNumber}`;
            }

            // ensure new variant_id does not already exist
            // If it exists, auto-generate the next available suffix (baseSku*<n>)
            let attemptVariant = newVariantId;
            let attempt = 0;
            while (true) {
                const exists = await Product.findOne({ 
                    where: { variant_id: attemptVariant }, 
                    transaction: t 
                });
                if (!exists) {
                    // found a free variant id
                    newVariantId = attemptVariant;
                    break;
                }

                // derive baseSku from the attempted variant id (part before first '*')
                const baseSku = String(attemptVariant).split('*')[0];

                // fetch all candidates that start with baseSku in DESC order (per request)
                const candidates = await Product.findAll({
                    where: { variant_id: { [Op.iLike]: `${baseSku}%` } },
                    attributes: ['variant_id'],
                    order: [['variant_id', 'DESC']],
                    transaction: t
                });

                // compute highest numeric suffix for pattern baseSku*<num>
                let maxNum = 0;
                const esc = baseSku.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const re = new RegExp(`^${esc}\\*(\\d+)$`, 'i');
                
                for (const row of candidates) {
                    const vid = String(row.variant_id || '');
                    if (vid.toLowerCase() === baseSku.toLowerCase()) continue; // base exists without suffix
                    const m = vid.match(re);
                    if (m) {
                        const n = parseInt(m[1], 10);
                        if (!Number.isNaN(n) && n > maxNum) maxNum = n;
                    }
                }

                const nextNumber = maxNum + 1;
                attemptVariant = `${baseSku}*${nextNumber}`;
                attempt += 1;

                console.log(`[ProductRepo] CLONE - target ${String(newVariantId)} exists, auto-generating -> ${attemptVariant} (attempt ${attempt})`);

                // safety: avoid infinite loops - give up after reasonable attempts
                if (attempt > 50) {
                    await t.rollback();
                    return { success: false, message: 'Unable to generate unique variant_id after multiple attempts' };
                }
            }

            // copy source data, remove PK / timestamps
            const sourcePlain = source.get({ plain: true });
            const toCreate = { ...sourcePlain };
            delete toCreate.id;
            delete toCreate.createdAt;
            delete toCreate.updatedAt;
            delete toCreate.deletedAt;

            // set the new variant id and apply overrides
            toCreate.variant_id = newVariantId;
            Object.assign(toCreate, overrides);
            // compatibility: ensure `quantity` is present when cloning from older rows using `weight` or `qty`
            if (overrides.quantity === undefined) {
                if (toCreate.qty !== undefined && toCreate.qty !== null) toCreate.quantity = parseInt(toCreate.qty, 10);
                else if (toCreate.weight !== undefined && toCreate.weight !== null) toCreate.quantity = parseInt(toCreate.weight, 10);
            }
            if (createdBy !== null) toCreate.createdBy = createdBy;

            const newProduct = await Product.create(toCreate, { transaction: t });
            await t.commit();
            console.log('[ProductRepo] CLONE - created new product id:', newProduct.id, 'variant_id:', newProduct.variant_id);
            return { success: true, data: newProduct, message: 'Product cloned successfully' };
        } catch (error) {
            await t.rollback();
            console.error('[ProductRepo] CLONE - Error cloning product:', error.message);
            return { success: false, message: error.message };
        }
    }
};

export { ProductRepo };
