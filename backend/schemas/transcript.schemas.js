/**
 * Transcript Handler Validation Schemas
 *
 * Zod schemas for all transcript-related IPC handlers.
 */

const { z } = require('zod');
const {
  uuidSchema,
  transcriptIdSchema,
  fileNameSchema,
  timestampSchema,
  transcriptModelSchema,
  tagsArraySchema,
  apiKeySchema
} = require('./index');

/**
 * Full Transcript Object Schema
 * Used in: save-transcripts
 */
const transcriptSchema = z.object({
  id: transcriptIdSchema,

  fileName: fileNameSchema,

  rawTranscript: z.string(),

  vttTranscript: z.string()
    .optional(),

  summary: z.string()
    .optional(),

  summaryTemplate: z.string()
    .max(500, 'Summary template name too long (max 500 chars)')
    .optional(),

  model: transcriptModelSchema,

  duration: z.number()
    .min(0, 'Duration must be non-negative')
    .max(86400, 'Duration too long (max 24 hours = 86400 seconds)'),

  timestamp: timestampSchema,

  isDiarized: z.boolean(),

  fileSize: z.number()
    .positive('File size must be positive')
    .max(2000, 'File size too large (max 2000 MB)'),

  starred: z.boolean()
    .default(false),

  tags: tagsArraySchema,

  tokens: z.number()
    .int()
    .min(0),

  createdAt: timestampSchema,

  updatedAt: timestampSchema,

  // Optional fields for vector store integration
  vectorStoreFileId: z.string()
    .max(200, 'Vector store file ID too long')
    .optional(),

  uploadedToVectorStore: z.boolean()
    .optional()
});

/**
 * save-transcripts Handler Schema
 * Input: Array of transcript objects
 */
const saveTranscriptsSchema = z.object({
  transcripts: z.array(transcriptSchema)
    .max(1000, 'Too many transcripts (max 1000)')
});

/**
 * save-transcript-to-analysis Handler Schema
 * Input: Transcript data from recording tab
 */
const saveTranscriptToAnalysisSchema = z.object({
  text: z.string()
    .min(1, 'Transcript text required'),

  transcript: z.string(),

  fileName: fileNameSchema,

  duration: z.number()
    .min(0, 'Duration must be non-negative')
    .max(86400, 'Duration too long (max 24 hours)'),

  model: transcriptModelSchema,

  isDiarized: z.boolean()
    .default(false),

  summary: z.string()
    .max(50000, 'Summary too long (max 50KB)')
    .optional(),

  summaryTemplate: z.string()
    .max(500)
    .optional(),

  chunked: z.boolean()
    .optional(),

  totalChunks: z.number()
    .int()
    .min(0)
    .optional(),

  warning: z.string()
    .optional(),

  failedChunks: z.array(z.object({
    index: z.number().int(),
    duration: z.number(),
    error: z.string()
  }))
    .optional()
});

/**
 * delete-transcript Handler Schema
 * Input: Transcript ID
 */
const deleteTranscriptSchema = z.object({
  transcriptId: transcriptIdSchema
});

/**
 * toggle-star-transcript Handler Schema
 * Input: Transcript ID
 */
const toggleStarSchema = z.object({
  transcriptId: transcriptIdSchema
});

/**
 * update-transcript Handler Schema
 * Input: Transcript ID + partial updates
 */
const updateTranscriptSchema = z.object({
  transcriptId: transcriptIdSchema,

  updates: z.object({
    fileName: fileNameSchema.optional(),

    rawTranscript: z.string()
      .optional(),

    vttTranscript: z.string()
      .optional(),

    summary: z.string()
      .optional(),

    summaryTemplate: z.string()
      .optional(),

    starred: z.boolean()
      .optional(),

    tags: tagsArraySchema.optional()
  })
    .refine(obj => Object.keys(obj).length > 0, 'At least one field required for update')
});

/**
 * generate-transcript-name Handler Schema
 * Input: Transcript text + API key
 */
const generateTranscriptNameSchema = z.object({
  transcriptText: z.string()
    .min(1, 'Transcript text required')
    .refine(val => !/<script/i.test(val), 'Script tags not allowed'),

  apiKey: apiKeySchema
});

/**
 * bulk-upload-transcripts Handler Schema
 * Input: Options object
 */
const bulkUploadSchema = z.object({
  options: z.object({
    force: z.boolean()
      .optional()
      .default(false),

    maxConcurrency: z.number()
      .int()
      .min(1, 'Concurrency must be at least 1')
      .max(10, 'Concurrency too high (max 10 concurrent uploads)')
      .optional()
      .default(5),

    batchSize: z.number()
      .int()
      .min(1)
      .max(100, 'Batch size too large (max 100)')
      .optional()
  }).optional().default({})
});

module.exports = {
  transcriptSchema,
  saveTranscriptsSchema,
  saveTranscriptToAnalysisSchema,
  deleteTranscriptSchema,
  toggleStarSchema,
  updateTranscriptSchema,
  generateTranscriptNameSchema,
  bulkUploadSchema
};
