import { InventoryTransactionHistory } from '../models/inventory-transaction.model.js';
import sequelize from '../config/db.js';

const InventoryTransactionRepo = {
  // Create a new inventory transaction (DRAFT status)
  async create(data) {
    try {
      console.log('[InventoryTransactionRepo] ---------->>> :', data);
      const transaction = await InventoryTransactionHistory.create(data);
      return transaction;
    } catch (error) {
      console.error('[InventoryTransactionRepo] Create error:', error);
      throw error;
    }
  },

  // Get transaction by ID
  async getById(id) {
    try {
      const transaction = await InventoryTransactionHistory.findByPk(id);
      return transaction;
    } catch (error) {
      console.error('[InventoryTransactionRepo] GetById error:', error);
      throw error;
    }
  },

  // Get transaction by number
  async getByNumber(transactionNumber) {
    try {
      const transaction = await InventoryTransactionHistory.findOne({
        where: { transaction_number: transactionNumber },
      });
      return transaction;
    } catch (error) {
      console.error('[InventoryTransactionRepo] GetByNumber error:', error);
      throw error;
    }
  },

  // Get all transactions with optional filters
  async getAll(filters = {}) {
    try {
      const where = {};
      if (filters.transaction_type) where.transaction_type = filters.transaction_type;
      if (filters.status) where.status = filters.status;
      if (filters.created_by) where.created_by = filters.created_by;

      const transactions = await InventoryTransactionHistory.findAll({
        where,
        order: [['createdAt', 'DESC']],
      });
      return transactions;
    } catch (error) {
      console.error('[InventoryTransactionRepo] GetAll error:', error);
      throw error;
    }
  },

  // Get pending transactions (DRAFT status)
  async getPending() {
    try {
      const transactions = await InventoryTransactionHistory.findAll({
        where: { status: 'DRAFT' },
        order: [['createdAt', 'DESC']],
      });
      return transactions;
    } catch (error) {
      console.error('[InventoryTransactionRepo] GetPending error:', error);
      throw error;
    }
  },

  // Update transaction status
  async updateStatus(id, status, approverData = {}) {
    try {
      const updates = { status };
      if (status === 'APPROVED') {
        updates.approved_by = approverData.user_id;
        updates.approval_remarks = approverData.remarks;
      } else if (status === 'REJECTED') {
        updates.rejected_by = approverData.user_id;
        updates.approval_remarks = approverData.remarks;
      }

      const transaction = await InventoryTransactionHistory.update(updates, {
        where: { id },
        returning: true,
      });
      return transaction;
    } catch (error) {
      console.error('[InventoryTransactionRepo] UpdateStatus error:', error);
      throw error;
    }
  },

  // Update transaction
  async update(id, data) {
    try {
      const transaction = await InventoryTransactionHistory.update(data, {
        where: { id },
        returning: true,
      });
      return transaction;
    } catch (error) {
      console.error('[InventoryTransactionRepo] Update error:', error);
      throw error;
    }
  },

  // Delete transaction (hard delete)
  async delete(id) {
    try {
      const result = await InventoryTransactionHistory.destroy({
        where: { id },
        force: true,
      });
      return result;
    } catch (error) {
      console.error('[InventoryTransactionRepo] Delete error:', error);
      throw error;
    }
  },

  // Soft delete (paranoid)
  async softDelete(id, deletedBy) {
    try {
      const transaction = await InventoryTransactionHistory.destroy({
        where: { id },
      });
      return transaction;
    } catch (error) {
      console.error('[InventoryTransactionRepo] SoftDelete error:', error);
      throw error;
    }
  },
};

export default InventoryTransactionRepo;
