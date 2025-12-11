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

// Helper to refresh current value for a single item (item_type + fk_id)
const refreshCurrentValue = async (instanceOrInfo, options) => {
    try {
        // instanceOrInfo may be a model instance or a simple { item_type, fk_id }
        const itemType = instanceOrInfo.item_type || (instanceOrInfo instanceof Object && instanceOrInfo.item_type) || null;
        const fk = instanceOrInfo.fk_id || instanceOrInfo.fk || (instanceOrInfo instanceof Object && instanceOrInfo.fk_id) || null;
        if (!itemType || !fk) return;

        // compute net monetary value: sum(cost * qty) across active records
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
    } catch (err) {
        // don't throw inside hooks; just log
        try { console.error('[StockModel] refreshCurrentValue error:', err?.message || err); } catch (e) {}
    }
};

// Hook after single create/update/destroy to refresh the single item's current value
Stock.addHook('afterCreate', refreshCurrentValue);
Stock.addHook('afterUpdate', refreshCurrentValue);
Stock.addHook('afterDestroy', refreshCurrentValue);

// Bulk create hook: refresh for each unique item in the created set
Stock.addHook('afterBulkCreate', async (instances, options) => {
    try {
        if (!Array.isArray(instances) || instances.length === 0) return;
        const unique = new Map();
        instances.forEach(i => { if (i && i.item_type && i.fk_id) unique.set(`${i.item_type}::${i.fk_id}`, { item_type: i.item_type, fk_id: i.fk_id }); });
        for (const v of unique.values()) {
            await refreshCurrentValue(v);
        }
    } catch (err) {
        try { console.error('[StockModel] afterBulkCreate refresh error:', err?.message || err); } catch (e) {}
    }
});

