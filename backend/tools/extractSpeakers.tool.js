/**
 * extractSpeakers Tool
 * Extract speaker information from diarized transcripts
 */

const { z } = require('zod');

// Tool schema
const extractSpeakersSchema = z.object({
  transcriptId: z.string().describe('ID of the transcript to extract speakers from'),
  includeSamples: z.boolean().optional().describe('Whether to include sample dialogue for each speaker (default true)')
});

// Tool execution function
async function execute(input, context) {
  const { transcriptId, includeSamples = true } = input;

  // Get transcript from context
  const transcript = context.transcriptMap?.[transcriptId];

  if (!transcript) {
    return {
      error: `Transcript not found: ${transcriptId}`,
      speakers: []
    };
  }

  // Check if transcript is diarized
  if (!transcript.isDiarized) {
    return {
      error: 'This transcript is not diarized (no speaker labels available)',
      transcriptId: transcript.id,
      transcriptName: transcript.fileName,
      speakers: []
    };
  }

  // Extract speakers from transcript
  // Pattern: "Speaker 1:", "Speaker 2:", etc.
  const speakerPattern = /^(Speaker \d+):/gm;
  const lines = transcript.rawTranscript.split('\n');
  const speakerMap = new Map();

  let currentSpeaker = null;

  for (const line of lines) {
    const match = line.match(/^(Speaker \d+):/);

    if (match) {
      currentSpeaker = match[1];

      if (!speakerMap.has(currentSpeaker)) {
        speakerMap.set(currentSpeaker, {
          name: currentSpeaker,
          lineCount: 0,
          dialogue: []
        });
      }

      speakerMap.get(currentSpeaker).lineCount++;

      // Extract the actual dialogue (remove "Speaker X: " prefix)
      const dialogue = line.replace(/^Speaker \d+:\s*/, '').trim();

      if (includeSamples && dialogue) {
        // Keep first 5 samples
        if (speakerMap.get(currentSpeaker).dialogue.length < 5) {
          speakerMap.get(currentSpeaker).dialogue.push(dialogue);
        }
      }
    }
  }

  // Convert map to array
  const speakers = Array.from(speakerMap.values()).map(speaker => ({
    name: speaker.name,
    lineCount: speaker.lineCount,
    samples: includeSamples ? speaker.dialogue : undefined
  }));

  // Sort by line count (most active speakers first)
  speakers.sort((a, b) => b.lineCount - a.lineCount);

  return {
    transcriptId: transcript.id,
    transcriptName: transcript.fileName,
    speakerCount: speakers.length,
    speakers,
    totalLines: lines.length,
    isDiarized: true
  };
}

// Export tool definition
module.exports = {
  name: 'extract_speakers',
  description: 'Extract speaker information from diarized transcripts. Returns list of speakers with their dialogue counts and sample quotes.',
  parameters: extractSpeakersSchema,
  execute
};
