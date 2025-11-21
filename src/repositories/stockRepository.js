import { Stock } from '../models/stockModel.js';
import { Op } from 'sequelize';

const StockRepo = {
    createStockEntry: async (stockData) => {
        try {
            const newStock = await Stock.create(stockData);
            return { success: true, data: newStock, message: 'Stock created successfully' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    getStocks: async ({ page = 1, limit = 20, filters = {}, order = [['createdAt', 'DESC']] } = {}) => {
        try {
            const offset = (page - 1) * limit;
            const where = { ...filters };
            // Ignore soft-deleted records by default (paranoid true). If caller passes status filter, keep it.
            const { rows: data, count: total } = await Stock.findAndCountAll({
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

    getStockById: async (id) => {
        try {
            const stock = await Stock.findByPk(id);
            if (!stock) return { success: false, message: 'Stock not found' };
            return { success: true, data: stock };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    updateStock: async (id, updateData) => {
        try {
            const stock = await Stock.findByPk(id);
            if (!stock) return { success: false, message: 'Stock not found' };

            // Prevent changing product_id accidentally unless explicitly provided
            if (!Object.prototype.hasOwnProperty.call(updateData, 'product_id')) {
                updateData.product_id = stock.product_id;
            }

            // Merge fields but preserve existing values when falsy values are not intended to override
            const allowedFields = ['description', 'price', 'date', 'qty', 'unit', 'tags', 'approver_id', 'product_id', 'updatedBy'];
            allowedFields.forEach(field => {
                if (updateData[field] === undefined) {
                    updateData[field] = stock[field];
                }
            });

            // Validate numeric fields
            if (updateData.qty != null && isNaN(Number(updateData.qty))) {
                return { success: false, message: 'Invalid qty value' };
            }
            if (updateData.price != null && isNaN(Number(updateData.price))) {
                return { success: false, message: 'Invalid price value' };
            }

            await stock.update(updateData);
            return { success: true, data: stock, message: 'Stock updated successfully' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    updateStockStatus: async (id, status) => {
        try {
            const stock = await Stock.findByPk(id);
            if (!stock) return { success: false, message: 'Stock not found' };
            await stock.update({ status });
            return { success: true, data: stock, message: 'Stock status updated successfully' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    // Soft-delete: sets status='deleted' and lets paranoid handle deletedAt if needed
    deleteStock: async (id, deletedBy = null) => {
        try {
            const stock = await Stock.findByPk(id);
            if (!stock) return { success: false, message: 'Stock not found' };
            await stock.update({ status: 'deleted', deletedBy });
            await stock.destroy(); // with paranoid:true it sets deletedAt
            return { success: true, message: 'Stock soft-deleted successfully' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    // Hard delete for admin
    hardDeleteStock: async (id) => {
        try {
            const stock = await Stock.findByPk(id, { paranoid: false });
            if (!stock) return { success: false, message: 'Stock not found' };
            await stock.destroy({ force: true });
            return { success: true, message: 'Stock permanently deleted' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    searchStocks: async ({ searchTerm = '', page = 1, limit = 20 } = {}) => {
        try {
            const offset = (page - 1) * limit;
            const where = {
                [Op.or]: [
                    { description: { [Op.iLike]: `%${searchTerm}%` } },
                    // include other searchable fields if exist
                ]
            };
            const { rows: data, count: total } = await Stock.findAndCountAll({
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

export default StockRepo;