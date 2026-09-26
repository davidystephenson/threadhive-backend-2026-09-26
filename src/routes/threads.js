import express from "express";
import {
  getAllThreads,
  getThreadByID,
  createThread,
  updateThread,
  deleteThread,
} from "../controllers/threadController.js";

import authHandler from "../middleware/authHandler.js";

const router = express.Router();

router.get("/", getAllThreads);
router.get("/:id", getThreadByID);
router.post("/", createThread);
router.put("/:id", updateThread);
router.delete("/:id", deleteThread);

export default router;
