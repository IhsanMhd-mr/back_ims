import sequelize from "../config/db.js"
import { DataTypes } from "sequelize";

export const Material = sequelize.define(
    "Material", //Raw materials
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
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false
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
        tableName: "material",
        underscored: true,
        timestamps: true,
        paranoid: true // enables soft-deletes via deletedAt
    }
);

