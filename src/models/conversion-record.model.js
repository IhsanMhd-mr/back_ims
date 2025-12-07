import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const ConversionRecord = sequelize.define(
  'ConversionRecord',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    conversion_ref: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      // Example: CONV-202501-001
    },
    template_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // null if manual conversion
    },
    template_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Snapshot of inputs used (JSON)
    inputs: {
      type: DataTypes.JSON,
      allowNull: false,
      // [{ sku, qty, unit, fk_id, item_type }, ...]
    },
    // Snapshot of outputs produced (JSON)
    outputs: {
      type: DataTypes.JSON,
      allowNull: false,
      // [{ sku, qty, unit, fk_id, item_type }, ...]
    },
    // Total cost of materials consumed
    total_input_cost: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'COMPLETED',
      validate: {
        isIn: [['PENDING', 'COMPLETED', 'REJECTED', 'ROLLED_BACK']],
      },
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    deleted_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: 'conversion_records',
    timestamps: true,
    paranoid: true,
  }
);

export default ConversionRecord;
