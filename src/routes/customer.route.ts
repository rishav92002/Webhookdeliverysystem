import {Router} from "express";

import {createCustomerController} from "../controllers/customer.controller.js";

const router = Router();

router.post('/create', createCustomerController);

export default router;