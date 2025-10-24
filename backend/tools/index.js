/**
 * Tools Index
 * Export all agent tools
 */

const getTranscriptChunk = require('./getTranscriptChunk.tool');
const searchTranscript = require('./searchTranscript.tool');
const extractSpeakers = require('./extractSpeakers.tool');
const compareTranscripts = require('./compareTranscripts.tool');

module.exports = {
  getTranscriptChunk,
  searchTranscript,
  extractSpeakers,
  compareTranscripts
};
