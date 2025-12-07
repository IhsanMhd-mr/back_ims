import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const ConversionTemplate = sequelize.define(
  'ConversionTemplate',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    template_name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // JSON format: { inputs: [...], outputs: [...] }
    template_data: {
      type: DataTypes.JSON,
      allowNull: false,
      validate: {
        isValidTemplate(value) {
          if (!value || typeof value !== 'object') {
            throw new Error('template_data must be a valid JSON object');
          }
          if (!Array.isArray(value.inputs) || !Array.isArray(value.outputs)) {
            throw new Error('template_data must contain inputs and outputs arrays');
          }
          if (value.inputs.length === 0 || value.outputs.length === 0) {
            throw new Error('template_data must contain at least one input and one output');
          }
        },
      },
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'ACTIVE',
      validate: {
        isIn: [['ACTIVE', 'INACTIVE', 'ARCHIVED']],
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
    tableName: 'conversion_templates',
    timestamps: true,
    paranoid: true, // enables soft-deletes via deletedAt
  }
);

export default ConversionTemplate;
