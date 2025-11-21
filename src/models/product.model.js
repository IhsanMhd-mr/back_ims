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
            type: DataTypes.STRING,
            allowNull: false,
        },
        mrp: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        date: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        weight: {
            type: DataTypes.INTEGER,
            allowNull: false,
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

