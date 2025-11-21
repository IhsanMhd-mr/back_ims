import express from "express";
const router = express.Router();
import UserController from "../controllers/userController.js";
import upload from "../config/configMulter.js";
// import authentication from "../middleware/userAuthentication.js";
// import {adminAuth} from "../middleware/adminAuth.js";


router.post("/register", UserController.registerUser);
router.post("/login", UserController.userLogin);
// router.patch("/updateUserAccess/:id",UserController.updateUserAccess)
// router.put("/changePassword/id", authentication.authenticateToken,UserController.changeUserPassword)

router.get("/getAllUsers", UserController.getAllUsersForUser);
router.get("/getUser/:id", UserController.getUserById);
router.put("/put/:id", UserController.update); // update updated by
router.patch("/status/:id/:params", UserController.statusUpdate);//update status
router.patch("/remove/:id", UserController.remove); //status delete deleted by
router.delete("/admin_delete/:id", UserController.adminDelete); // normal delete

export default router;