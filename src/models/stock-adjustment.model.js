import sequelize from '../config/db.js';
import { DataTypes } from 'sequelize';

export const StockAdjustment = sequelize.define(
  'StockAdjustment',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    stock_id: { type: DataTypes.INTEGER, allowNull: true },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    variant_id: { type: DataTypes.STRING, allowNull: true },
    qty: { type: DataTypes.DECIMAL(12,2), allowNull: false },
    note: { type: DataTypes.TEXT, allowNull: true },
    adjusted_by: { type: DataTypes.INTEGER, allowNull: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: true }
  },
  {
    tableName: 'stock_adjustments',
    underscored: true,
    timestamps: true,
    paranoid: false
  }
);

export default StockAdjustment;
