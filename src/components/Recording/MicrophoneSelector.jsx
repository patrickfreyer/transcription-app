import React, { useState, useEffect } from 'react';

/**
 * MicrophoneSelector Component
 * Allows users to choose which microphone input device to use for recording
 * @param {string} value - Current selected device ID
 * @param {function} onChange - Callback when selection changes
 * @param {boolean} disabled - Whether the selector is disabled
 */
function MicrophoneSelector({ value, onChange, disabled }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      setError(null);

      // Request microphone permission first to get device labels
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the stream immediately - we just needed permission
        stream.getTracks().forEach(track => track.stop());
      } catch (permError) {
        console.warn('Microphone permission needed for device labels:', permError);
      }

      // Enumerate devices
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices.filter(device => device.kind === 'audioinput');

      setDevices(audioInputs);

      // If no device selected, select the first one
      if (!value && audioInputs.length > 0) {
        onChange(audioInputs[0].deviceId);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading audio devices:', err);
      setError('Failed to load audio devices');
      setLoading(false);
    }
  };

  // Listen for device changes (plugging/unplugging devices)
  useEffect(() => {
    const handleDeviceChange = () => {
      console.log('Audio devices changed, reloading...');
      loadDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full">
        <label className="block text-xs font-medium text-foreground-secondary mb-1.5 text-center">
          Microphone Device
        </label>
        <div className="px-3 py-2 bg-surface-tertiary border border-border rounded-lg text-xs text-foreground-secondary text-center">
          Loading devices...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <label className="block text-xs font-medium text-foreground-secondary mb-1.5 text-center">
          Microphone Device
        </label>
        <div className="px-3 py-2 bg-error/10 border border-error/30 rounded-lg text-xs text-error text-center">
          {error}
        </div>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="w-full">
        <label className="block text-xs font-medium text-foreground-secondary mb-1.5 text-center">
          Microphone Device
        </label>
        <div className="px-3 py-2 bg-warning/10 border border-warning/30 rounded-lg text-xs text-warning text-center">
          No microphones detected
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <label className="block text-xs font-medium text-foreground-secondary mb-1.5 text-center">
        Microphone Device
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 pr-8 bg-surface border border-border rounded-lg text-xs font-medium text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:border-strong dark:bg-surface-secondary"
        >
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Microphone ${devices.indexOf(device) + 1}`}
            </option>
          ))}
        </select>
        {/* Custom dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg className="w-3 h-3 text-foreground-secondary" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
      {/* Device count indicator */}
      {devices.length > 1 && (
        <p className="mt-1 text-xs text-foreground-secondary text-center">
          {devices.length} device{devices.length > 1 ? 's' : ''} available
        </p>
      )}
    </div>
  );
}

export default MicrophoneSelector;
