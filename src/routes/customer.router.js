import express from "express";
const router = express.Router();
import CustomerController from "../controllers/customer.controller.js";

router.post("/add", CustomerController.create);
router.get("/checkUnique/:uniqueId", CustomerController.checkUnique);
router.get("/dropdown", CustomerController.getAllDropdown);  // Simplified list for dropdowns
router.get("/getAll", CustomerController.getAll);
router.get("/get/:id", CustomerController.getById);
router.put("/put/:id", CustomerController.update);
router.delete("/delete/:id", CustomerController.delete);

export default router;
