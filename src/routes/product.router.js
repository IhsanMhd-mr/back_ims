import express from 'express';
import ProductController from '../controllers/product.controller.js';

const router = express.Router();

router.post('/add', ProductController.create);
router.post('/clone', ProductController.cloneWithPrice);
router.get('/getAll', ProductController.getAll);
router.get('/list', ProductController.getSummaries);
router.get('/grouped_list', ProductController.listSkus);
router.get('/sku/:sku', ProductController.getSkuVariants);
router.get('/search', ProductController.search);
router.get('/variant/:variant_id', ProductController.getByVariantId);
router.get('/get/:id', ProductController.getById);
router.put('/put/:id', ProductController.update); // update updated by
router.patch('/status/:id/:params', ProductController.statusUpdate);//update status
router.patch('/remove/:id', ProductController.remove); //status delete deleted by
router.delete('/admin_delete/:id', ProductController.adminDelete); // normal delete

export default router;
