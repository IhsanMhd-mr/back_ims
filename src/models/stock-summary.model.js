import sequelize from '../config/db.js';
import { DataTypes } from 'sequelize';

export const StockMonthlySummary = sequelize.define(
  'StockMonthlySummary',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    // store date as DATEONLY pointing to the first day of month (YYYY-MM-DD)
    date: { type: DataTypes.DATEONLY, allowNull: false },
    item_type: { type: DataTypes.STRING, allowNull: false }, // 'MATERIAL' | 'PRODUCT'
    fk_id: { type: DataTypes.INTEGER, allowNull: false }, // material_id or product_id
    sku: { type: DataTypes.STRING, allowNull: true },
    variant_id: { type: DataTypes.STRING, allowNull: true },
    item_name: { type: DataTypes.TEXT, allowNull: true },

    opening_qty: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    in_qty: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    out_qty: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    closing_qty: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },

    opening_value: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
    in_value: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
    out_value: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
    closing_value: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },

    unit: { type: DataTypes.STRING, allowNull: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: true }
  },
  {
    tableName: 'stock_monthly_summaries',
    underscored: true,
    timestamps: true,
    paranoid: false
  }
);

export default StockMonthlySummary;
