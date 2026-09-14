import { Router } from "express";
import {
  createEndpoint,
  getEndpoints,
  getEndpointById,
  updateEndpoint,
  deleteEndpoint,
} from "../controllers/endpoint.controller.js";

const router = Router();

router.post("/", createEndpoint);
router.get("/", getEndpoints);
router.get("/:id", getEndpointById);
router.patch("/:id", updateEndpoint);
router.delete("/:id", deleteEndpoint);

export default router;
