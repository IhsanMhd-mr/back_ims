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
        mat_id: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        price: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        date: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        qty: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        unit: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        approver_id: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: true
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
        tableName: "material",
        underscored: true,
        timestamps: true,
        paranoid: true // enables soft-deletes via deletedAt
    }
);

