import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';

function StorageInfo() {
  const { transcripts } = useApp();
  const [storageStats, setStorageStats] = useState(null);

  const totalCount = transcripts.length;
  const totalDuration = transcripts.reduce((sum, t) => sum + (t.duration || 0), 0);

  // Load actual storage stats from disk
  useEffect(() => {
    const loadStats = async () => {
      try {
        const result = await window.electron.getStorageStats();
        if (result.success) {
          setStorageStats(result.stats);
        }
      } catch (error) {
        console.error('Failed to load storage stats:', error);
      }
    };

    loadStats();
  }, [transcripts.length]); // Reload when transcript count changes

  return (
    <div className="px-4 py-2 bg-surface">
      <div className="text-xs text-foreground-tertiary flex items-center justify-center gap-2">
        <span>{totalCount} transcript{totalCount !== 1 ? 's' : ''}</span>
        <span>•</span>
        <span>{Math.floor(totalDuration / 60)} min</span>
        {storageStats && (
          <>
            <span>•</span>
            <span>{storageStats.totalSizeMB} MB storage</span>
          </>
        )}
      </div>
    </div>
  );
}

export default StorageInfo;
