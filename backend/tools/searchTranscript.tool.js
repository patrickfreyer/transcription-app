/**
 * searchTranscript Tool
 * Search for specific keywords or phrases within transcripts
 */

const { z } = require('zod');

// Tool schema
const searchTranscriptSchema = z.object({
  query: z.string().describe('Search query (keywords or phrase)'),
  transcriptIds: z.array(z.string()).optional().describe('Specific transcript IDs to search (if empty, searches all context transcripts)'),
  contextLines: z.number().optional().describe('Number of surrounding lines to include (default 2)'),
  caseSensitive: z.boolean().optional().describe('Whether search should be case-sensitive (default false)')
});

// Tool execution function
async function execute(input, context) {
  const {
    query,
    transcriptIds,
    contextLines = 2,
    caseSensitive = false
  } = input;

  // Determine which transcripts to search
  const transcriptsToSearch = transcriptIds && transcriptIds.length > 0
    ? transcriptIds.map(id => context.transcriptMap?.[id]).filter(Boolean)
    : context.transcripts || [];

  if (transcriptsToSearch.length === 0) {
    return {
      error: 'No transcripts available to search',
      query,
      totalMatches: 0,
      results: []
    };
  }

  const results = [];
  const searchQuery = caseSensitive ? query : query.toLowerCase();

  for (const transcript of transcriptsToSearch) {
    const lines = transcript.rawTranscript.split('\n');
    const matches = [];

    lines.forEach((line, index) => {
      const lineToSearch = caseSensitive ? line : line.toLowerCase();

      if (lineToSearch.includes(searchQuery)) {
        // Get surrounding context
        const start = Math.max(0, index - contextLines);
        const end = Math.min(lines.length, index + contextLines + 1);
        const excerpt = lines.slice(start, end).join('\n');

        // Highlight the matched line
        const contextBefore = lines.slice(start, index);
        const matchedLine = lines[index];
        const contextAfter = lines.slice(index + 1, end);

        matches.push({
          lineNumber: index + 1,
          matchedLine,
          excerpt,
          contextBefore: contextBefore.join('\n'),
          contextAfter: contextAfter.join('\n')
        });
      }
    });

    if (matches.length > 0) {
      results.push({
        transcriptId: transcript.id,
        transcriptName: transcript.fileName,
        matchCount: matches.length,
        matches: matches.slice(0, 10) // Limit to 10 matches per transcript
      });
    }
  }

  const totalMatches = results.reduce((sum, r) => sum + r.matchCount, 0);

  return {
    query,
    totalMatches,
    transcriptsSearched: transcriptsToSearch.length,
    results,
    truncated: results.some(r => r.matchCount > 10)
  };
}

// Export tool definition
module.exports = {
  name: 'search_transcript',
  description: 'Search for specific keywords or phrases within one or more transcripts. Returns matching excerpts with context.',
  parameters: searchTranscriptSchema,
  execute
};
