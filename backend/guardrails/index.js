/**
 * Guardrails Index
 * Export all guardrails
 */

const tokenLimit = require('./tokenLimit.guardrail');
const relevance = require('./relevance.guardrail');

module.exports = {
  tokenLimit,
  relevance
};
