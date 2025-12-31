import { StockCurrentValue } from "../models/stockCurrentValue.model.js";
import { Product } from "../models/product.model.js";
import { Material } from "../models/mat.model.js";
import sequelize from "../config/db.js";

const StockCurrentRepo = {
    /**
     * Get all current stock values (optionally filter by item_type, sku, variant_id)
     */
    getAllCurrentValues: async (filters = {}) => {
        try {
            const where = {};
            if (filters.item_type) where.item_type = filters.item_type;
            if (filters.sku) where.sku = filters.sku;
            if (filters.variant_id) where.variant_id = filters.variant_id;
            const data = await StockCurrentValue.findAll({
                where, raw: true, attributes: {
                    exclude: [
                        'last_cost',
                        'createdAt',
                        'updatedAt'
                    ]
                }
            });
            return { success: true, data };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },
    create: async (data) => {
        try {
            let x_data = {}

            Object.assign(x_data, {
                item_type: data.item_type,
                fk_id: data.fk_id,
                sku: data.sku,
                variant_id: data.variant_id,
                item_name: data.item_name,
                current_quantity: data.current_quantity,
                unit: data.unit,
                last_movement_date: data.last_movement_date,
                last_cost: data.last_cost
            });


            const result = await StockCurrentValue.create(x_data);
            return { success: true, data: result, message: 'Stock current value created successfully.' };
        } catch (error) {
            console.error('Error in create StockCurrentValue:', error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Get all distinct products with their variants
     * Returns: { sku, variant_id, item_name, unit, fk_id }
     */
    getAllProductVariants: async () => {
        try {
            const products = await Product.findAll({
                attributes: ['id', 'sku', 'variant_id', 'name', 'unit'],
                where: { status: 'ACTIVE' },
                raw: true
            });

            // Format for consistency
            const formatted = products.map(p => ({
                item_type: 'PRODUCT',
                fk_id: p.id,
                sku: p.sku,
                variant_id: p.variant_id,
                item_name: p.name,
                unit: p.unit
            }));

            return { success: true, data: formatted };
        } catch (error) {
            console.error('Error in getAllProductVariants:', error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Get all distinct materials with their variants
     * Returns: { sku, variant_id, item_name, unit, fk_id }
     */
    getAllMaterialVariants: async () => {
        try {
            const materials = await Material.findAll({
                attributes: ['id', 'sku', 'variant_id', 'name', 'unit'],
                where: { status: 'ACTIVE' },
                raw: true
            });

            // Format for consistency
            const formatted = materials.map(m => ({
                item_type: 'MATERIAL',
                fk_id: m.id,
                sku: m.sku,
                variant_id: m.variant_id,
                item_name: m.name,
                unit: m.unit
            }));

            return { success: true, data: formatted };
        } catch (error) {
            console.error('Error in getAllMaterialVariants:', error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Get or create stock current value for an item
     */
    getStockCurrentValue: async ({ item_type, fk_id, sku, variant_id }) => {
        try {
            const existing = await StockCurrentValue.findOne({
                where: { item_type, fk_id },
                raw: true
            });

            return { success: true, data: existing };
        } catch (error) {
            console.error('Error in getStockCurrentValue:', error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Upsert (update or create) stock current value
     */
    upsertStockCurrentValue: async (data) => {
        try {
            const { item_type, fk_id } = data;

            // Try to find existing
            let existing = await StockCurrentValue.findOne({
                where: { item_type, fk_id }
            });

            if (existing) {
                // Update existing
                await existing.update(data);
                return {
                    success: true,
                    data: existing,
                    message: 'Stock current value updated successfully.'
                };
            } else {
                // Create new
                const created = await StockCurrentValue.create(data);
                return {
                    success: true,
                    data: created,
                    message: 'Stock current value created successfully.'
                };
            }
        } catch (error) {
            console.error('Error in upsertStockCurrentValue:', error);
            return { success: false, message: error.message };
        }
    }
}

export default StockCurrentRepo;
