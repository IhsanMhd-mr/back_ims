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
            isIn: [['material', 'product']]
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
    approver_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'active',
        validate: {
            isIn: [['active', 'inactive', 'deleted', 'pending']]
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

