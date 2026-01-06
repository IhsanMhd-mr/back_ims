import sequelize from '../config/db.js';
import { DataTypes } from 'sequelize';

export const InventoryTransactionHistory = sequelize.define(
  'InventoryTransactionHistory',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    transaction_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    transaction_type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['GRN', 'CUSTOMER_RETURN', 'VENDOR_RETURN', 'WASTAGE', 'ADJUSTMENT']],
      },
      comment: 'Type of inventory transaction',
    },
    transaction_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'DRAFT',
      validate: {
        isIn: [['DRAFT', 'APPROVED', 'REJECTED']],
      },
      comment: 'DRAFT: awaiting approval, APPROVED: stock records created, REJECTED: discarded',
    },
    // For GRN: vendor info
    vendor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    vendor_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // For returns
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    customer_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // General remarks/notes
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Why the transaction (reason for wastage, reason for adjustment, etc)
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Total items count in this transaction
    total_items: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    // JSON storage for transaction lines
    // Allows flexibility without creating separate table
    // Structure: [{ product_id, product_code, product_name, product_sku, variant_id, type, qty, unit, ... }]
    transaction_lines: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of line items from the transaction',
    },

    // Approval tracking
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    approved_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    rejected_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    approval_remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Remarks when approving or rejecting',
    },
  },
  {
    tableName: 'inventory_transaction_history',
    underscored: true,
    timestamps: true,
    paranoid: true, // soft delete
  }
);
