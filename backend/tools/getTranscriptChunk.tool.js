/**
 * getTranscriptChunk Tool
 * Fetches a specific portion of a transcript by time range or line numbers
 */

const { z } = require('zod');
const { extractLines } = require('../utils/transcriptChunker');

// Tool schema
const getTranscriptChunkSchema = z.object({
  transcriptId: z.string().describe('ID of the transcript to fetch from'),
  startTime: z.number().optional().describe('Start time in seconds (for VTT transcripts)'),
  endTime: z.number().optional().describe('End time in seconds (for VTT transcripts)'),
  startLine: z.number().optional().describe('Start line number (for raw transcripts, 1-indexed)'),
  endLine: z.number().optional().describe('End line number (for raw transcripts, 1-indexed)')
});

// Tool execution function
async function execute(input, context) {
  const { transcriptId, startTime, endTime, startLine, endLine } = input;

  // Get transcript from context
  const transcript = context.transcriptMap?.[transcriptId];

  if (!transcript) {
    return {
      error: `Transcript not found: ${transcriptId}`,
      chunk: null
    };
  }

  // If time-based (VTT)
  if (startTime !== undefined && endTime !== undefined) {
    if (!transcript.vttTranscript) {
      return {
        error: 'VTT transcript not available for this transcript',
        chunk: null
      };
    }

    const vttLines = transcript.vttTranscript.split('\n');
    const filtered = [];

    for (const line of vttLines) {
      const timeMatch = line.match(/(\d{2}):(\d{2}):(\d{2})/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const seconds = parseInt(timeMatch[3]);
        const lineTime = hours * 3600 + minutes * 60 + seconds;

        if (lineTime >= startTime && lineTime <= endTime) {
          filtered.push(line);
        }
      } else {
        // Include non-timestamp lines within range
        if (filtered.length > 0) {
          filtered.push(line);
        }
      }
    }

    return {
      chunk: filtered.join('\n'),
      source: `${transcript.fileName} (${startTime}s - ${endTime}s)`,
      transcriptId: transcript.id,
      method: 'time-based'
    };
  }

  // If line-based (raw)
  if (startLine !== undefined && endLine !== undefined) {
    const chunk = extractLines(transcript.rawTranscript, startLine, endLine);

    return {
      chunk,
      source: `${transcript.fileName} (lines ${startLine}-${endLine})`,
      transcriptId: transcript.id,
      method: 'line-based'
    };
  }

  // Default: return first 100 lines as preview
  const lines = transcript.rawTranscript.split('\n');
  const previewLines = Math.min(100, lines.length);

  return {
    chunk: lines.slice(0, previewLines).join('\n'),
    source: `${transcript.fileName} (preview - first ${previewLines} lines)`,
    transcriptId: transcript.id,
    method: 'preview'
  };
}

// Export tool definition for OpenAI Agents SDK
module.exports = {
  name: 'get_transcript_chunk',
  description: 'Fetch a specific portion of a transcript by time range or line numbers. Use this to load transcript content on-demand instead of loading everything at once.',
  parameters: getTranscriptChunkSchema,
  execute
};
