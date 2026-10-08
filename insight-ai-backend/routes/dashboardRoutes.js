import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import Resume from "../models/Resume.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;

    const resumeCount = await Resume.countDocuments({ userId });

    const checklist = [
      {
        id: "profile",
        label: "Complete your profile",
        done: Boolean(req.user.name && req.user.githubUsername),
      },
      {
        id: "resume",
        label: "Upload your resume",
        done: resumeCount > 0,
      },
      {
        id: "github",
        label: "Connect GitHub",
        done: Boolean(req.user.githubId),
      },
      {
        id: "analysis",
        label: "Complete your first analysis",
        done: Boolean(req.user.checklist?.firstAnalysisCompleted),
      },
    ];

    const completedChecklist = checklist.filter((item) => item.done).length;

    const dashboard = {
      stats: {
        resumes: resumeCount,
        matches: 0,
        analyses: 0,
        comparisons: 0,
      },

      checklist,

      coverage: {
        score: 0,
        label: "Not analyzed yet",
      },

      github: {
        connected: Boolean(req.user.githubId),
        username: req.user.githubUsername || null,
        repositories: 0,
        technologies: [],
      },

      activity: [],

      priorityActions: [
        ...(resumeCount === 0
          ? [
              {
                id: "upload-resume",
                title: "Upload your resume",
                description: "Upload a PDF resume to start your analysis.",
                priority: "high",
                link: "/resumes",
              },
            ]
          : []),

        ...(!req.user.githubId
          ? [
              {
                id: "connect-github",
                title: "Connect GitHub",
                description: "Connect GitHub to analyze your technical portfolio.",
                priority: "medium",
                link: "/github",
              },
            ]
          : []),

        ...(completedChecklist === checklist.length
          ? []
          : [
              {
                id: "complete-checklist",
                title: "Complete your setup",
                description: `${completedChecklist} of ${checklist.length} setup steps completed.`,
                priority: "medium",
                link: "/dashboard",
              },
            ]),
      ],
    };

    res.json(dashboard);
  } catch (error) {
    console.error("Dashboard error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load dashboard",
    });
  }
});

export default router;