import sequelize from '../config/db.js';
import { DataTypes } from 'sequelize';

export const StockMonthlySummary = sequelize.define(
  'StockMonthlySummary',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    year: { type: DataTypes.INTEGER, allowNull: false },
    month: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    total_qty: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
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
