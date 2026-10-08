import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    githubId: {
      type: String,
      unique: true,
      sparse: true,
    },

    githubUsername: {
      type: String,
      trim: true,
    },

    name: {
      type: String,
      trim: true,
    },

    avatarUrl: {
      type: String,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    defaultResumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      default: null,
    },

    suspended: {
      type: Boolean,
      default: false,
    },

    encryptedGithubToken: {
      type: String,
      default: null,
    },

    tourCompleted: {
      type: Boolean,
      default: false,
    },

    checklist: {
      profileCompleted: {
        type: Boolean,
        default: false,
      },

      resumeUploaded: {
        type: Boolean,
        default: false,
      },

      githubConnected: {
        type: Boolean,
        default: false,
      },

      firstAnalysisCompleted: {
        type: Boolean,
        default: false,
      },
    },

    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;