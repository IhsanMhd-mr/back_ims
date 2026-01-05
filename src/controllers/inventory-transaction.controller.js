import { InventoryTransactionHistory } from '../models/inventory-transaction.model.js';
import InventoryTransactionRepo from '../repositories/inventory-transaction.repository.js';
import StockRepo from '../repositories/stock.repository.js';
import { ProductRepo } from '../repositories/product.repository.js';
import MaterialRepo from '../repositories/mat.repository.js';
import sequelize from '../config/db.js';

const InventoryTransactionController = {
  // Create a new inventory transaction (DRAFT status)
  // Body: { transaction_type, transaction_date, vendor_id, customer_id, lines[], remarks, reason, created_by }
  create: async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const {
        transaction_type,
        transaction_date,
        transaction_number,
        vendor_id,
        vendor_name,
        customer_id,
        customer_name,
        lines = [],
        remarks,
        reason,
        created_by,
      } = req.body;

      // Validation
      if (!transaction_type) {
        return res.status(400).json({
          success: false,
          message: 'transaction_type is required',
        });
      }

      if (!['GRN', 'CUSTOMER_RETURN', 'VENDOR_RETURN', 'WASTAGE', 'ADJUSTMENT'].includes(transaction_type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid transaction_type',
        });
      }

      if (!Array.isArray(lines) || lines.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'lines array is required and cannot be empty',
        });
      }

      // Create transaction
      const transactionData = {
        transaction_number: transaction_number || `${transaction_type}-${Date.now()}`,
        transaction_type,
        transaction_date: transaction_date || new Date(),
        status: 'DRAFT',
        vendor_id,
        vendor_name,
        customer_id,
        customer_name,
        remarks,
        reason,
        transaction_lines: lines,
        total_items: lines.length,
        created_by,
      };

      const newTransaction = await InventoryTransactionRepo.create(transactionData);

      await t.commit();
      return res.status(201).json({
        success: true,
        message: 'Inventory transaction created successfully',
        data: newTransaction,
      });
    } catch (error) {
      await t.rollback();
      console.error('[InventoryTransactionController] Create error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to create transaction',
      });
    }
  },

  // Get transaction by ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const transaction = await InventoryTransactionRepo.getById(id);

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      console.error('[InventoryTransactionController] GetById error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch transaction',
      });
    }
  },

  // Get all transactions
  getAll: async (req, res) => {
    try {
      const { transaction_type, status, created_by } = req.query;
      const filters = {};
      if (transaction_type) filters.transaction_type = transaction_type;
      if (status) filters.status = status;
      if (created_by) filters.created_by = created_by;

      const transactions = await InventoryTransactionRepo.getAll(filters);

      return res.status(200).json({
        success: true,
        data: transactions,
      });
    } catch (error) {
      console.error('[InventoryTransactionController] GetAll error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch transactions',
      });
    }
  },

  // Get pending transactions
  getPending: async (req, res) => {
    try {
      const transactions = await InventoryTransactionRepo.getPending();

      return res.status(200).json({
        success: true,
        data: transactions,
      });
    } catch (error) {
      console.error('[InventoryTransactionController] GetPending error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch pending transactions',
      });
    }
  },

  // Approve transaction - creates stock records
  approve: async (req, res) => {
    const t = await sequelize.transaction();

    try {
      const { id } = req.params;
      const { approved_by, approval_remarks } = req.body;

      // ─────────────────────────────────────────────
      // 1. Fetch transaction (LOCKED)
      // ─────────────────────────────────────────────
      const transaction = await InventoryTransactionRepo.getById(id, {
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!transaction) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'Transaction not found',
        });
      }

      if (transaction.status !== 'DRAFT') {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: `Cannot approve transaction with status: ${transaction.status}`,
        });
      }

      const lines = Array.isArray(transaction.transaction_lines)
        ? transaction.transaction_lines
        : [];

      if (lines.length === 0) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'No transaction lines to process',
        });
      }

      // ─────────────────────────────────────────────
      // 2. Transaction type config
      // ─────────────────────────────────────────────
      const typeConfig = {
        GRN: { source: 'PURCHASE', movement: 'IN' },
        CUSTOMER_RETURN: { source: 'CUSTOMER_RETURN', movement: 'IN' },
        VENDOR_RETURN: { source: 'VENDOR_RETURN', movement: 'OUT' },
        WASTAGE: { source: 'ADJUSTMENT', movement: 'OUT' },
        ADJUSTMENT: { source: 'ADJUSTMENT', movement: null },
      };

      const config = typeConfig[transaction.transaction_type];
      if (!config) {
        throw new Error(`Unsupported transaction type: ${transaction.transaction_type}`);
      }

      // ─────────────────────────────────────────────
      // 3. Build stock entries
      // ─────────────────────────────────────────────
      const stockEntries = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        let productId =
          Number(line.product_id) ||
          Number(line.fk_id) ||
          null;

        // Fallback: look up by code if ID is missing
        if (!productId && line.product_code) {
          // Determine if it's a product or material based on code prefix or line.type
          const isProduct = !line.product_code.startsWith('MAT');
          
          if (isProduct) {
            // Try product lookup
            const productResult = await ProductRepo.getByCode(line.product_code);
            if (productResult?.success && productResult.data) {
              productId = productResult.data.id;
            }
          } else {
            // Try material lookup
            const materialResult = await MaterialRepo.getByCode(line.product_code);
            if (materialResult?.success && materialResult.data) {
              productId = materialResult.data.id;
            }
          }
        }

        if (!productId) {
          throw new Error(`Invalid product/material reference at line ${i + 1}: ${line.product_code}`);
        }

        // Determine movement (adjustment logic)
        let movement = config.movement;
        let qty = Number(line.qty || 0);

        if (transaction.transaction_type === 'ADJUSTMENT') {
          const variance =
            Number(line.adjusted_qty || 0) -
            Number(line.current_qty || 0);

          if (variance === 0) continue; // no stock impact

          movement = variance > 0 ? 'IN' : 'OUT';
          qty = Math.abs(variance);
        }

        if (qty <= 0) {
          throw new Error(`Invalid quantity at line ${i + 1}`);
        }

        stockEntries.push({
          item_type: line.type || 'PRODUCT',
          fk_id: productId,
          sku: line.product_code || line.product_sku,
          variant_id: line.variant_id || null,
          item_name: line.product_name,
          batch_number: line.batch_number || transaction.transaction_number,
          description: transaction.remarks || approval_remarks,
          cost: Number(line.purchase_cost || 0),
          date: transaction.transaction_date,
          qty,
          unit: line.unit,
          movement_type: movement,
          source: config.source,
          approver_id: approved_by,
          status: 'ACTIVE',
          createdBy: transaction.created_by,
        });
      }

      if (!stockEntries.length) {
        throw new Error('No valid stock movements generated');
      }

      // ─────────────────────────────────────────────
      // 4. Persist stock
      // ─────────────────────────────────────────────
      const stockResult = await StockRepo.bulkCreateStockEntries(
        stockEntries,
        { transaction: t }
      );

      if (!stockResult?.success) {
        throw new Error(stockResult?.message || 'Stock creation failed');
      }

      // ─────────────────────────────────────────────
      // 5. Update transaction status
      // ─────────────────────────────────────────────
      await InventoryTransactionRepo.updateStatus(
        id,
        'APPROVED',
        {
          user_id: approved_by,
          remarks: approval_remarks,
        },
        { transaction: t }
      );

      await t.commit();

      return res.status(200).json({
        success: true,
        message: 'Transaction approved and stock updated',
        data: {
          transaction_id: id,
          stock_records_created: stockEntries.length,
        },
      });

    } catch (error) {
      await t.rollback();
      console.error('[InventoryTransactionController] Approve error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to approve transaction',
      });
    }
  },

  // Reject transaction
  reject: async (req, res) => {
    try {
      const { id } = req.params;
      const { rejected_by, approval_remarks } = req.body;

      const transaction = await InventoryTransactionRepo.getById(id);
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found',
        });
      }

      if (transaction.status !== 'DRAFT') {
        return res.status(400).json({
          success: false,
          message: `Cannot reject transaction with status: ${transaction.status}`,
        });
      }

      // Update status to REJECTED
      await InventoryTransactionRepo.updateStatus(id, 'REJECTED', {
        user_id: rejected_by,
        remarks: approval_remarks,
      });

      return res.status(200).json({
        success: true,
        message: 'Transaction rejected',
        data: { transaction_id: id },
      });
    } catch (error) {
      console.error('[InventoryTransactionController] Reject error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to reject transaction',
      });
    }
  },
};

export default InventoryTransactionController;
