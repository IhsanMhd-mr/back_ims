import sequelize from "../config/db.js"
import { DataTypes } from "sequelize";

export const Product = sequelize.define(
    "Product", // Product stock
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        sku: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        variant_id: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        cost: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0
        },
        mrp: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        // Note: using `field: 'weight'` keeps compatibility with existing DB column name
        // until you run the migration to rename the column to `quantity`.
        quantity: {
            type: DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 0
        },
        unit: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        tags: {
            type: DataTypes.STRING,
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
    },
    {
        tableName: "product",
        underscored: true,
        timestamps: true,
        paranoid: true, // enables soft-deletes via deletedAt
        indexes: [
            {
                unique: true,
                fields: ["variant_id"]
            }
        ]
    }
);

