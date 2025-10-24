/**
 * Relevance Guardrail
 * Ensures questions are relevant to transcript analysis
 */

/**
 * Check if input is relevant to transcript analysis
 * @param {string} input - User input
 * @param {Object} context - Agent context
 * @returns {Object} Validation result
 */
function validate(input, context) {
  const lowerInput = input.toLowerCase();

  // List of completely irrelevant patterns
  const irrelevantPatterns = [
    /what is the weather/i,
    /tell me a joke/i,
    /write me a poem/i,
    /calculate \d+ \+ \d+/i,
    /what time is it/i,
    /what is today/i
  ];

  // Check for obvious irrelevant queries
  for (const pattern of irrelevantPatterns) {
    if (pattern.test(lowerInput)) {
      return {
        valid: false,
        message: 'Your question doesn\'t seem related to the transcripts. Please ask questions about the transcript content, speakers, themes, or summaries.'
      };
    }
  }

  // Check if user is asking about transcripts when none are selected
  if (!context.transcripts || context.transcripts.length === 0) {
    return {
      valid: false,
      message: 'No transcripts are currently selected. Please select at least one transcript to analyze.'
    };
  }

  // Otherwise, allow the query
  return {
    valid: true
  };
}

module.exports = {
  name: 'Relevance Check',
  description: 'Ensures questions are relevant to transcript analysis',
  validate
};
