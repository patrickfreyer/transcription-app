/**
 * Pick the correct content string for the Save-As / Copy path.
 *
 * Returns { ok: true, content } when a non-empty payload is available;
 * { ok: false, error } when the selected content is missing. Callers must
 * check `ok` — silently writing `undefined` produced the empty-file bug
 * reported in Nov 2025 when opening a compressed-storage transcript.
 *
 * @param {object} transcription - { rawTranscript, vttTranscript, summary, ... }
 * @param {'raw'|'summary'} activeView
 * @param {'txt'|'vtt'|'md'} format
 */
export function selectExportContent(transcription, activeView, format) {
  if (!transcription) {
    return { ok: false, error: 'Transcript content not loaded yet. Please try again in a moment.' };
  }

  let candidate;
  if (activeView === 'summary') {
    candidate = transcription.summary;
  } else if (format === 'vtt') {
    candidate = transcription.vttTranscript || transcription.rawTranscript;
  } else {
    candidate = transcription.rawTranscript;
  }

  if (typeof candidate !== 'string' || candidate.trim().length === 0) {
    return {
      ok: false,
      error: 'Transcript content is empty or not loaded yet. Please try again in a moment.',
    };
  }

  return { ok: true, content: candidate };
}
