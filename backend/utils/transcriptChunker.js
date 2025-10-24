/**
 * Transcript chunking utility
 * Split large transcripts into manageable chunks for efficient loading
 */

/**
 * Split transcript into chunks by line count
 * @param {string} transcript - Full transcript text
 * @param {number} linesPerChunk - Number of lines per chunk
 * @returns {Array} Array of chunk objects
 */
function chunkTranscriptByLines(transcript, linesPerChunk = 100) {
  if (!transcript) return [];

  const lines = transcript.split('\n');
  const chunks = [];

  for (let i = 0; i < lines.length; i += linesPerChunk) {
    const chunkLines = lines.slice(i, i + linesPerChunk);
    chunks.push({
      id: `chunk-${i}-${Math.min(i + linesPerChunk, lines.length)}`,
      content: chunkLines.join('\n'),
      startLine: i + 1,
      endLine: Math.min(i + linesPerChunk, lines.length),
      lineCount: chunkLines.length
    });
  }

  return chunks;
}

/**
 * Split VTT transcript by time range
 * @param {string} vttTranscript - VTT format transcript
 * @param {number} secondsPerChunk - Seconds per chunk
 * @returns {Array} Array of time-based chunks
 */
function chunkVttByTime(vttTranscript, secondsPerChunk = 60) {
  if (!vttTranscript) return [];

  const lines = vttTranscript.split('\n');
  const chunks = [];
  let currentChunk = [];
  let currentStartTime = 0;
  let currentEndTime = 0;

  for (const line of lines) {
    // Match VTT timestamp format: 00:00:00.000 --> 00:00:05.000
    const timeMatch = line.match(/(\d{2}):(\d{2}):(\d{2})/);

    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const seconds = parseInt(timeMatch[3]);
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;

      if (currentChunk.length === 0) {
        currentStartTime = totalSeconds;
      }
      currentEndTime = totalSeconds;

      // If chunk exceeds duration, save and start new chunk
      if (currentEndTime - currentStartTime >= secondsPerChunk && currentChunk.length > 0) {
        chunks.push({
          id: `time-${currentStartTime}-${currentEndTime}`,
          content: currentChunk.join('\n'),
          startTime: currentStartTime,
          endTime: currentEndTime,
          duration: currentEndTime - currentStartTime
        });
        currentChunk = [];
      }
    }

    currentChunk.push(line);
  }

  // Add remaining chunk
  if (currentChunk.length > 0) {
    chunks.push({
      id: `time-${currentStartTime}-${currentEndTime}`,
      content: currentChunk.join('\n'),
      startTime: currentStartTime,
      endTime: currentEndTime,
      duration: currentEndTime - currentStartTime
    });
  }

  return chunks;
}

/**
 * Extract specific lines from transcript
 * @param {string} transcript - Full transcript
 * @param {number} startLine - Start line (1-indexed)
 * @param {number} endLine - End line (1-indexed)
 * @returns {string} Extracted lines
 */
function extractLines(transcript, startLine, endLine) {
  if (!transcript) return '';

  const lines = transcript.split('\n');
  return lines.slice(startLine - 1, endLine).join('\n');
}

module.exports = {
  chunkTranscriptByLines,
  chunkVttByTime,
  extractLines
};
