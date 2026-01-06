import express from 'express';
import InventoryTransactionController from '../controllers/inventory-transaction.controller.js';

const router = express.Router();

// Create a new inventory transaction (DRAFT)
router.post('/create', InventoryTransactionController.create);

// Get all transactions with filters
router.get('/getAll', InventoryTransactionController.getAll);

// Get pending transactions (DRAFT status)
router.get('/pending', InventoryTransactionController.getPending);

// Get specific transaction types (unapproved + created by user)
router.get('/type/grn', InventoryTransactionController.getGRN);
router.get('/type/customer-return', InventoryTransactionController.getCustomerReturns);
router.get('/type/vendor-return', InventoryTransactionController.getVendorReturns);
router.get('/type/wastage', InventoryTransactionController.getWastage);
router.get('/type/adjustment', InventoryTransactionController.getAdjustments);

// Get transaction by ID
router.get('/get/:id', InventoryTransactionController.getById);

// Get approval history for a transaction
router.get('/approval-history/:id', InventoryTransactionController.getApprovalHistory);

// View detailed approval history
router.get('/view-approval-history/:id', InventoryTransactionController.viewApprovalHistory);

// Approve transaction (creates stock records)
router.patch('/approve/:id', InventoryTransactionController.approve);

// Reject transaction
router.patch('/reject/:id', InventoryTransactionController.reject);

export default router;
