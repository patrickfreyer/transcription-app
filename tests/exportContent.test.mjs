/**
 * Tests for exportContent helper — picks the right content payload to send
 * to the Save-As handler based on format / active view.
 *
 * Regression: Save-As silently produced empty files when the transcript
 * object was metadata-only (compressed-storage transcripts opened from
 * the Analysis tab's DetailView). The helper must refuse instead of
 * returning an empty string.
 *
 * Run with: node --test tests/exportContent.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { selectExportContent } from '../src/utils/exportContent.js';

test('returns rawTranscript for txt format on raw view', () => {
  const result = selectExportContent(
    { rawTranscript: 'hello world', vttTranscript: 'WEBVTT\n\nhello world' },
    'raw',
    'txt'
  );
  assert.deepStrictEqual(result, { ok: true, content: 'hello world' });
});

test('returns summary for summary view', () => {
  const result = selectExportContent(
    { rawTranscript: 'raw', summary: 'the summary' },
    'summary',
    'txt'
  );
  assert.deepStrictEqual(result, { ok: true, content: 'the summary' });
});

test('returns vttTranscript for vtt format', () => {
  const result = selectExportContent(
    { rawTranscript: 'plain', vttTranscript: 'WEBVTT\n\n00:00.000 --> 00:02.000\nplain' },
    'raw',
    'vtt'
  );
  assert.deepStrictEqual(result, {
    ok: true,
    content: 'WEBVTT\n\n00:00.000 --> 00:02.000\nplain',
  });
});

test('refuses when rawTranscript is missing (metadata-only transcript)', () => {
  // Regression: this is exactly what DetailView passes in — a transcript
  // whose content lives on disk and hasn't been loaded yet.
  const result = selectExportContent(
    { id: 'transcript-123', fileName: 'meeting.mp3', hasVTTFile: true },
    'raw',
    'txt'
  );
  assert.strictEqual(result.ok, false);
  assert.match(result.error, /not loaded|empty/i);
});

test('refuses when rawTranscript is empty string', () => {
  const result = selectExportContent(
    { rawTranscript: '' },
    'raw',
    'txt'
  );
  assert.strictEqual(result.ok, false);
});

test('refuses when summary missing on summary view', () => {
  const result = selectExportContent(
    { rawTranscript: 'raw content', summary: null },
    'summary',
    'txt'
  );
  assert.strictEqual(result.ok, false);
});

test('falls back to rawTranscript for vtt format if vttTranscript missing', () => {
  // If a transcript predates VTT capture, still let the user export
  // the plain text rather than dumping an empty file.
  const result = selectExportContent(
    { rawTranscript: 'plain only', vttTranscript: null },
    'raw',
    'vtt'
  );
  assert.deepStrictEqual(result, { ok: true, content: 'plain only' });
});
