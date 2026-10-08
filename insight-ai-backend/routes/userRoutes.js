import express from "express";
import User from "../models/User.js";

const router = express.Router();

router.post("/test", async (req, res) => {
  try {
    const user = await User.create({
      githubId: "test-user-001",
      githubUsername: "testuser",
      name: "Test User",
    });

    res.status(201).json({
      success: true,
      message: "Test user created successfully",
      user,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to create test user",
      error: error.message,
    });
  }
});

router.get("/test", async (req, res) => {
  try {
    const users = await User.find();

    res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
});

export default router;