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
            isIn: [['PURCHASE','PRODUCTION', 'SALES', 'ADJUSTMENT', 'RETURN', 'OPENING_STOCK', 'CONVERSION']]
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

// Utility function to refresh current value for a single item (item_type + fk_id)
export const refreshCurrentValue = async (instanceOrInfo) => {
    try {
        // instanceOrInfo may be a model instance or a simple { item_type, fk_id }
        const itemType = instanceOrInfo.item_type || (instanceOrInfo instanceof Object && instanceOrInfo.item_type) || null;
        const fk = instanceOrInfo.fk_id || instanceOrInfo.fk || (instanceOrInfo instanceof Object && instanceOrInfo.fk_id) || null;
        if (!itemType || !fk) {
            console.warn('[refreshCurrentValue] Missing item_type or fk_id');
            return;
        }

        // Compute net monetary value: sum(cost * qty) across active records
        const sql = `SELECT COALESCE(SUM((COALESCE(cost,0) * COALESCE(qty,0))),0) AS current_value
            FROM stock_records s
            WHERE s.status = 'ACTIVE' AND s.item_type = :itemType AND s.fk_id = :fk`;
        const rows = await sequelize.query(sql, { replacements: { itemType, fk }, type: sequelize.QueryTypes.SELECT });
        const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : (rows || {});
        const currentValue = Number((row && (row.current_value !== undefined ? row.current_value : 0)) || 0);

        // Upsert into stock_current_values using Postgres ON CONFLICT (item_type, fk_id)
        const upsertSql = `INSERT INTO stock_current_values (item_type, fk_id, current_value, updated_at, created_at)
            VALUES (:itemType, :fk, :cv, now(), now())
            ON CONFLICT (item_type, fk_id) DO UPDATE SET current_value = EXCLUDED.current_value, updated_at = now()`;
        await sequelize.query(upsertSql, { replacements: { itemType, fk, cv: currentValue } });
        
        return currentValue;
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

