import sequelize from "../config/db.js"
import { DataTypes } from "sequelize";

export const Biller = sequelize.define(
  "Biller", 
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    date: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cost: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    discount: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    price: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    discount_perc: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    item_qty: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    contact_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    customer_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    seller_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    approver_id: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: true
    }
  },
  {
    tableName: "biller_records",
  underscored: true,
  timestamps: true
  }
);

