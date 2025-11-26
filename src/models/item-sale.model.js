import sequelize from "../config/db.js";
import { DataTypes } from "sequelize";

export const ItemSale = sequelize.define(
    "ItemSale",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        bill_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        product_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        product_name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        sku: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        variant_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
        },
        unit_price: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
        },
        subtotal: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
        },
        // Per-item discount percentage (0-100)
        discount_percent: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            defaultValue: 0,
        },
        // (removed) per-item flat discount amount - using percentage only
    },
    {
        tableName: "item_sales",
        underscored: true,
        timestamps: true,
    }
);

// Provide an associate helper; associations will be initialized by `src/models/associations.js`.
ItemSale.associate = (models) => {
    if (models.Bill) {
        ItemSale.belongsTo(models.Bill, { foreignKey: "bill_id", as: "bill" });
    }
};

