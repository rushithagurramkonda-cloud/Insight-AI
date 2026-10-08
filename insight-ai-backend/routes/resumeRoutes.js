import express from "express";
import fs from "fs";

import Resume from "../models/Resume.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import {
  extractResumeText,
  deleteResumeFile,
} from "../services/resumeService.js";
import { analyzeResumeWithGemini } from "../services/geminiService.js";

const router = express.Router();

router.post(
  "/",
  requireAuth,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Please upload a PDF resume",
        });
      }

      // Step 1: Extract text from the uploaded PDF
      const extractedText = await extractResumeText(req.file.path);

      if (!extractedText || !extractedText.trim()) {
        deleteResumeFile(req.file.path);

        return res.status(400).json({
          success: false,
          message:
            "Could not extract readable text from this PDF. Please upload a PDF with selectable text.",
        });
      }

      // Step 2: Generate AI analysis using Gemini
      const analysis = await analyzeResumeWithGemini(extractedText);

      // Step 3: Create a new resume version
      const existingResumeCount = await Resume.countDocuments({
        userId: req.user._id,
      });

      const versionLabel =
        req.body.label?.trim() || `Version ${existingResumeCount + 1}`;

      // Step 4: Save resume + extracted text + AI analysis
      const resume = await Resume.create({
        userId: req.user._id,
        versionLabel,
        fileName: req.file.originalname,
        filePath: req.file.path,
        extractedText,
        analysis,
      });

      // Step 5: Set first uploaded resume as default
      if (!req.user.defaultResumeId) {
        await User.findByIdAndUpdate(req.user._id, {
          defaultResumeId: resume._id,
          "checklist.resumeUploaded": true,
          "checklist.firstAnalysisCompleted": true,
        });
      } else {
        await User.findByIdAndUpdate(req.user._id, {
          "checklist.resumeUploaded": true,
          "checklist.firstAnalysisCompleted": true,
        });
      }

      res.status(201).json({
        success: true,
        message: "Resume analyzed and saved successfully",
        resume: {
          _id: resume._id,
          id: resume._id,
          label: resume.versionLabel,
          versionLabel: resume.versionLabel,
          fileName: resume.fileName,
          createdAt: resume.createdAt,
          extractedTextLength: extractedText.length,
          analysis,
        },
      });
    } catch (error) {
      console.error("Resume upload/analysis error:", error);

      // Delete the uploaded file if anything failed
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        message: "Failed to analyze resume",
        error: error.message,
      });
    }
  }
);

router.get("/", requireAuth, async (req, res) => {
  try {
    const resumes = await Resume.find({
      userId: req.user._id,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: resumes.length,
      resumes,
    });
  } catch (error) {
    console.error("Resume list error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch resumes",
      error: error.message,
    });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found",
      });
    }

    res.json({
      success: true,
      resume,
    });
  } catch (error) {
    console.error("Resume detail error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch resume",
      error: error.message,
    });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found",
      });
    }

    deleteResumeFile(resume.filePath);

    await Resume.findByIdAndDelete(resume._id);

    if (req.user.defaultResumeId?.toString() === resume._id.toString()) {
      const replacement = await Resume.findOne({
        userId: req.user._id,
      }).sort({ createdAt: -1 });

      await User.findByIdAndUpdate(req.user._id, {
        defaultResumeId: replacement ? replacement._id : null,
      });
    }

    res.json({
      success: true,
      message: "Resume deleted successfully",
    });
  } catch (error) {
    console.error("Resume delete error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete resume",
      error: error.message,
    });
  }
});

export default router;