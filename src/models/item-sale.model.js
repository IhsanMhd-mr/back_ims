import sequelize from "../config/db.js"
import { DataTypes } from "sequelize";

// Item model represents a sale line (an item included in a bill/invoice).
// Kept the original table name `sale_records` to remain compatible with existing code.
// Improved types: use numeric types for amounts and date for date fields.
export const Item = sequelize.define(
    "Item",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        // store the transaction date/time
        date: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        // monetary fields: prefer DECIMAL(12,2) or store as integer cents if you prefer
        cost: {
            type: DataTypes.DECIMAL(12,2),
            allowNull: false,
        },
        mrp: {
            type: DataTypes.DECIMAL(12,2),
            allowNull: false,
        },
        // weight can be fractional (kg etc.) so use decimal
        weight: {
            type: DataTypes.DECIMAL(10,3),
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
        // FK to biller_records.id
        biller_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        }
    },
    {
        tableName: "sale_records",
        underscored: true,
        timestamps: true
    }
);

// Optional association helper. If your project sets up associations centrally, this is safe to keep.
Item.associate = (models) => {
    if (models.Biller) {
        Item.belongsTo(models.Biller, { foreignKey: 'biller_id', as: 'biller' });
    }
};

