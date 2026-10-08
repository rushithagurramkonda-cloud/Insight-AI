import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/me", requireAuth, (req, res) => {
  const user = req.user.toObject();

  delete user.encryptedGithubToken;

  res.json({
    success: true,
    user,
  });
});

export default router;