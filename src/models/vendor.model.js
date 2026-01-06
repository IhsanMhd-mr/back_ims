import sequelize from "../config/db.js";
import { DataTypes } from "sequelize";

export const Vendor = sequelize.define(
  "Vendor",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    unique_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    company_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    contact_no: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Full address of the vendor'
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'ACTIVE'
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    deletedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    }
  },
  {
    tableName: "vendor",
    underscored: true,
    timestamps: true,
    paranoid: true,
  }
);

export default Vendor;
