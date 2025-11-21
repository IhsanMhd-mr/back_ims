import MaterialRepo from '../repositories/matRepository.js';

const MaterialService = {
    // Maps to createMaterialEntry in repo
    addMaterial: async (materialData) => {
        try {
            const result = await MaterialRepo.createMaterialEntry(materialData);
            return {
                success: result.success,
                data: result.data,
                message: result.message
            };
        } catch (error) {
            console.error('Error in addMaterial service:', error);
            return { success: false, message: error.message };
        }
    },

    // Maps to getMaterials in repo
    getMaterials: async (filters = {}) => {
        try {
            const result = await MaterialRepo.getMaterials(filters);
            return {
                success: result.success,
                data: result.data,
                message: result.message
            };
        } catch (error) {
            console.error('Error in getMaterials service:', error);
            return { success: false, message: error.message };
        }
    },

    // Maps to getMaterialById in repo
    getMaterialById: async (id) => {
        try {
            const result = await MaterialRepo.getMaterialById(id);
            return {
                success: result.success,
                data: result.data,
                message: result.message
            };
        } catch (error) {
            console.error('Error in getMaterialById service:', error);
            return { success: false, message: error.message };
        }
    },

    // Maps to updateMaterial in repo
    updateMaterial: async (id, updateData) => {
        try {
            const result = await MaterialRepo.updateMaterial(id, updateData);
            return {
                success: result.success,
                data: result.data,
                message: result.message
            };
        } catch (error) {
            console.error('Error in updateMaterial service:', error);
            return { success: false, message: error.message };
        }
    },

    // Maps to deleteMaterial in repo
    deleteMaterial: async (id) => {
        try {
            const result = await MaterialRepo.deleteMaterial(id);
            return {
                success: result.success,
                message: result.message
            };
        } catch (error) {
            console.error('Error in deleteMaterial service:', error);
            return { success: false, message: error.message };
        }
    },

    // Maps to searchMaterials in repo
    searchMaterials: async (searchTerm) => {
        try {
            if (!searchTerm) {
                return { success: false, message: 'Search term is required' };
            }
            const result = await MaterialRepo.searchMaterials(searchTerm);
            return {
                success: result.success,
                data: result.data
            };
        } catch (error) {
            console.error('Error in searchMaterials service:', error);
            return { success: false, message: error.message };
        }
    }
};

export default MaterialService;