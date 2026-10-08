import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const resumeAnalysisSchema = {
  type: "object",
  properties: {
    scores: {
      type: "object",
      properties: {
        resume: {
          type: "number",
          description: "Overall resume quality score from 0 to 100.",
        },
        ats: {
          type: "number",
          description: "ATS readability and compatibility score from 0 to 100.",
        },
      },
      required: ["resume", "ats"],
    },

    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
          },
          score: {
            type: "number",
            description: "Section score from 0 to 100.",
          },
          label: {
            type: "string",
          },
        },
        required: ["name", "score", "label"],
      },
    },

    summary: {
      type: "object",
      properties: {
        text: {
          type: "string",
        },
        facts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              k: {
                type: "string",
              },
              v: {
                type: "string",
              },
            },
            required: ["k", "v"],
          },
        },
      },
      required: ["text", "facts"],
    },

    skills: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: {
            type: "string",
          },
          items: {
            type: "array",
            items: {
              type: "string",
            },
          },
        },
        required: ["category", "items"],
      },
    },

    experience: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
          },
          org: {
            type: "string",
          },
          tone: {
            type: "string",
            enum: ["green", "amber", "red", "slate"],
          },
          tag: {
            type: "string",
          },
          text: {
            type: "string",
          },
          suggestion: {
            type: "string",
          },
        },
        required: ["title", "org", "tone", "tag", "text", "suggestion"],
      },
    },

    strengths: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
          },
          text: {
            type: "string",
          },
        },
        required: ["title", "text"],
      },
    },

    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
          },
          priority: {
            type: "string",
            enum: ["High", "Medium", "Low"],
          },
          text: {
            type: "string",
          },
        },
        required: ["title", "priority", "text"],
      },
    },
  },

  required: [
    "scores",
    "sections",
    "summary",
    "skills",
    "experience",
    "strengths",
    "suggestions",
  ],
};

export const analyzeResumeWithGemini = async (resumeText) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  if (!resumeText || !resumeText.trim()) {
    throw new Error("No readable text was extracted from the resume");
  }

  const prompt = `
You are an expert resume reviewer and ATS optimization specialist.

Analyze the following resume carefully.

Your analysis must be based ONLY on information actually present in the resume.
Do not invent employers, projects, skills, technologies, degrees, dates, achievements, or experience.

Evaluate:
- Overall resume quality
- ATS compatibility
- Resume sections
- Executive summary
- Skills
- Work experience and projects
- Strengths
- Improvements and recommendations

Scoring:
- resume score: 0-100
- ATS score: 0-100
- section scores: 0-100

For section labels, use concise labels such as:
Excellent, Good, Fair, Needs improvement.

For experience:
- title should identify the role/project/experience
- org should identify the company, organization, or project context
- tag should briefly describe the assessment
- tone must be one of: green, amber, red, slate
- suggestion should contain a practical improvement when appropriate
- if no improvement is needed, use an empty string

For summary facts, provide useful facts extracted from the resume such as:
- Experience
- Education
- Primary role
- Key specialization
- Projects
- Technologies

For skills, categorize the actual skills found in the resume.

For suggestions:
- Give practical, specific recommendations.
- Do not recommend adding a skill unless the resume provides evidence that the person already has it or it is clearly framed as a skill to learn.
- priority must be High, Medium, or Low.

Return only the requested structured JSON.

RESUME TEXT:
----------------
${resumeText}
----------------
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: resumeAnalysisSchema,
      temperature: 0.2,
    },
  });

  const text = response.text;

  if (!text) {
    throw new Error("Gemini returned an empty analysis");
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini JSON parsing error:", error);
    console.error("Gemini response:", text);
    throw new Error("Gemini returned invalid analysis data");
  }
};