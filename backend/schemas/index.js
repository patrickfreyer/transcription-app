/**
 * Shared Validation Schemas
 *
 * Common Zod schemas used across multiple IPC handlers.
 * Ensures consistency and reduces code duplication.
 */

const { z } = require('zod');

/**
 * OpenAI API Key Schema
 * Used in: validate-api-key, save-api-key-secure, transcribe-audio, generate-summary, etc.
 */
const apiKeySchema = z.string()
  .min(20, 'API key too short (min 20 chars)')
  .max(500, 'API key too long (max 500 chars)')
  .regex(/^sk-[A-Za-z0-9\-_]+$/, 'Invalid API key format (must start with sk-)')
  .refine(val => !val.includes('\0'), 'Null bytes not allowed')
  .refine(val => !val.includes('<'), 'HTML tags not allowed');

/**
 * UUID Schema (for strict UUID validation)
 * Used in: template IDs, etc.
 */
const uuidSchema = z.string()
  .uuid('Must be valid UUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)');

/**
 * Transcript ID Schema
 * Accepts both custom format (transcript-{timestamp}-{random}) and UUIDs
 * Used in: transcript IDs, context IDs
 */
const transcriptIdSchema = z.string()
  .min(1, 'Transcript ID required')
  .max(100, 'Transcript ID too long')
  .refine(
    val => {
      // Accept format: transcript-{timestamp}-{random}
      const customFormat = /^transcript-\d+-[a-z0-9]+$/i.test(val);
      // Accept UUID format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
      const uuidFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
      return customFormat || uuidFormat;
    },
    'Must be valid transcript ID (format: transcript-{timestamp}-{random} or UUID)'
  )
  .refine(val => !val.includes('\0'), 'Null bytes not allowed')
  .refine(val => !/<script/i.test(val), 'Script tags not allowed');

/**
 * Filename Schema
 * Used in: save-file-to-temp, save-transcript, transcript objects, etc.
 */
const fileNameSchema = z.string()
  .min(1, 'Filename required')
  .max(255, 'Filename too long (max 255 chars)')
  .refine(val => !val.includes('../'), 'Path traversal not allowed (../ detected)')
  .refine(val => !val.includes('..\\'), 'Path traversal not allowed (..\\ detected)')
  .refine(val => !val.includes('\0'), 'Null bytes not allowed')
  .refine(val => !/[<>:"|?*]/.test(val), 'Invalid filename characters (<>:"|?*)')
  .refine(val => !/<script/i.test(val), 'Script tags not allowed');

/**
 * File Path Schema (more permissive than filename, allows directory separators)
 * Used in: transcribe-audio, file operations
 */
const filePathSchema = z.string()
  .min(1, 'File path required')
  .max(1000, 'File path too long (max 1000 chars)')
  .refine(val => !val.includes('\0'), 'Null bytes not allowed')
  .refine(val => !val.includes(';'), 'Shell metacharacter ; not allowed')
  .refine(val => !val.includes('|'), 'Shell metacharacter | not allowed')
  .refine(val => !val.includes('&'), 'Shell metacharacter & not allowed')
  .refine(val => !val.includes('$'), 'Shell metacharacter $ not allowed')
  .refine(val => !val.includes('`'), 'Shell metacharacter ` not allowed');

/**
 * Timestamp Schema (Unix timestamp in milliseconds)
 * Used in: transcripts, chat messages, templates, etc.
 */
const timestampSchema = z.number()
  .int('Timestamp must be integer')
  .positive('Timestamp must be positive')
  .refine(val => val <= Date.now() + 86400000, 'Timestamp cannot be more than 1 day in the future')
  .refine(val => val >= 1000000000000, 'Timestamp must be in milliseconds (not seconds)');

/**
 * Chat Message Schema
 * Used in: chat-with-ai-stream, save-chat-history
 */
const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system'], {
    errorMap: () => ({ message: 'Role must be user, assistant, or system' })
  }),
  content: z.string()
    .min(1, 'Message content required')
    .refine(val => !/<script/i.test(val), 'Script tags not allowed'),
  timestamp: timestampSchema.optional()
});

/**
 * Transcript Model Enum
 * Used in: transcription, transcript objects
 */
const transcriptModelSchema = z.enum(
  ['whisper-1', 'gpt-4o-transcribe', 'gpt-4o-transcribe-diarize'],
  {
    errorMap: () => ({ message: 'Model must be whisper-1, gpt-4o-transcribe, or gpt-4o-transcribe-diarize' })
  }
);

/**
 * URL Schema
 * Used in: open-external
 */
const urlSchema = z.string()
  .min(1, 'URL required')
  .max(2048, 'URL too long (max 2048 chars)')
  .url('Invalid URL format')
  .refine(val => {
    try {
      const parsed = new URL(val);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Only HTTP and HTTPS protocols allowed')
  .refine(val => !val.includes('<'), 'HTML tags not allowed');

/**
 * Array Buffer Schema
 * Used in: save-file-to-temp, save-recording
 */
const arrayBufferSchema = (minSize = 0, maxSize = 500 * 1024 * 1024) => {
  return z.instanceof(ArrayBuffer)
    .refine(val => val.byteLength >= minSize, `File too small (min ${minSize} bytes)`)
    .refine(val => val.byteLength <= maxSize, `File too large (max ${(maxSize / 1024 / 1024).toFixed(0)}MB)`);
};

/**
 * WebM ArrayBuffer Schema (with format validation)
 * Used in: save-recording
 */
const webmArrayBufferSchema = z.instanceof(ArrayBuffer)
  .refine(val => val.byteLength >= 1000, 'Recording too small (min 1KB)')
  .refine(val => val.byteLength <= 500 * 1024 * 1024, 'Recording too large (max 500MB)')
  .refine(val => {
    // Verify WebM header signature (0x1A 0x45 0xDF 0xA3)
    const view = new Uint8Array(val);
    return view[0] === 0x1A && view[1] === 0x45 && view[2] === 0xDF && view[3] === 0xA3;
  }, 'Invalid WebM format (missing header signature)');

/**
 * Tag Schema
 * Used in: transcript tags
 */
const tagSchema = z.string()
  .min(1, 'Tag cannot be empty')
  .max(50, 'Tag too long (max 50 chars)')
  .refine(val => !/<script/i.test(val), 'Script tags not allowed');

/**
 * Tags Array Schema
 * Used in: transcript objects
 */
const tagsArraySchema = z.array(tagSchema)
  .max(20, 'Too many tags (max 20)');

module.exports = {
  // Primitives
  apiKeySchema,
  uuidSchema,
  transcriptIdSchema,
  fileNameSchema,
  filePathSchema,
  timestampSchema,
  urlSchema,
  tagSchema,
  tagsArraySchema,

  // Complex types
  chatMessageSchema,
  transcriptModelSchema,

  // Functions
  arrayBufferSchema,
  webmArrayBufferSchema
};
