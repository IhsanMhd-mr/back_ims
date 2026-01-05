import express from 'express';
import InventoryTransactionController from '../controllers/inventory-transaction.controller.js';

const router = express.Router();

// Create a new inventory transaction (DRAFT)
router.post('/create', InventoryTransactionController.create);

// Get all transactions with filters
router.get('/getAll', InventoryTransactionController.getAll);

// Get pending transactions (DRAFT status)
router.get('/pending', InventoryTransactionController.getPending);

// Get transaction by ID
router.get('/get/:id', InventoryTransactionController.getById);

// Approve transaction (creates stock records)
router.patch('/approve/:id', InventoryTransactionController.approve);

// Reject transaction
router.patch('/reject/:id', InventoryTransactionController.reject);

export default router;
