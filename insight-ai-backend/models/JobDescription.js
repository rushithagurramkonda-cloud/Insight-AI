import mongoose from "mongoose";

const jobDescriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    company: {
      type: String,
      default: "",
      trim: true,
    },

    level: {
      type: String,
      default: "Senior",
      trim: true,
    },

    rawText: {
      type: String,
      required: true,
    },

    analysis: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const JobDescription = mongoose.model(
  "JobDescription",
  jobDescriptionSchema
);

export default JobDescription;