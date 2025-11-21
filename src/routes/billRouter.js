import express from 'express';
import BillController from '../controllers/billController.js';

const router = express.Router();

router.post('/add', BillController.create);
router.get('/getAll', BillController.getAll);
router.get('/get/:id', BillController.getById);
router.put('/put/:id', BillController.update);
router.delete('/admin_delete/:id', BillController.delete);

export default router;
