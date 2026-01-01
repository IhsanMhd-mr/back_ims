import express from "express";
import VendorController from "../controllers/vendor.controller.js";

const router = express.Router();

router.post("/add", VendorController.create);
router.get("/checkUnique/:uniqueId", VendorController.checkUnique);
router.get("/getAll", VendorController.getAll);
router.get("/get/:id", VendorController.getById);
router.put("/put/:id", VendorController.update);
router.delete("/delete/:id", VendorController.delete);

export default router;
