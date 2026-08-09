import {Router} from "express";

import {createCustomerController, getCustomerController, updateCustomerController, deleteCustomerController, regenerateApiKeyController} from "../controllers/customer.controller.js";
import { authenticateCustomer } from "../middleware/auth.middleware.js";

const router = Router();

router.post('/', createCustomerController);
router.get('/', authenticateCustomer, getCustomerController);
router.patch('/', authenticateCustomer, updateCustomerController);
router.delete('/', authenticateCustomer, deleteCustomerController);
router.post('/api-key', authenticateCustomer, regenerateApiKeyController);
export default router;