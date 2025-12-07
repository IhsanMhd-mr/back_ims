import express from 'express';
import MaterialController from '../controllers/mat.controller.js';

const router = express.Router();

router.post('/add', MaterialController.create);
router.post('/clone', MaterialController.cloneWithPrice);
router.get('/getAll', MaterialController.getAll);
router.get('/list', MaterialController.getSummaries);
router.get('/grouped_list', MaterialController.listSkus);
router.get('/sku/:sku', MaterialController.getSkuVariants);
router.get('/search', MaterialController.search);
router.get('/variant/:variant_id', MaterialController.getByVariantId);
router.get('/get/:id', MaterialController.getById);
router.put('/put/:id', MaterialController.update); // update updated by
router.patch('/status/:id/:params', MaterialController.statusUpdate);//update status
router.patch('/remove/:id', MaterialController.remove); //status delete deleted by
router.delete('/admin_delete/:id', MaterialController.adminDelete); // normal delete

export default router;