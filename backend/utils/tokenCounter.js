/**
 * Token estimation utility
 * Rough approximation: ~4 characters = 1 token for English text
 * For more accuracy, could integrate tiktoken library
 */

/**
 * Estimate token count for text
 * @param {string} text - Text to estimate tokens for
 * @returns {number} Estimated token count
 */
function estimateTokens(text) {
  if (!text || typeof text !== 'string') return 0;

  // Rough estimation: 4 characters per token
  // More accurate would be to use tiktoken, but this is good enough
  return Math.ceil(text.length / 4);
}

/**
 * Check if token count is within safe limits
 * @param {number} tokens - Token count to check
 * @param {number} limit - Token limit (default 100k)
 * @returns {boolean} True if within limit
 */
function isWithinTokenLimit(tokens, limit = 100000) {
  return tokens <= limit;
}

/**
 * Calculate total tokens for multiple texts
 * @param {string[]} texts - Array of text strings
 * @returns {number} Total estimated tokens
 */
function estimateTotalTokens(texts) {
  return texts.reduce((sum, text) => sum + estimateTokens(text), 0);
}

module.exports = {
  estimateTokens,
  isWithinTokenLimit,
  estimateTotalTokens
};
