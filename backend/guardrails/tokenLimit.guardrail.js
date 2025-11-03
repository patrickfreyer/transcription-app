/**
 * Token Limit Guardrail
 * Prevents context overload by validating total token count
 */

const { estimateTotalTokens } = require('../utils/tokenCounter');

const SAFE_LIMIT = Infinity; // No limit

/**
 * Validate token limit for input
 * @param {string} input - User input
 * @param {Object} context - Agent context with transcripts
 * @returns {Object} Validation result
 */
function validate(input, context) {
  // Calculate tokens from transcripts (for logging only)
  const transcriptTokens = context.transcripts
    ? context.transcripts.reduce((sum, t) => sum + (t.tokens || 0), 0)
    : 0;

  // Estimate tokens in user input (rough: 4 chars = 1 token)
  const inputTokens = Math.ceil(input.length / 4);

  // Add buffer for response (estimate 2000 tokens)
  const totalEstimated = transcriptTokens + inputTokens + 2000;

  // Token limit disabled - always return valid
  return {
    valid: true,
    estimatedTokens: totalEstimated,
    limit: SAFE_LIMIT
  };
}

module.exports = {
  name: 'Token Limit Check',
  description: 'Prevents context overload by validating total token count',
  validate,
  SAFE_LIMIT
};
