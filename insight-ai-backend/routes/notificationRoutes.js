import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import Notification from "../models/Notification.js";

const router = express.Router();

// Get current user's notifications
router.get("/", requireAuth, async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json(notifications);
  } catch (error) {
    console.error("Notification fetch error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load notifications",
    });
  }
});

// Mark all current user's notifications as read
router.patch("/read", requireAuth, async (req, res) => {
  try {
    await Notification.updateMany(
      {
        userId: req.user._id,
        read: false,
      },
      {
        $set: { read: true },
      }
    );

    res.json({
      ok: true,
    });
  } catch (error) {
    console.error("Notification update error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update notifications",
    });
  }
});

export default router;