/**
 * IPC Input Validation Utilities
 *
 * Provides validation wrappers for IPC handlers using Zod schemas.
 * Prevents DoS, XSS, command injection, and other security issues.
 */

const { z } = require('zod');
const { createLogger } = require('./logger');

const logger = createLogger('IpcValidation');

/**
 * Wrap an IPC handler with input validation
 *
 * @param {z.ZodSchema} schema - Zod schema to validate input against
 * @param {Function} handler - Original IPC handler function
 * @param {Object} options - Optional configuration
 * @param {string} options.name - Handler name for logging
 * @returns {Function} Validated handler function
 *
 * @example
 * const schema = z.object({ apiKey: z.string().min(20) });
 * ipcMain.handle('save-api-key', validateIpcHandler(schema, async (event, input) => {
 *   // input is now validated
 *   return { success: true };
 * }));
 */
function validateIpcHandler(schema, handler, options = {}) {
  const handlerName = options.name || 'unknown';

  return async (event, ...args) => {
    try {
      // Determine input based on number of arguments
      let input;
      if (args.length === 0) {
        input = undefined;
      } else if (args.length === 1) {
        input = args[0];
      } else {
        // Multiple arguments - create object with arg0, arg1, etc.
        input = {};
        args.forEach((arg, index) => {
          input[`arg${index}`] = arg;
        });
      }

      // Validate input against schema
      const validated = schema.parse(input);

      // Log validation success
      logger.debug(`✓ Validation passed for handler: ${handlerName}`);

      // Call original handler with validated data
      // If single argument, pass it directly; otherwise pass all args
      if (args.length <= 1) {
        return await handler(event, validated);
      } else {
        // Reconstruct args array from validated object
        const validatedArgs = Object.keys(validated)
          .sort((a, b) => {
            const aNum = parseInt(a.replace('arg', ''));
            const bNum = parseInt(b.replace('arg', ''));
            return aNum - bNum;
          })
          .map(key => validated[key]);
        return await handler(event, ...validatedArgs);
      }

    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => {
          const path = err.path.join('.');
          return `${path}: ${err.message}`;
        }).join(', ');

        logger.error(`✗ Validation failed for handler "${handlerName}": ${errorMessages}`);

        // Return user-friendly error
        return {
          success: false,
          error: `Invalid input: ${errorMessages}`,
          validationError: true
        };
      }

      // Handle other errors
      logger.error(`✗ Handler error for "${handlerName}":`, error);
      throw error;
    }
  };
}

/**
 * Wrap an IPC event listener (ipcMain.on) with validation
 *
 * Note: ipcMain.on doesn't return values, so validation errors are logged only
 *
 * @param {z.ZodSchema} schema - Zod schema to validate input against
 * @param {Function} handler - Original IPC event handler function
 * @param {Object} options - Optional configuration
 * @returns {Function} Validated handler function
 */
function validateIpcListener(schema, handler, options = {}) {
  const handlerName = options.name || 'unknown';

  return async (event, ...args) => {
    logger.info(`[VALIDATION] Listener "${handlerName}" called with ${args.length} arguments`);

    try {
      // Determine input based on number of arguments
      let input;
      if (args.length === 0) {
        input = undefined;
      } else if (args.length === 1) {
        input = args[0];
      } else {
        // Multiple arguments - create object
        input = {};
        args.forEach((arg, index) => {
          input[`arg${index}`] = arg;
        });
      }

      logger.info(`[VALIDATION] Input structure: ${JSON.stringify(Object.keys(input || {}))}`);

      // Validate input
      const validated = schema.parse(input);

      logger.info(`✓ Validation passed for listener: ${handlerName}`);

      // Call original handler
      logger.info(`[VALIDATION] Calling handler for: ${handlerName}`);

      let result;
      if (args.length <= 1) {
        result = await handler(event, validated);
      } else {
        const validatedArgs = Object.keys(validated)
          .sort((a, b) => {
            const aNum = parseInt(a.replace('arg', ''));
            const bNum = parseInt(b.replace('arg', ''));
            return aNum - bNum;
          })
          .map(key => validated[key]);
        result = await handler(event, ...validatedArgs);
      }

      logger.info(`[VALIDATION] Handler completed for: ${handlerName}`);
      return result;

    } catch (error) {
      // For listeners, we can only log errors (no return value)
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => {
          const path = err.path.join('.');
          return `${path}: ${err.message}`;
        }).join(', ');

        logger.error(`✗ Validation failed for listener "${handlerName}": ${errorMessages}`);

        // Try to send error back to renderer if possible
        if (event && event.sender) {
          // For 'chat-with-ai-stream', send to 'chat-stream-error'
          let errorChannel;
          if (handlerName === 'chat-with-ai-stream') {
            errorChannel = 'chat-stream-error';
          } else if (handlerName.includes('stream')) {
            errorChannel = `${handlerName.replace(/-stream$/, '')}-stream-error`;
          } else {
            errorChannel = `${handlerName}-error`;
          }

          logger.error(`Sending validation error to channel: ${errorChannel}`);
          event.sender.send(errorChannel, {
            error: `Invalid input: ${errorMessages}`,
            validationError: true
          });
        }
      } else {
        logger.error(`✗ Listener handler error for "${handlerName}":`, error);
        logger.error(`Error stack: ${error.stack}`);

        // Try to send error back to renderer
        if (event && event.sender) {
          try {
            // For 'chat-with-ai-stream', send to 'chat-stream-error'
            let errorChannel;
            if (handlerName === 'chat-with-ai-stream') {
              errorChannel = 'chat-stream-error';
            } else if (handlerName.includes('stream')) {
              errorChannel = `${handlerName.replace(/-stream$/, '')}-stream-error`;
            } else {
              errorChannel = `${handlerName}-error`;
            }

            logger.error(`Sending handler error to channel: ${errorChannel}`);
            event.sender.send(errorChannel, {
              error: error.message || 'Unknown error occurred',
              stack: error.stack
            });
          } catch (sendError) {
            logger.error(`Failed to send error to renderer: ${sendError.message}`);
          }
        }
      }
    }
  };
}

/**
 * Create a validation schema for multiple arguments
 *
 * @param {...z.ZodSchema} schemas - Zod schemas for each argument
 * @returns {z.ZodSchema} Combined schema
 *
 * @example
 * const schema = multiArgSchema(
 *   z.string(),
 *   z.number(),
 *   z.boolean()
 * );
 * // Validates args[0] as string, args[1] as number, args[2] as boolean
 */
function multiArgSchema(...schemas) {
  const schemaObject = {};
  schemas.forEach((schema, index) => {
    schemaObject[`arg${index}`] = schema;
  });
  return z.object(schemaObject);
}

module.exports = {
  validateIpcHandler,
  validateIpcListener,
  multiArgSchema
};
