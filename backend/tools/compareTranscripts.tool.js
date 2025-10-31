/**
 * compareTranscripts Tool
 * Compare multiple transcripts to find common themes or differences
 */

const { z } = require('zod');

// Tool schema
const compareTranscriptsSchema = z.object({
  transcriptIds: z.array(z.string()).min(2).describe('Array of transcript IDs to compare (minimum 2)'),
  comparisonType: z.enum(['themes', 'keywords', 'speakers', 'summary']).optional().describe('Type of comparison to perform (default: themes)')
});

// Tool execution function
async function execute(input, context) {
  const { transcriptIds, comparisonType = 'themes' } = input;

  // Validate we have at least 2 transcripts
  if (transcriptIds.length < 2) {
    return {
      error: 'At least 2 transcripts are required for comparison',
      transcripts: []
    };
  }

  // Get transcripts from context
  const transcripts = transcriptIds
    .map(id => context.transcriptMap?.[id])
    .filter(Boolean);

  if (transcripts.length < 2) {
    return {
      error: 'Could not find all requested transcripts',
      requestedIds: transcriptIds,
      foundCount: transcripts.length,
      transcripts: []
    };
  }

  // Perform comparison based on type
  let comparisonResult;

  switch (comparisonType) {
    case 'keywords':
      comparisonResult = compareKeywords(transcripts);
      break;
    case 'speakers':
      comparisonResult = compareSpeakers(transcripts);
      break;
    case 'summary':
      comparisonResult = compareSummaries(transcripts);
      break;
    case 'themes':
    default:
      comparisonResult = compareThemes(transcripts);
      break;
  }

  return {
    comparisonType,
    transcriptCount: transcripts.length,
    transcripts: transcripts.map(t => ({
      id: t.id,
      name: t.fileName,
      duration: t.duration,
      timestamp: t.timestamp
    })),
    ...comparisonResult
  };
}

// Helper: Compare common themes (simple word frequency)
function compareThemes(transcripts) {
  const wordFrequency = new Map();

  // Extract common words (>5 characters, not common stop words)
  const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'with', 'this', 'that', 'from', 'have', 'they', 'will', 'would', 'there', 'their', 'what', 'about', 'which', 'when', 'make', 'like', 'time', 'just', 'know', 'take', 'people', 'into', 'year', 'your', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us']);

  for (const transcript of transcripts) {
    const words = transcript.rawTranscript
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 5 && !stopWords.has(word));

    for (const word of words) {
      wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
    }
  }

  // Get top common themes (words that appear in multiple transcripts)
  const commonThemes = Array.from(wordFrequency.entries())
    .filter(([word, count]) => count >= transcripts.length) // Appears in all transcripts
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, frequency: count }));

  return {
    commonThemes,
    themeCount: commonThemes.length
  };
}

// Helper: Compare keywords
function compareKeywords(transcripts) {
  const allKeywords = new Map();

  for (const transcript of transcripts) {
    // Simple keyword extraction (capitalized words, likely names or important terms)
    const keywords = transcript.rawTranscript
      .match(/\b[A-Z][a-z]+\b/g) || [];

    for (const keyword of keywords) {
      if (!allKeywords.has(keyword)) {
        allKeywords.set(keyword, new Set());
      }
      allKeywords.get(keyword).add(transcript.id);
    }
  }

  // Find keywords present in multiple transcripts
  const sharedKeywords = Array.from(allKeywords.entries())
    .filter(([keyword, transcriptSet]) => transcriptSet.size > 1)
    .map(([keyword, transcriptSet]) => ({
      keyword,
      appearanceCount: transcriptSet.size,
      transcriptIds: Array.from(transcriptSet)
    }))
    .sort((a, b) => b.appearanceCount - a.appearanceCount)
    .slice(0, 15);

  return {
    sharedKeywords,
    totalUniqueKeywords: allKeywords.size
  };
}

// Helper: Compare speakers (for diarized transcripts)
function compareSpeakers(transcripts) {
  const diarizedTranscripts = transcripts.filter(t => t.isDiarized);

  if (diarizedTranscripts.length === 0) {
    return {
      error: 'No diarized transcripts to compare',
      speakers: []
    };
  }

  const speakerCounts = [];

  for (const transcript of diarizedTranscripts) {
    const speakerPattern = /Speaker \d+:/g;
    const matches = transcript.rawTranscript.match(speakerPattern) || [];
    const uniqueSpeakers = new Set(matches.map(m => m.trim()));

    speakerCounts.push({
      transcriptId: transcript.id,
      transcriptName: transcript.fileName,
      speakerCount: uniqueSpeakers.size,
      speakers: Array.from(uniqueSpeakers)
    });
  }

  return {
    speakerCounts,
    diarizedCount: diarizedTranscripts.length,
    nonDiarizedCount: transcripts.length - diarizedTranscripts.length
  };
}

// Helper: Compare summaries
function compareSummaries(transcripts) {
  const withSummaries = transcripts.filter(t => t.summary);

  if (withSummaries.length === 0) {
    return {
      error: 'No summaries available to compare',
      summaries: []
    };
  }

  const summaries = withSummaries.map(t => ({
    transcriptId: t.id,
    transcriptName: t.fileName,
    summary: t.summary,
    summaryLength: t.summary.length,
    summaryTemplate: t.summaryTemplate
  }));

  return {
    summaries,
    totalWithSummaries: withSummaries.length,
    totalWithoutSummaries: transcripts.length - withSummaries.length
  };
}

// Export tool definition
module.exports = {
  name: 'compare_transcripts',
  description: 'Compare multiple transcripts to find common themes, keywords, speakers, or summaries. Helps identify patterns across multiple conversations.',
  parameters: compareTranscriptsSchema,
  execute
};
