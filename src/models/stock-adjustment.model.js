import sequelize from '../config/db.js';
import { DataTypes } from 'sequelize';

export const StockAdjustment = sequelize.define(
  'StockAdjustment',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    stock_id: { type: DataTypes.INTEGER, allowNull: true },
    // item reference: keep both product_id for compatibility and fk_id as generic
    product_id: { type: DataTypes.INTEGER, allowNull: true },
    fk_id: { type: DataTypes.INTEGER, allowNull: true },
    item_type: { type: DataTypes.STRING, allowNull: true }, // 'PRODUCT' | 'MATERIAL'
    sku: { type: DataTypes.STRING, allowNull: true },
    variant_id: { type: DataTypes.STRING, allowNull: true },
    item_name: { type: DataTypes.TEXT, allowNull: true },
    batch_number: { type: DataTypes.STRING, allowNull: true },

    qty: { type: DataTypes.DECIMAL(14,2), allowNull: false, defaultValue: 0 },
    unit: { type: DataTypes.STRING, allowNull: true },
    cost: { type: DataTypes.DECIMAL(18,2), allowNull: true, defaultValue: 0 },

    movement_type: { type: DataTypes.STRING, allowNull: false, defaultValue: 'IN' },
    source: { type: DataTypes.STRING, allowNull: true },

    note: { type: DataTypes.TEXT, allowNull: true },
    // keep legacy adjusted_by column, add approver_id to match Stock model semantics
    adjusted_by: { type: DataTypes.INTEGER, allowNull: true },
    approver_id: { type: DataTypes.INTEGER, allowNull: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: true },
    tags: { type: DataTypes.STRING, allowNull: true }
  },
  {
    tableName: 'stock_adjustments',
    underscored: true,
    timestamps: true,
    paranoid: false
  }
);

export default StockAdjustment;
