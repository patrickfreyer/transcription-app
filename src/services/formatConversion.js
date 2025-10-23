const fs = require('fs');
const path = require('path');

/**
 * Format Conversion Service
 *
 * This module handles all format conversion operations including:
 * - VTT timestamp parsing and formatting
 * - Combining VTT transcripts
 * - Converting JSON to VTT
 * - Converting diarized JSON to VTT with speaker labels
 * - Converting files to data URLs
 */

/**
 * Parse a VTT timestamp string to seconds
 * @param {string} timestamp - VTT timestamp (format: HH:MM:SS.mmm)
 * @returns {number} - Total seconds
 */
function parseVTTTimestamp(timestamp) {
  const parts = timestamp.split(':');
  const hours = parseInt(parts[0]);
  const minutes = parseInt(parts[1]);
  const secondsParts = parts[2].split('.');
  const seconds = parseInt(secondsParts[0]);
  const milliseconds = parseInt(secondsParts[1]);

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

/**
 * Format seconds to VTT timestamp string
 * @param {number} totalSeconds - Total seconds
 * @returns {string} - VTT timestamp (format: HH:MM:SS.mmm)
 */
function formatVTTTimestamp(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.floor((totalSeconds % 1) * 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

/**
 * Adjust VTT timestamps by adding an offset
 * @param {string} vttContent - VTT content string
 * @param {number} offsetSeconds - Offset to add in seconds
 * @returns {string} - VTT content with adjusted timestamps
 */
function adjustVTTTimestamps(vttContent, offsetSeconds) {
  const lines = vttContent.split('\n');
  const adjustedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line contains timestamp (format: HH:MM:SS.mmm --> HH:MM:SS.mmm)
    if (line.includes('-->')) {
      const [start, end] = line.split('-->').map(s => s.trim());
      const startSeconds = parseVTTTimestamp(start) + offsetSeconds;
      const endSeconds = parseVTTTimestamp(end) + offsetSeconds;

      adjustedLines.push(`${formatVTTTimestamp(startSeconds)} --> ${formatVTTTimestamp(endSeconds)}`);
    } else {
      adjustedLines.push(line);
    }
  }

  return adjustedLines.join('\n');
}

/**
 * Combine multiple VTT transcripts into one with adjusted timestamps
 * @param {string[]} vttTranscripts - Array of VTT transcript strings
 * @param {number[]} chunkDurations - Array of chunk durations in seconds
 * @returns {string} - Combined VTT transcript
 */
function combineVTTTranscripts(vttTranscripts, chunkDurations) {
  let combinedVTT = 'WEBVTT\n\n';
  let cueNumber = 1;
  let timeOffset = 0;

  for (let i = 0; i < vttTranscripts.length; i++) {
    const vtt = vttTranscripts[i];
    const lines = vtt.split('\n');

    let skipHeader = true;
    let currentCue = [];

    for (let j = 0; j < lines.length; j++) {
      const line = lines[j];

      // Skip WEBVTT header and initial blank lines
      if (skipHeader) {
        if (line.trim() === '' || line.startsWith('WEBVTT')) {
          continue;
        }
        skipHeader = false;
      }

      // Process cue lines
      if (line.includes('-->')) {
        const [start, end] = line.split('-->').map(s => s.trim());
        const startSeconds = parseVTTTimestamp(start) + timeOffset;
        const endSeconds = parseVTTTimestamp(end) + timeOffset;

        currentCue.push(`${cueNumber}`);
        currentCue.push(`${formatVTTTimestamp(startSeconds)} --> ${formatVTTTimestamp(endSeconds)}`);
        cueNumber++;
      } else if (line.trim() === '') {
        // End of cue
        if (currentCue.length > 0) {
          combinedVTT += currentCue.join('\n') + '\n\n';
          currentCue = [];
        }
      } else if (!line.match(/^\d+$/)) {
        // Text content (skip standalone numbers which are cue IDs)
        currentCue.push(line);
      }
    }

    // Add any remaining cue
    if (currentCue.length > 0) {
      combinedVTT += currentCue.join('\n') + '\n\n';
    }

    // Update time offset for next chunk
    if (i < chunkDurations.length) {
      timeOffset += chunkDurations[i];
    }
  }

  return combinedVTT;
}

/**
 * Convert file to base64 data URL
 * @param {string} filePath - Path to the file
 * @returns {string} - Data URL
 */
function fileToDataURL(filePath) {
  const buffer = fs.readFileSync(filePath);
  const base64 = buffer.toString('base64');
  const ext = path.extname(filePath).toLowerCase();

  // Map extensions to MIME types
  const mimeTypes = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.webm': 'audio/webm',
    '.mp4': 'audio/mp4',
    '.mpeg': 'audio/mpeg',
    '.mpga': 'audio/mpeg'
  };

  const mimeType = mimeTypes[ext] || 'audio/mpeg';
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Convert JSON transcript to VTT format
 * @param {Object} jsonTranscript - JSON transcript object with text property
 * @returns {string} - VTT format string
 */
function jsonToVTT(jsonTranscript) {
  if (!jsonTranscript || !jsonTranscript.text) {
    return 'WEBVTT\n\n' + (jsonTranscript?.text || '');
  }
  // For simple JSON responses without segments, just return the text as VTT
  return 'WEBVTT\n\n' + jsonTranscript.text;
}

/**
 * Convert diarized JSON to VTT format with speaker labels
 * @param {Object} diarizedTranscript - Diarized JSON transcript with segments array
 * @returns {string} - VTT format string with speaker labels
 */
function diarizedJsonToVTT(diarizedTranscript) {
  if (!diarizedTranscript || !diarizedTranscript.segments) {
    return 'WEBVTT\n\n';
  }

  let vtt = 'WEBVTT\n\n';
  let cueNumber = 1;

  for (const segment of diarizedTranscript.segments) {
    const start = formatVTTTimestamp(segment.start);
    const end = formatVTTTimestamp(segment.end);
    const speaker = segment.speaker || 'Unknown';
    const text = segment.text || '';

    vtt += `${cueNumber}\n`;
    vtt += `${start} --> ${end}\n`;
    vtt += `[${speaker}] ${text}\n\n`;
    cueNumber++;
  }

  return vtt;
}

module.exports = {
  parseVTTTimestamp,
  formatVTTTimestamp,
  adjustVTTTimestamps,
  combineVTTTranscripts,
  fileToDataURL,
  jsonToVTT,
  diarizedJsonToVTT,
};
