import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import JobDescription from "../models/JobDescription.js";

const router = express.Router();

const createBasicAnalysis = (job) => ({
  summary: {
    text: `This role is for a ${job.level || "professional"} ${job.title} position${
      job.company ? ` at ${job.company}` : ""
    }. The job description has been saved and is ready for detailed AI analysis.`,
  },

  skills: [],

  technologies: [],

  responsibilities: [],

  experience: [],

  qualifications: [],

  roadmap: [],
});

// GET /api/jobs
router.get("/", requireAuth, async (req, res) => {
  try {
    const jobs = await JobDescription.find({
      userId: req.user._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    const formattedJobs = jobs.map((job) => ({
      _id: job._id,
      name: job.name,
      title: job.title,
      company: job.company,
      level: job.level,
      date: job.createdAt
        ? new Date(job.createdAt).toISOString().slice(0, 10)
        : null,
      match: null,
    }));

    res.json(formattedJobs);
  } catch (error) {
    console.error("Jobs fetch error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load job descriptions",
    });
  }
});

// POST /api/jobs
router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      name,
      title,
      company,
      level,
      rawText,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Job title is required",
      });
    }

    if (!rawText || rawText.trim().length < 40) {
      return res.status(400).json({
        success: false,
        message: "Job description must contain at least 40 characters",
      });
    }

    const job = await JobDescription.create({
      userId: req.user._id,
      name: name?.trim() || title.trim(),
      title: title.trim(),
      company: company?.trim() || "",
      level: level?.trim() || "Senior",
      rawText: rawText.trim(),
    });

    job.analysis = createBasicAnalysis(job);
    await job.save();

    res.status(201).json({
      _id: job._id,
      name: job.name,
      title: job.title,
      company: job.company,
      level: job.level,
      date: job.createdAt
        ? new Date(job.createdAt).toISOString().slice(0, 10)
        : null,
      match: null,
      analysis: job.analysis,
    });
  } catch (error) {
    console.error("Job creation error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to save job description",
    });
  }
});

// GET /api/jobs/:id
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const job = await JobDescription.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).lean();

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job description not found",
      });
    }

    res.json({
      _id: job._id,
      name: job.name,
      title: job.title,
      company: job.company,
      level: job.level,
      date: job.createdAt
        ? new Date(job.createdAt).toISOString().slice(0, 10)
        : null,
      match: null,
      analysis: job.analysis || createBasicAnalysis(job),
    });
  } catch (error) {
    console.error("Job detail error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load job description",
    });
  }
});

// PATCH /api/jobs/:id
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const updates = {};

    if (req.body.name !== undefined) {
      updates.name = req.body.name.trim();
    }

    if (req.body.title !== undefined) {
      updates.title = req.body.title.trim();
    }

    if (req.body.company !== undefined) {
      updates.company = req.body.company.trim();
    }

    if (req.body.level !== undefined) {
      updates.level = req.body.level.trim();
    }

    const job = await JobDescription.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id,
      },
      {
        $set: updates,
      },
      {
        new: true,
      }
    ).lean();

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job description not found",
      });
    }

    res.json({
      ok: true,
      _id: job._id,
      name: job.name,
    });
  } catch (error) {
    console.error("Job update error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update job description",
    });
  }
});

// POST /api/jobs/:id/rerun
router.post("/:id/rerun", requireAuth, async (req, res) => {
  try {
    const job = await JobDescription.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job description not found",
      });
    }

    job.analysis = createBasicAnalysis(job);
    await job.save();

    res.json({
      ok: true,
      analysis: job.analysis,
    });
  } catch (error) {
    console.error("Job rerun error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to rerun job analysis",
    });
  }
});

// DELETE /api/jobs/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const job = await JobDescription.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job description not found",
      });
    }

    res.json({
      ok: true,
    });
  } catch (error) {
    console.error("Job deletion error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete job description",
    });
  }
});

export default router;