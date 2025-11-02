/**
 * Main.js Handler Validation Schemas
 *
 * Zod schemas for all IPC handlers defined in main.js.
 */

const { z } = require('zod');
const {
  apiKeySchema,
  uuidSchema,
  fileNameSchema,
  filePathSchema,
  timestampSchema,
  transcriptModelSchema,
  urlSchema,
  arrayBufferSchema,
  webmArrayBufferSchema
} = require('./index');

/**
 * validate-api-key Handler Schema
 * Input: API key string
 */
const validateApiKeySchema = z.object({
  apiKey: apiKeySchema
});

/**
 * save-api-key-secure Handler Schema
 * Input: API key string
 */
const saveApiKeySchema = z.object({
  apiKey: apiKeySchema
});

/**
 * save-templates Handler Schema
 * Input: Array of template objects
 */
const templateSchema = z.object({
  id: uuidSchema,

  name: z.string()
    .min(1, 'Template name required')
    .max(100, 'Template name too long (max 100 chars)')
    .refine(val => !/<script/i.test(val), 'Script tags not allowed'),

  prompt: z.string()
    .min(1, 'Template prompt required')
    .max(5000, 'Template prompt too long (max 5000 chars)')
    .refine(val => !/<script/i.test(val), 'Script tags not allowed'),

  category: z.string()
    .max(50, 'Category too long (max 50 chars)')
    .optional(),

  createdAt: timestampSchema,

  updatedAt: timestampSchema
});

const saveTemplatesSchema = z.object({
  templates: z.array(templateSchema)
    .max(100, 'Too many templates (max 100)')
});

/**
 * save-file-to-temp Handler Schema
 * Input: ArrayBuffer + filename
 */
const saveFileToTempSchema = z.object({
  arrayBuffer: arrayBufferSchema(1, 500 * 1024 * 1024), // 1 byte to 500MB

  fileName: fileNameSchema
});

/**
 * navigate Handler Schema
 * Input: Page name
 */
const navigateSchema = z.object({
  page: z.string()
    .min(1, 'Page name required')
    .max(50, 'Page name too long (max 50 chars)')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Page name must be alphanumeric with dashes/underscores only')
    .refine(val => !val.includes('../'), 'Path traversal not allowed')
    .refine(val => !val.includes('..\\'), 'Path traversal not allowed')
});

/**
 * save-recording Handler Schema
 * Input: ArrayBuffer (WebM format)
 */
const saveRecordingSchema = z.object({
  arrayBuffer: webmArrayBufferSchema
});

/**
 * transcribe-audio Handler Schema
 * Input: File path, API key, options object
 */
const speakerSchema = z.object({
  name: z.string()
    .min(1, 'Speaker name required')
    .max(100, 'Speaker name too long (max 100 chars)'),

  path: z.string()
    .min(1, 'Speaker reference path required')
    .max(1000, 'Speaker reference path too long')
});

const transcribeAudioSchema = z.object({
  filePath: filePathSchema,

  apiKey: apiKeySchema,

  options: z.object({
    model: transcriptModelSchema.default('gpt-4o-transcribe'),

    prompt: z.string()
      .optional()
      .nullable(),

    speakers: z.array(speakerSchema)
      .optional()
      .nullable(),

    speedMultiplier: z.number()
      .min(1.0, 'Speed multiplier must be >= 1.0')
      .max(3.0, 'Speed multiplier must be <= 3.0')
      .default(1.0)
      .optional(),

    useCompression: z.boolean()
      .default(false)
      .optional()
  }).optional()
});

/**
 * generate-summary Handler Schema
 * Input: Transcript text, template prompt, API key
 */
const generateSummarySchema = z.object({
  transcript: z.string()
    .min(1, 'Transcript required')
    .refine(val => !/<script/i.test(val), 'Script tags not allowed'),

  templatePrompt: z.string()
    .min(1, 'Template prompt required')
    .refine(val => !/<script/i.test(val), 'Script tags not allowed'),

  apiKey: apiKeySchema
});

/**
 * open-external Handler Schema
 * Input: URL string
 */
const openExternalSchema = z.object({
  url: urlSchema
});

/**
 * save-transcript Handler Schema
 * Input: Content string, format enum, filename
 */
const saveTranscriptSchema = z.object({
  content: z.string()
    .min(1, 'Content required'),

  format: z.enum(['txt', 'vtt', 'md', 'pdf'], {
    errorMap: () => ({ message: 'Format must be txt, vtt, md, or pdf' })
  }).default('txt'),

  fileName: fileNameSchema
});

module.exports = {
  validateApiKeySchema,
  saveApiKeySchema,
  templateSchema,
  saveTemplatesSchema,
  saveFileToTempSchema,
  navigateSchema,
  saveRecordingSchema,
  speakerSchema,
  transcribeAudioSchema,
  generateSummarySchema,
  openExternalSchema,
  saveTranscriptSchema
};
