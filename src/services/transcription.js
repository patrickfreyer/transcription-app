const OpenAI = require('openai');
const fs = require('fs');
const audioProcessing = require('./audioProcessing');
const formatConversion = require('./formatConversion');

/**
 * Transcription Service
 *
 * This module handles the main transcription orchestration logic including:
 * - Processing audio files (conversion, chunking)
 * - Calling OpenAI API for transcription
 * - Combining chunked transcripts
 * - Generating meeting summaries
 */

/**
 * Transcribe audio file using OpenAI API
 * @param {string} filePath - Path to the audio file
 * @param {string} apiKey - OpenAI API key
 * @param {Object} options - Transcription options
 * @param {string} options.model - Model to use (default: 'gpt-4o-transcribe-diarize')
 * @param {Array} options.speakers - Array of speaker reference objects with name and path
 * @param {Function} progressCallback - Optional callback for progress updates (status, message, current, total)
 * @returns {Promise<Object>} - Transcription result with success, transcript, chunked, totalChunks, isDiarized
 */
async function transcribeAudio(filePath, apiKey, options = {}, progressCallback = null) {
  let chunkPaths = [];
  let convertedFilePath = null;

  // Get model from options or default to diarized model
  const model = options?.model || 'gpt-4o-transcribe-diarize';
  const speakers = options?.speakers || null;
  const isDiarizeModel = model === 'gpt-4o-transcribe-diarize';

  try {
    const openai = new OpenAI({ apiKey });

    // Check if file is WebM and needs conversion
    let processFilePath = filePath;
    if (filePath.toLowerCase().endsWith('.webm')) {
      // Check if ffmpeg is available for conversion
      if (!audioProcessing.isFFmpegAvailable()) {
        return {
          success: false,
          error: 'WebM recordings require FFmpeg for conversion, which could not be loaded on this system.\n\nPlease try uploading an MP3 or WAV file instead, or try re-downloading the application.',
        };
      }

      // Send progress update for conversion
      if (progressCallback) {
        progressCallback({
          status: 'converting',
          message: 'Converting recording to MP3 format...',
        });
      }

      // Convert WebM to MP3
      convertedFilePath = await audioProcessing.convertToMP3(filePath);
      processFilePath = convertedFilePath;
    }

    const stats = fs.statSync(processFilePath);
    const fileSizeInMB = stats.size / (1024 * 1024);

    // Check if file needs to be split
    if (fileSizeInMB > 25) {
      // Check if ffmpeg is available for splitting
      if (!audioProcessing.isFFmpegAvailable()) {
        // Clean up converted file if it exists
        if (convertedFilePath && fs.existsSync(convertedFilePath)) {
          fs.unlinkSync(convertedFilePath);
        }

        return {
          success: false,
          error: `File size is ${fileSizeInMB.toFixed(1)}MB, which exceeds the 25MB API limit.\n\nLarge file support requires FFmpeg, which could not be loaded on this system.\n\nPlease use a file smaller than 25MB, or try re-downloading the application.`,
        };
      }

      // Send progress update for splitting
      if (progressCallback) {
        progressCallback({
          status: 'splitting',
          message: 'Splitting large audio file into chunks...',
        });
      }

      // Split audio into chunks
      chunkPaths = await audioProcessing.splitAudioIntoChunks(processFilePath, 20);

      // Get duration of each chunk for timestamp adjustment
      const chunkDurations = [];
      for (const chunkPath of chunkPaths) {
        const duration = await audioProcessing.getAudioDuration(chunkPath);
        chunkDurations.push(duration);
      }

      // Process each chunk
      const transcripts = [];
      for (let i = 0; i < chunkPaths.length; i++) {
        const chunkPath = chunkPaths[i];

        // Send progress update
        if (progressCallback) {
          progressCallback({
            status: 'transcribing',
            message: `Transcribing chunk ${i + 1} of ${chunkPaths.length}...`,
            current: i + 1,
            total: chunkPaths.length,
          });
        }

        // Transcribe chunk
        try {
          console.log(`[Transcription] ========================================`);
          console.log(`[Transcription] Starting chunk ${i + 1}/${chunkPaths.length}`);
          console.log(`[Transcription] Chunk path: ${chunkPath}`);

          // Check chunk file
          const chunkStats = fs.statSync(chunkPath);
          console.log(`[Transcription] Chunk size: ${(chunkStats.size / (1024 * 1024)).toFixed(2)}MB`);
          console.log(`[Transcription] Chunk exists: ${fs.existsSync(chunkPath)}`);

          const transcriptionParams = {
            file: fs.createReadStream(chunkPath),
            model: model,
            response_format: isDiarizeModel ? 'diarized_json' : 'json',
          };

          // Add chunking_strategy for diarized model
          if (isDiarizeModel) {
            transcriptionParams.chunking_strategy = 'auto';
          }

          // Add speaker references if provided (only for first chunk and diarized model)
          if (isDiarizeModel && speakers && speakers.length > 0 && i === 0) {
            console.log(`[Transcription] Adding speaker references for chunk 1`);
            const speakerNames = [];
            const speakerReferences = [];

            for (const speaker of speakers) {
              speakerNames.push(speaker.name);
              const dataURL = formatConversion.fileToDataURL(speaker.path);
              speakerReferences.push(dataURL);
            }

            transcriptionParams.known_speaker_names = speakerNames;
            transcriptionParams.known_speaker_references = speakerReferences;
            console.log(`[Transcription] Added ${speakerNames.length} speaker references`);
          }

          console.log(`[Transcription] API parameters:`, {
            model: transcriptionParams.model,
            response_format: transcriptionParams.response_format,
            chunking_strategy: transcriptionParams.chunking_strategy,
            has_speaker_names: !!transcriptionParams.known_speaker_names,
            speaker_count: transcriptionParams.known_speaker_names?.length || 0
          });

          console.log(`[Transcription] Calling OpenAI API for chunk ${i + 1}...`);
          console.log(`[Transcription] Note: Diarization can take 10-30 minutes for long audio`);
          const startTime = Date.now();

          // Add a keepalive timer to show progress
          const keepAliveInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            console.log(`[Transcription] Still waiting for API response... ${elapsed}s elapsed`);
          }, 10000); // Log every 10 seconds

          let transcription;
          try {
            transcription = await openai.audio.transcriptions.create(transcriptionParams);
          } finally {
            clearInterval(keepAliveInterval);
          }

          const duration = ((Date.now() - startTime) / 1000).toFixed(2);
          console.log(`[Transcription] API call completed in ${duration}s`);
          console.log(`[Transcription] Response has segments: ${!!transcription.segments}`);
          console.log(`[Transcription] Segment count: ${transcription.segments?.length || 0}`);

          if (transcription.segments && transcription.segments.length > 0) {
            console.log(`[Transcription] First segment preview:`, {
              speaker: transcription.segments[0].speaker,
              text: transcription.segments[0].text?.substring(0, 50) + '...',
              start: transcription.segments[0].start,
              end: transcription.segments[0].end
            });
          }

          console.log(`[Transcription] Chunk ${i + 1} completed successfully`);
          transcripts.push(transcription);
        } catch (error) {
          console.error(`[Transcription] ========================================`);
          console.error(`[Transcription] ERROR on chunk ${i + 1}:`, {
            message: error.message,
            status: error.status,
            type: error.type,
            code: error.code,
            param: error.param
          });
          console.error(`[Transcription] Full error:`, error);
          console.error(`[Transcription] ========================================`);

          // Add empty transcript for failed chunk
          transcripts.push({ segments: [] });
        }
      }

      // Send progress update for combining
      if (progressCallback) {
        progressCallback({
          status: 'combining',
          message: 'Combining transcripts...',
        });
      }

      // Combine transcripts based on model type
      let combinedTranscript;

      if (isDiarizeModel) {
        // Combine diarized transcripts with time offset
        let allSegments = [];
        let timeOffset = 0;

        for (let i = 0; i < transcripts.length; i++) {
          const transcript = transcripts[i];
          if (transcript.segments) {
            const offsetSegments = transcript.segments.map(seg => ({
              ...seg,
              start: seg.start + timeOffset,
              end: seg.end + timeOffset
            }));
            allSegments = allSegments.concat(offsetSegments);
          }
          if (i < chunkDurations.length) {
            timeOffset += chunkDurations[i];
          }
        }

        combinedTranscript = formatConversion.diarizedJsonToVTT({ segments: allSegments });

        // Check if we have any actual content
        if (allSegments.length === 0) {
          throw new Error('All chunks failed to transcribe. Please check your audio file and try again.');
        }
      } else {
        // Combine non-diarized transcripts (simple text concatenation)
        const allText = transcripts.map(t => t.text || '').join(' ');

        if (!allText.trim()) {
          throw new Error('All chunks failed to transcribe. Please check your audio file and try again.');
        }

        combinedTranscript = formatConversion.jsonToVTT({ text: allText });
      }

      // Clean up chunks
      audioProcessing.cleanupChunks(chunkPaths);

      // Clean up converted file if it exists
      if (convertedFilePath && fs.existsSync(convertedFilePath)) {
        fs.unlinkSync(convertedFilePath);
      }

      return {
        success: true,
        transcript: combinedTranscript,
        chunked: true,
        totalChunks: chunkPaths.length,
        isDiarized: isDiarizeModel,
      };
    } else {
      // File is small enough, process normally
      const transcriptionParams = {
        file: fs.createReadStream(processFilePath),
        model: model,
        response_format: isDiarizeModel ? 'diarized_json' : 'json',
      };

      // Add chunking_strategy for diarized model
      if (isDiarizeModel) {
        transcriptionParams.chunking_strategy = 'auto';
      }

      // Add speaker references if provided (only for diarized model)
      if (isDiarizeModel && speakers && speakers.length > 0) {
        const speakerNames = [];
        const speakerReferences = [];

        for (const speaker of speakers) {
          speakerNames.push(speaker.name);
          // Convert speaker reference file to data URL
          const dataURL = formatConversion.fileToDataURL(speaker.path);
          speakerReferences.push(dataURL);
        }

        transcriptionParams.known_speaker_names = speakerNames;
        transcriptionParams.known_speaker_references = speakerReferences;
      }

      const transcription = await openai.audio.transcriptions.create(transcriptionParams);

      // Convert response to VTT format based on model
      const finalTranscript = isDiarizeModel
        ? formatConversion.diarizedJsonToVTT(transcription)
        : formatConversion.jsonToVTT(transcription);

      // Clean up converted file if it exists
      if (convertedFilePath && fs.existsSync(convertedFilePath)) {
        fs.unlinkSync(convertedFilePath);
      }

      return {
        success: true,
        transcript: finalTranscript,
        chunked: false,
        isDiarized: isDiarizeModel,
      };
    }
  } catch (error) {
    // Clean up chunks on error
    if (chunkPaths.length > 0) {
      audioProcessing.cleanupChunks(chunkPaths);
    }

    // Clean up converted file on error
    if (convertedFilePath && fs.existsSync(convertedFilePath)) {
      try {
        fs.unlinkSync(convertedFilePath);
      } catch (cleanupError) {
        console.error('Error cleaning up converted file:', cleanupError);
      }
    }

    return {
      success: false,
      error: error.message || 'Transcription failed',
    };
  }
}

