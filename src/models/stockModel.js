import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const Stock = sequelize.define('Stock', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    price: {
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
        defaultValue: 'active' // active, inactive, deleted, pending, etc.
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
    tableName: 'stocks',
    timestamps: true,
    paranoid: true // enables soft-deletes via deletedAt
});

