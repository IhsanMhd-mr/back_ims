import { Material } from '../models/matModel.js';
import { Op } from 'sequelize';

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

    // Soft-delete: sets status='deleted' and lets paranoid handle deletedAt if needed
    deleteMaterial: async (id, deletedBy = null) => {
        try {
            const material = await Material.findByPk(id);
            if (!material) return { success: false, message: 'Material not found' };
            await material.update({ status: 'deleted', deletedBy });
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

    searchMaterials: async ({ searchTerm = '', page = 1, limit = 20 } = {}) => {
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
                order: [['createdAt', 'DESC']]
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
};

export default MaterialRepo;