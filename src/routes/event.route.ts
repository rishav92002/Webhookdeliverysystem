import { Router } from "express";

import {createEventController} from "../controllers/event.controller.js"



const router = Router();


router.post('/create', createEventController)

export default router;
