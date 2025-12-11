import sequelize from '../config/db.js';
import { DataTypes } from 'sequelize';

export const StockCurrentValue = sequelize.define(
  'StockCurrentValue',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    item_type: { type: DataTypes.STRING, allowNull: false },
    fk_id: { type: DataTypes.INTEGER, allowNull: false },
    current_value: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
    unit: { type: DataTypes.STRING, allowNull: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: true }
  },
  {
    tableName: 'stock_current_values',
    underscored: true,
    timestamps: true,
    paranoid: false,
    indexes: [
      { unique: true, fields: ['item_type', 'fk_id'] }
    ]
  }
);

export default StockCurrentValue;
