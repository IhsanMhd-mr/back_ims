import bcrypt from "bcrypt";
import { User } from "../models/user.model.js"
import { ItemSale } from "../models/item-sale.model.js"
import { Bill } from "../models/bill.model.js"
import sequelize from "../config/db.js"
import { Op } from 'sequelize';

const UserRepo = {
  getUserx: async (userId) => { // to create tables only
    try {
      const result1 = await ItemSale.findAll({});
      const result2 = await Bill.findAll({});
      return { result1, result2 };
    } catch (error) {
      throw error;
    }
  },

  registerUser: async (email, password, firstName, lastName, contactNumber, role) => {
    try {
      const result = await User.create({
        email: email,
        password: password,
        first_name: firstName,
        last_name: lastName,
        contact_number: contactNumber,
        role: role
      });
      return !!result; // Returning boolean indicating success or failure
    } catch (error) {
      throw error;
    }
  },

  getUserById: async (userId) => {
    try {
      const result = await User.findOne({
        where: {
          id: userId,
        },
      });
      return result;
    } catch (error) {
      throw error;
    }
  },

  getUserByEmail: async (email) => {
    try {
      const result = await User.findOne({
        where: { email: email },
      });
      return result;
    } catch (error) {
      throw error;
    }
  },

  getUsers: async ({ page = 1, limit = 20, filters = {}, order = [['createdAt', 'DESC']] } = {}) => {
    try {
      const offset = (page - 1) * limit;
      const where = { ...filters };
      const { rows: data, count: total } = await User.findAndCountAll({
        where,
        order,
        limit,
        offset
      });
      return {
        success: true,
        data,
        meta: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  updateUser: async (id, updateData) => {
    try {
      const user = await User.findByPk(id);
      if (!user) return { success: false, message: 'User not found' };
      await user.update(updateData);
      return { success: true, data: user, message: 'User updated successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  updateUserStatus: async (id, status) => {
    try {
      const user = await User.findByPk(id);
      if (!user) return { success: false, message: 'User not found' };
      await user.update({ status });
      return { success: true, data: user, message: 'User status updated successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  // Soft-delete: sets status='deleted' and lets paranoid handle deletedAt if needed
  deleteUser: async (id, deletedBy = null) => {
    try {
      const user = await User.findByPk(id);
      if (!user) return { success: false, message: 'User not found' };
      await user.update({ status: 'deleted', deletedBy });
      await user.destroy(); // with paranoid:true it sets deletedAt
      return { success: true, message: 'User soft-deleted successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  // Hard delete for admin
  hardDeleteUser: async (id) => {
    try {
      const user = await User.findByPk(id, { paranoid: false });
      if (!user) return { success: false, message: 'User not found' };
      await user.destroy({ force: true });
      return { success: true, message: 'User permanently deleted' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },
}


export default UserRepo;
