import sequelize from "../config/db.js"
import { DataTypes } from "sequelize";

export const User = sequelize.define(
    "User",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        nic: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        first_name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        last_name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        contact_number: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        role: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "user" // possible values: 'admin', 'user'
        },
        admin_active: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true // true for activated, false for deactivated
        },
        user_active: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true // true for activated, false for deactivated
        },
        stripe_customer_id: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'ACTIVE' // ACTIVE, INACTIVE, DELETED, PENDING, etc.
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        updatedBy: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        deletedBy: {
            type: DataTypes.INTEGER,
            allowNull: true
        }

    },
    {
        tableName: "user",
        underscored: true,
        timestamps: true,
        paranoid: true // enables soft-deletes via deletedAt
    }
);

