import { ProductRepo } from '../repositories/product.repository.js';

const ProductService = {
    addProduct: async (productData) => {
        try {
            const result = await ProductRepo.createProductEntry(productData);
            return result;
        } catch (error) {
            console.error('Error in addProduct service:', error);
            return { success: false, message: error.message };
        }
    },

    getProducts: async (filters = {}) => {
        try {
            const result = await ProductRepo.getProducts(filters);
            return result;
        } catch (error) {
            console.error('Error in getProducts service:', error);
            return { success: false, message: error.message };
        }
    },

    getProductById: async (id) => {
        try {
            const result = await ProductRepo.getProductById(id);
            return result;
        } catch (error) {
            console.error('Error in getProductById service:', error);
            return { success: false, message: error.message };
        }
    },

    updateProduct: async (id, updateData) => {
        try {
            const result = await ProductRepo.updateProduct(id, updateData);
            return result;
        } catch (error) {
            console.error('Error in updateProduct service:', error);
            return { success: false, message: error.message };
        }
    },

    updateProductStatus: async (id, status) => {
        try {
            const result = await ProductRepo.updateProductStatus(id, status);
            return result;
        } catch (error) {
            console.error('Error in updateProductStatus service:', error);
            return { success: false, message: error.message };
        }
    },

    deleteProduct: async (id) => {
        try {
            const result = await ProductRepo.deleteProduct(id);
            return result;
        } catch (error) {
            console.error('Error in deleteProduct service:', error);
            return { success: false, message: error.message };
        }
    },

    searchProducts: async (searchTerm) => {
        try {
            const result = await ProductRepo.searchProducts(searchTerm);
            return result;
        } catch (error) {
            console.error('Error in searchProducts service:', error);
            return { success: false, message: error.message };
        }
    }
};

export default ProductService;