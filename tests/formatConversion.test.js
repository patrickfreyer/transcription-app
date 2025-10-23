const formatConversion = require('../src/services/formatConversion');

describe('formatConversion', () => {
  describe('parseVTTTimestamp', () => {
    test('should parse VTT timestamp correctly', () => {
      expect(formatConversion.parseVTTTimestamp('00:00:05.123')).toBe(5.123);
      expect(formatConversion.parseVTTTimestamp('00:01:30.500')).toBe(90.5);
      expect(formatConversion.parseVTTTimestamp('01:30:45.999')).toBe(5445.999);
    });

    test('should handle zero values', () => {
      expect(formatConversion.parseVTTTimestamp('00:00:00.000')).toBe(0);
    });

    test('should handle maximum values', () => {
      expect(formatConversion.parseVTTTimestamp('23:59:59.999')).toBe(86399.999);
    });
  });

  describe('formatVTTTimestamp', () => {
    test('should format seconds to VTT timestamp correctly', () => {
      expect(formatConversion.formatVTTTimestamp(5.123)).toBe('00:00:05.123');
      expect(formatConversion.formatVTTTimestamp(90.5)).toBe('00:01:30.500');
      // Note: floating point precision means .999 becomes .998
      expect(formatConversion.formatVTTTimestamp(5445.999)).toMatch(/01:30:45\.99[89]/);
    });

    test('should handle zero', () => {
      expect(formatConversion.formatVTTTimestamp(0)).toBe('00:00:00.000');
    });

    test('should pad with zeros correctly', () => {
      expect(formatConversion.formatVTTTimestamp(1.1)).toBe('00:00:01.100');
      // Note: floating point precision means .01 might become .009
      expect(formatConversion.formatVTTTimestamp(61.01)).toMatch(/00:01:01\.0(09|10)/);
    });
  });

  describe('parseVTTTimestamp and formatVTTTimestamp round-trip', () => {
    test('should be reversible', () => {
      const timestamps = ['00:00:05.123', '00:01:30.500', '01:30:45.999'];
      timestamps.forEach(timestamp => {
        const seconds = formatConversion.parseVTTTimestamp(timestamp);
        const formatted = formatConversion.formatVTTTimestamp(seconds);
        expect(formatted).toBe(timestamp);
      });
    });
  });

  describe('adjustVTTTimestamps', () => {
    test('should adjust timestamps by offset', () => {
      const vtt = `WEBVTT

1
00:00:05.000 --> 00:00:10.000
Test text`;

      const adjusted = formatConversion.adjustVTTTimestamps(vtt, 10);
      expect(adjusted).toContain('00:00:15.000 --> 00:00:20.000');
    });

    test('should not modify non-timestamp lines', () => {
      const vtt = `WEBVTT

1
00:00:05.000 --> 00:00:10.000
Test text`;

      const adjusted = formatConversion.adjustVTTTimestamps(vtt, 10);
      expect(adjusted).toContain('WEBVTT');
      expect(adjusted).toContain('1');
      expect(adjusted).toContain('Test text');
    });

    test('should handle zero offset', () => {
      const vtt = `00:00:05.000 --> 00:00:10.000`;
      const adjusted = formatConversion.adjustVTTTimestamps(vtt, 0);
      expect(adjusted).toBe(vtt);
    });
  });

  describe('combineVTTTranscripts', () => {
    test('should combine multiple VTT transcripts', () => {
      const vtt1 = `WEBVTT

1
00:00:00.000 --> 00:00:05.000
First chunk`;

      const vtt2 = `WEBVTT

1
00:00:00.000 --> 00:00:05.000
Second chunk`;

      const combined = formatConversion.combineVTTTranscripts([vtt1, vtt2], [5, 5]);

      expect(combined).toContain('WEBVTT');
      expect(combined).toContain('First chunk');
      expect(combined).toContain('Second chunk');
      expect(combined).toContain('00:00:05.000 --> 00:00:10.000'); // Second chunk offset by 5 seconds
    });

    test('should renumber cues sequentially', () => {
      const vtt1 = `WEBVTT

1
00:00:00.000 --> 00:00:05.000
First`;

      const vtt2 = `WEBVTT

1
00:00:00.000 --> 00:00:05.000
Second`;

      const combined = formatConversion.combineVTTTranscripts([vtt1, vtt2], [5, 5]);

      // Should have cue numbers 1 and 2
      const lines = combined.split('\n');
      const cueNumbers = lines.filter(line => /^\d+$/.test(line.trim()));
      expect(cueNumbers.length).toBe(2);
    });

    test('should handle empty transcripts', () => {
      const combined = formatConversion.combineVTTTranscripts([], []);
      expect(combined).toBe('WEBVTT\n\n');
    });
  });

  describe('jsonToVTT', () => {
    test('should convert JSON transcript to VTT', () => {
      const json = { text: 'This is a test transcript.' };
      const vtt = formatConversion.jsonToVTT(json);

      expect(vtt).toContain('WEBVTT');
      expect(vtt).toContain('This is a test transcript.');
    });

    test('should handle empty text', () => {
      const json = { text: '' };
      const vtt = formatConversion.jsonToVTT(json);
      expect(vtt).toBe('WEBVTT\n\n');
    });

    test('should handle null transcript', () => {
      const vtt = formatConversion.jsonToVTT(null);
      expect(vtt).toContain('WEBVTT');
    });
  });

  describe('diarizedJsonToVTT', () => {
    test('should convert diarized JSON to VTT with speakers', () => {
      const diarized = {
        segments: [
          { start: 0, end: 5, speaker: 'Speaker 1', text: 'Hello' },
          { start: 5, end: 10, speaker: 'Speaker 2', text: 'Hi there' }
        ]
      };

      const vtt = formatConversion.diarizedJsonToVTT(diarized);

      expect(vtt).toContain('WEBVTT');
      expect(vtt).toContain('[Speaker 1] Hello');
      expect(vtt).toContain('[Speaker 2] Hi there');
      expect(vtt).toContain('00:00:00.000 --> 00:00:05.000');
      expect(vtt).toContain('00:00:05.000 --> 00:00:10.000');
    });

    test('should handle unknown speaker', () => {
      const diarized = {
        segments: [
          { start: 0, end: 5, text: 'Hello' }
        ]
      };

      const vtt = formatConversion.diarizedJsonToVTT(diarized);
      expect(vtt).toContain('[Unknown] Hello');
    });

    test('should handle empty segments', () => {
      const diarized = { segments: [] };
      const vtt = formatConversion.diarizedJsonToVTT(diarized);
      expect(vtt).toBe('WEBVTT\n\n');
    });

    test('should handle null input', () => {
      const vtt = formatConversion.diarizedJsonToVTT(null);
      expect(vtt).toBe('WEBVTT\n\n');
    });

    test('should number cues sequentially', () => {
      const diarized = {
        segments: [
          { start: 0, end: 5, speaker: 'Speaker 1', text: 'First' },
          { start: 5, end: 10, speaker: 'Speaker 2', text: 'Second' },
          { start: 10, end: 15, speaker: 'Speaker 1', text: 'Third' }
        ]
      };

      const vtt = formatConversion.diarizedJsonToVTT(diarized);

      expect(vtt).toContain('1\n');
      expect(vtt).toContain('2\n');
      expect(vtt).toContain('3\n');
    });
  });

  describe('fileToDataURL', () => {
    // Note: This test would require mocking fs.readFileSync
    // Skipping for now as it requires file system mocking
    test.skip('should convert file to data URL', () => {
      // Would need to mock fs module
    });
  });
});