/**
 * Generate a meeting summary from a transcript
 * @param {string} transcript - VTT format transcript
 * @param {string} fileName - Original file name for context
 * @param {string} apiKey - OpenAI API key
 * @param {Function} progressCallback - Optional callback for progress updates
 * @returns {Promise<Object>} - Summary result with success and summary
 */
async function generateMeetingSummary(transcript, fileName, apiKey, progressCallback = null) {
  try {
    const openai = new OpenAI({ apiKey });

    // Extract plain text from VTT format
    const plainText = transcript
      .split('\n')
      .filter(line => !line.includes('-->') && !line.startsWith('WEBVTT') && line.trim() !== '' && !/^\d+$/.test(line.trim()))
      .join('\n')
      .trim();

    // System prompt for generating structured meeting summary
    const systemPrompt = `You are an expert meeting analyst for Boston Consulting Group (BCG). Your task is to analyze meeting transcripts and create comprehensive, professional markdown summaries with embedded mermaid.js diagrams where appropriate.

Structure your output with these sections:

# [Meeting Title] - Meeting Summary

## Overview & Context
- Brief description of the meeting purpose, participants, and background
- Date and duration if evident

## Key Topics & Decisions
- Main discussion points organized by topic
- Key decisions made
- Important insights or conclusions

## Process Flow / Diagrams
[Include mermaid.js flowcharts, decision trees, or sequence diagrams ONLY where they add value]
- Use \`\`\`mermaid blocks for diagrams
- Choose appropriate diagram types (flowchart, sequence, gantt, etc.)
- Keep diagrams focused and relevant

## Action Items & Next Steps
- Clear, actionable tasks
- Assigned owners if mentioned
- Deadlines or timeframes
- Follow-up items

## BCG-Style Email Summary
Write a concise 2-3 paragraph executive summary suitable for a BCG email:
- Professional, direct tone
- Highlight key decisions and action items
- Use bullet points where appropriate
- Focus on outcomes and next steps

Guidelines:
- Use professional, clear language
- Be concise but comprehensive
- Only include mermaid diagrams if they genuinely add value (not required)
- Format with proper markdown (headers, lists, emphasis)
- Include timestamps from transcript where relevant for reference`;

    const userPrompt = `Please analyze this meeting transcript and create a comprehensive markdown summary following the structure provided:\n\n${plainText}`;

    // Send progress update
    if (progressCallback) {
      progressCallback({
        status: 'generating',
        message: 'Generating meeting summary...',
      });
    }

    // Call GPT-4o to generate summary
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const summary = completion.choices[0].message.content;

    return {
      success: true,
      summary: summary,
    };
  } catch (error) {
    console.error('Error generating summary:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate summary',
    };
  }
}

module.exports = {
  transcribeAudio,
  generateMeetingSummary,
};
