import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

/**
 * AudioPlayer Component
 *
 * A sticky audio player for transcript playback.
 * Supports seeking to specific timestamps when clicking on transcript text.
 */
const AudioPlayer = forwardRef(function AudioPlayer({
  transcriptId,
  onTimeUpdate,
  onPlayStateChange,
  className = ''
}, ref) {
  const audioRef = useRef(null);
  const [audioPath, setAudioPath] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAudio, setHasAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [error, setError] = useState(null);

  // Load audio path when transcript changes
  useEffect(() => {
    const loadAudioPath = async () => {
      if (!transcriptId) {
        setHasAudio(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await window.electron.getAudioPath(transcriptId);
        if (result.success && result.audioPath) {
          setAudioPath(result.audioPath);
          setHasAudio(true);
        } else {
          setAudioPath(null);
          setHasAudio(false);
        }
      } catch (err) {
        console.error('Failed to load audio path:', err);
        setError('Failed to load audio');
        setHasAudio(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadAudioPath();
  }, [transcriptId]);

  // Reset state when audio path changes
  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  }, [audioPath]);

  // Handle audio element events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      onTimeUpdate?.(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      onPlayStateChange?.(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPlayStateChange?.(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onPlayStateChange?.(false);
    };

    const handleError = (e) => {
      console.error('Audio error:', e);
      setError('Failed to load audio file');
      setHasAudio(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [audioPath, onTimeUpdate, onPlayStateChange]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    seekTo: (seconds) => {
      if (audioRef.current) {
        audioRef.current.currentTime = seconds;
        audioRef.current.play();
      }
    },
    play: () => audioRef.current?.play(),
    pause: () => audioRef.current?.pause(),
    getCurrentTime: () => audioRef.current?.currentTime || 0,
    getDuration: () => audioRef.current?.duration || 0,
    isPlaying: () => isPlaying
  }), [isPlaying]);

  // Control functions
  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  }, [isPlaying]);

  const handleSeek = useCallback((e) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    audioRef.current.currentTime = newTime;
  }, [duration]);

  const skipTime = useCallback((seconds) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
  }, [duration]);

  const changePlaybackRate = useCallback(() => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const newRate = rates[nextIndex];
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  }, [playbackRate]);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Don't render if no audio
  if (isLoading) {
    return null;
  }

  if (!hasAudio) {
    return null;
  }

  return (
    <div className={`bg-surface-secondary border-t border-border ${className}`}>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioPath ? `file://${audioPath}` : undefined}
        preload="metadata"
      />

      <div className="px-4 py-3">
        {/* Progress bar */}
        <div
          className="h-1.5 bg-surface-tertiary rounded-full cursor-pointer mb-3 group"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-primary rounded-full relative transition-all"
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Time display */}
          <div className="text-xs text-foreground-secondary font-mono min-w-[80px]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          {/* Center: Playback controls */}
          <div className="flex items-center gap-2">
            {/* Skip back 10s */}
            <button
              onClick={() => skipTime(-10)}
              className="p-1.5 hover:bg-surface-tertiary rounded-full transition-colors"
              title="Skip back 10 seconds"
            >
              <svg className="w-4 h-4 text-foreground-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12.5 8v-4l-6 6 6 6v-4" />
                <text x="14" y="14" fontSize="8" fill="currentColor" stroke="none">10</text>
              </svg>
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-2 bg-primary hover:bg-primary-hover rounded-full transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Skip forward 10s */}
            <button
              onClick={() => skipTime(10)}
              className="p-1.5 hover:bg-surface-tertiary rounded-full transition-colors"
              title="Skip forward 10 seconds"
            >
              <svg className="w-4 h-4 text-foreground-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11.5 8v-4l6 6-6 6v-4" />
                <text x="4" y="14" fontSize="8" fill="currentColor" stroke="none">10</text>
              </svg>
            </button>
          </div>

          {/* Right: Playback rate */}
          <button
            onClick={changePlaybackRate}
            className="text-xs font-medium text-foreground-secondary hover:text-foreground px-2 py-1 hover:bg-surface-tertiary rounded transition-colors min-w-[50px]"
            title="Change playback speed"
          >
            {playbackRate}x
          </button>
        </div>

        {error && (
          <div className="text-xs text-error mt-2">{error}</div>
        )}
      </div>
    </div>
  );
});

export default AudioPlayer;
