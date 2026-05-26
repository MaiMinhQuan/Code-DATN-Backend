/**
 * JSON Schema cho vLLM structured_outputs — đồng bộ với ielts_grading_schema.py (repo root).
 */
export const IELTS_GRADING_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    tr_band: { type: "number" },
    cc_band: { type: "number" },
    lr_band: { type: "number" },
    gra_band: { type: "number" },
    overall_band: { type: "number" },
    coaching_analysis: { type: "string" },
    errors: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          originalText: { type: "string" },
          explanation: { type: "string" },
          suggestion: { type: "string" },
          category: {
            type: "string",
            enum: [
              "GRAMMAR",
              "VOCABULARY",
              "COHERENCE",
              "TASK_RESPONSE",
              "SPELLING",
              "PUNCTUATION",
            ],
          },
          severity: {
            type: "string",
            enum: ["low", "medium", "high"],
          },
        },
        required: [
          "originalText",
          "explanation",
          "suggestion",
          "category",
          "severity",
        ],
      },
    },
  },
  required: [
    "tr_band",
    "cc_band",
    "lr_band",
    "gra_band",
    "overall_band",
    "coaching_analysis",
    "errors",
  ],
};
