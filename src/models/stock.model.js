import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const Stock = sequelize.define('Stock', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    item_type: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isIn: [['MATERIAL', 'PRODUCT']]
        }
    },
    fk_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    sku: {
        type: DataTypes.STRING,
        allowNull: false
    },
    variant_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    item_name: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    batch_number: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: false // Allow duplicates; batch_number is for grouping, not unique constraint
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    cost: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    qty: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0
    },
    unit: {
        type: DataTypes.STRING,
        allowNull: true
    },
    tags: {
        type: DataTypes.STRING,
        allowNull: true
    },
    movement_type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'IN',
        validate: {
            isIn: [['IN', 'OUT']]
        },
        comment: 'Tracks whether stock is incoming or outgoing'
    },
    source: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'ADJUSTMENT',
        validate: {
            isIn: [['PURCHASE','PRODUCTION', 'SALES', 'ADJUSTMENT', 'RETURN', 'CUSTOMER_RETURN', 'VENDOR_RETURN', 'OPENING_STOCK', 'CONVERSION']]
        },
        comment: 'Identifies the source/reason for the stock movement'
    },
    approver_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'ACTIVE',
        validate: {
            isIn: [['ACTIVE', 'INACTIVE', 'PENDING', 'COMPLETED','REJECTED', 'DELETED']]
        }
    },
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    updatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    deletedBy: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'stock_records',
    timestamps: true,
    paranoid: true // enables soft-deletes via deletedAt
});

// Utility function to refresh current quantity for a single item (item_type + fk_id)
// This maintains a running total of quantities, making calculations simpler for various future needs
export const refreshCurrentValue = async (instanceOrInfo) => {
    try {
        // instanceOrInfo may be a model instance or a simple { item_type, fk_id }
        const itemType = instanceOrInfo.item_type || (instanceOrInfo instanceof Object && instanceOrInfo.item_type) || null;
        const fk = instanceOrInfo.fk_id || instanceOrInfo.fk || (instanceOrInfo instanceof Object && instanceOrInfo.fk_id) || null;
        if (!itemType || !fk) {
            console.warn('[refreshCurrentValue] Missing item_type or fk_id');
            return;
        }

        // Calculate net quantity: SUM(qty) for IN movements minus SUM(qty) for OUT movements
        // Only include ACTIVE records to respect soft-deletes and status changes
        const sql = `
            SELECT 
                COALESCE(SUM(CASE WHEN movement_type = 'IN' THEN qty ELSE -qty END), 0) AS current_quantity,
                MAX(sku) AS sku,
                MAX(variant_id) AS variant_id,
                MAX(item_name) AS item_name,
                MAX(unit) AS unit,
                MAX(date) AS last_movement_date,
                (SELECT cost FROM stock_records WHERE item_type = :itemType AND fk_id = :fk AND status = 'ACTIVE' ORDER BY date DESC, id DESC LIMIT 1) AS last_cost
            FROM stock_records
            WHERE status = 'ACTIVE' AND item_type = :itemType AND fk_id = :fk
        `;
        const rows = await sequelize.query(sql, { replacements: { itemType, fk }, type: sequelize.QueryTypes.SELECT });
        const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : {};
        
        const currentQuantity = Number(row.current_quantity || 0);
        const sku = row.sku || null;
        const variantId = row.variant_id || null;
        const itemName = row.item_name || null;
        const unit = row.unit || null;
        const lastMovementDate = row.last_movement_date || null;
        const lastCost = row.last_cost || null;

        // Upsert into stock_current_values using Postgres ON CONFLICT (item_type, fk_id)
        const upsertSql = `
            INSERT INTO stock_current_values 
                (item_type, fk_id, sku, variant_id, item_name, current_quantity, unit, last_movement_date, last_cost, updated_at, created_at)
            VALUES 
                (:itemType, :fk, :sku, :variantId, :itemName, :qty, :unit, :lastDate, :lastCost, now(), now())
            ON CONFLICT (item_type, fk_id) 
            DO UPDATE SET 
                sku = EXCLUDED.sku,
                variant_id = EXCLUDED.variant_id,
                item_name = EXCLUDED.item_name,
                current_quantity = EXCLUDED.current_quantity, 
                unit = EXCLUDED.unit,
                last_movement_date = EXCLUDED.last_movement_date,
                last_cost = EXCLUDED.last_cost,
                updated_at = now()
        `;
        await sequelize.query(upsertSql, { 
            replacements: { 
                itemType, 
                fk, 
                sku, 
                variantId,
                itemName, 
                qty: currentQuantity, 
                unit, 
                lastDate: lastMovementDate,
                lastCost 
            } 
        });
        
        console.log(`[refreshCurrentValue] Updated ${itemType}:${fk} → ${currentQuantity} ${unit || ''}`);
        return { item_type: itemType, fk_id: fk, current_quantity: currentQuantity, unit, sku, item_name: itemName };
    } catch (err) {
        console.error('[refreshCurrentValue] Error:', err?.message || err);
        throw err;
    }
};

// Utility function to refresh current values for multiple items
export const refreshCurrentValueBulk = async (instances) => {
    try {
        if (!Array.isArray(instances) || instances.length === 0) {
            console.warn('[refreshCurrentValueBulk] No instances provided');
            return;
        }
        
        // Extract unique item_type + fk_id combinations
        const unique = new Map();
        instances.forEach(i => { 
            if (i && i.item_type && i.fk_id) {
                unique.set(`${i.item_type}::${i.fk_id}`, { item_type: i.item_type, fk_id: i.fk_id }); 
            }
        });
        
        // Refresh each unique item
        const results = [];
        for (const v of unique.values()) {
            const value = await refreshCurrentValue(v);
            results.push({ item_type: v.item_type, fk_id: v.fk_id, current_value: value });
        }
        
        return results;
    } catch (err) {
        console.error('[refreshCurrentValueBulk] Error:', err?.message || err);
        throw err;
    }
};

