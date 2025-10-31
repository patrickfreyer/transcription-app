/**
 * Token Limit Guardrail
 * Prevents context overload by validating total token count
 */

const { estimateTotalTokens } = require('../utils/tokenCounter');

const SAFE_LIMIT = 100000; // 100k tokens

/**
 * Validate token limit for input
 * @param {string} input - User input
 * @param {Object} context - Agent context with transcripts
 * @returns {Object} Validation result
 */
function validate(input, context) {
  // Calculate tokens from transcripts
  const transcriptTokens = context.transcripts
    ? context.transcripts.reduce((sum, t) => sum + (t.tokens || 0), 0)
    : 0;

  // Estimate tokens in user input (rough: 4 chars = 1 token)
  const inputTokens = Math.ceil(input.length / 4);

  // Add buffer for response (estimate 2000 tokens)
  const totalEstimated = transcriptTokens + inputTokens + 2000;

  if (totalEstimated > SAFE_LIMIT) {
    return {
      valid: false,
      message: `Token limit exceeded: ${totalEstimated.toLocaleString()} tokens estimated (limit: ${SAFE_LIMIT.toLocaleString()}). Please reduce the number of selected transcripts or shorten your query.`,
      estimatedTokens: totalEstimated,
      limit: SAFE_LIMIT
    };
  }

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
