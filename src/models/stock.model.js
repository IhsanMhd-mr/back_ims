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
            isIn: [['PURCHASE','PRODUCTION', 'SALES', 'ADJUSTMENT', 'RETURN', 'OPENING_STOCK']]
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
            isIn: [['ACTIVE', 'INACTIVE', 'DELETED', 'PENDING']]
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

