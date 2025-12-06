import { Material } from '../models/mat.model.js';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';

const MaterialRepo = {
    createMaterialEntry: async (materialData) => {
        try {
            const newMaterial = await Material.create(materialData);
            return { success: true, data: newMaterial, message: 'Material created successfully' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    getMaterials: async ({ page = 1, limit = 20, filters = {}, order = [['createdAt', 'DESC']] } = {}) => {
        try {
            const offset = (page - 1) * limit;
            const where = { ...filters };
            const { rows: data, count: total } = await Material.findAndCountAll({
                where,
                order,
                limit,
                offset
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
    },

    getMaterialById: async (id) => {
        try {
            const material = await Material.findByPk(id);
            if (!material) return { success: false, message: 'Material not found' };
            return { success: true, data: material };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    updateMaterial: async (id, updateData) => {
        try {
            const material = await Material.findByPk(id);
            if (!material) return { success: false, message: 'Material not found' };
            await material.update(updateData);
            return { success: true, data: material, message: 'Material updated successfully' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    updateMaterialStatus: async (id, status) => {
        try {
            const material = await Material.findByPk(id);
            if (!material) return { success: false, message: 'Material not found' };
            await material.update({ status });
            return { success: true, data: material, message: 'Material status updated successfully' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    // Soft-delete: sets status='DELETED' and lets paranoid handle deletedAt if needed
    deleteMaterial: async (id, deletedBy = null) => {
        try {
            const material = await Material.findByPk(id);
            if (!material) return { success: false, message: 'Material not found' };
            await material.update({ status: 'DELETED', deletedBy });
            await material.destroy(); // with paranoid:true it sets deletedAt
            return { success: true, message: 'Material soft-deleted successfully' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    // Hard delete for admin
    hardDeleteMaterial: async (id) => {
        try {
            const material = await Material.findByPk(id, { paranoid: false });
            if (!material) return { success: false, message: 'Material not found' };
            await material.destroy({ force: true });
            return { success: true, message: 'Material permanently deleted' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    searchMaterials: async ({ searchTerm = '', page = 1, limit = 20, order = [['createdAt', 'DESC']] } = {}) => {
        try {
            const offset = (page - 1) * limit;
            const where = {
                [Op.or]: [
                    { name: { [Op.iLike]: `%${searchTerm}%` } },
                    { description: { [Op.iLike]: `%${searchTerm}%` } }
                ]
            };
            const { rows: data, count: total } = await Material.findAndCountAll({
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
    },

    // Return a lightweight material list with selected attributes for frontends
    getMaterialSummaries: async ({ page = 1, limit = 20, filters = {}, order = [['createdAt', 'DESC']] } = {}) => {
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
            const { rows: data, count: total } = await Material.findAndCountAll({ where, order, limit, offset, attributes });
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
    getMaterialSkuGroups: async ({ order = [['sku', 'ASC']] } = {}) => {
        try {
            const data = await Material.findAll({ attributes: ['sku', 'name'], group: ['sku', 'name'], order });
            return { success: true, data };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    // Return full material records for a given SKU (all variants)
    getMaterialsBySku: async (sku) => {
        try {
            if (!sku) return { success: false, message: 'sku is required' };
            const data = await Material.findAll({ where: { sku }, order: [['variant_id', 'ASC']] });
            return { success: true, data };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    // Find a material by its variant_id (string identifier)
    getMaterialByVariantId: async (variantId) => {
        try {
            if (!variantId) return { success: false, message: 'variantId is required' };
            console.log('[MaterialRepo] GET BY VARIANT - Fetching material with variant_id:', variantId);
            const material = await Material.findOne({ where: { variant_id: variantId } });
            if (!material) {
                console.log('[MaterialRepo] GET BY VARIANT - Material not found');
                return { success: false, message: 'Material not found' };
            }
            console.log('[MaterialRepo] GET BY VARIANT - Material found:', material.id);
            return { success: true, data: material };
        } catch (error) {
            console.error('[MaterialRepo] GET BY VARIANT - Error:', error.message);
            return { success: false, message: error.message };
        }
    },

    /**
     * Clone an existing material (identified by sourceVariantId) into a new material record
     * with a new variant_id and optional overridden fields (for example different cost/mrp).
     *
     * Params:
     *  - sourceVariantId: string (existing material variant_id to clone)
     *  - newVariantId: string (new unique variant_id for cloned material)
     *  - overrides: object (fields to override on the cloned record, e.g., { cost: '123', mrp: '150' })
     *  - createdBy: integer|null (optional user id)
     */
    cloneMaterialWithPrice: async ({ sourceVariantId, newVariantId, overrides = {}, createdBy = null } = {}) => {
        const t = await sequelize.transaction();
        try {
            console.log('[MaterialRepo] CLONE - source:', sourceVariantId, 'new:', newVariantId, 'overrides:', overrides);

            const source = await Material.findOne({ where: { variant_id: sourceVariantId }, transaction: t });
            if (!source) {
                await t.rollback();
                return { success: false, message: 'Source material not found' };
            }

            // If newVariantId not provided, generate next one according to scheme:
            // base = sku (sourceVariantId split on '*'), then sku*1, sku*2, ...
            if (!newVariantId) {
                const baseSku = String(sourceVariantId).split('*')[0];
                // find existing variant_ids that start with baseSku
                const candidates = await Material.findAll({
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
                const exists = await Material.findOne({ 
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
                const candidates = await Material.findAll({
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

                console.log(`[MaterialRepo] CLONE - target ${String(newVariantId)} exists, auto-generating -> ${attemptVariant} (attempt ${attempt})`);

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

            const newMaterial = await Material.create(toCreate, { transaction: t });
            await t.commit();
            console.log('[MaterialRepo] CLONE - created new material id:', newMaterial.id, 'variant_id:', newMaterial.variant_id);
            return { success: true, data: newMaterial, message: 'Material cloned successfully' };
        } catch (error) {
            await t.rollback();
            console.error('[MaterialRepo] CLONE - Error cloning material:', error.message);
            return { success: false, message: error.message };
        }
    }
};

export default MaterialRepo;