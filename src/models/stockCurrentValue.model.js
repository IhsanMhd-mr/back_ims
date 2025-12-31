import sequelize from '../config/db.js';
import { DataTypes } from 'sequelize';

export const StockCurrentValue = sequelize.define(
  'StockCurrentValue',
  {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    item_type: { 
      type: DataTypes.STRING, 
      allowNull: false,
      validate: {
        isIn: [['MATERIAL', 'PRODUCT']]
      }
    },
    fk_id: { 
      type: DataTypes.INTEGER, 
      allowNull: false 
    },
    sku: { 
      type: DataTypes.STRING(255), 
      allowNull: true 
    },
    variant_id: { 
      type: DataTypes.STRING(255), 
      allowNull: true 
    },
    item_name: { 
      type: DataTypes.STRING(255), 
      allowNull: true 
    },
    current_quantity: { 
      type: DataTypes.DECIMAL(18, 2), 
      allowNull: false, 
      defaultValue: 0 
    },
    unit: { 
      type: DataTypes.STRING, 
      allowNull: true 
    },
    last_movement_date: { 
      type: DataTypes.DATEONLY, 
      allowNull: true 
    },
    last_cost: { 
      type: DataTypes.DECIMAL(12, 2), 
      allowNull: true 
    }
  },
  {
    tableName: 'stock_current_values',
    underscored: true,
    timestamps: true,
    paranoid: false,
    indexes: [
      { fields: ['sku'] },
      { fields: ['variant_id'] },
      { fields: ['item_type', 'fk_id'], unique: true }
    ]
  }
);

export default StockCurrentValue;
