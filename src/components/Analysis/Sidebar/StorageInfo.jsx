import React from 'react';
import { useApp } from '../../../context/AppContext';

function StorageInfo() {
  const { transcripts } = useApp();

  const totalCount = transcripts.length;
  const totalDuration = transcripts.reduce((sum, t) => sum + (t.duration || 0), 0);
  const totalSize = transcripts.reduce((sum, t) => sum + (t.fileSize || 0), 0);

  return (
    <div className="px-4 py-2.5 bg-surface-tertiary">
      <div className="text-xs text-foreground-secondary flex items-center justify-between gap-3">
        <span className="font-medium text-foreground-secondary">{totalCount} transcript{totalCount !== 1 ? 's' : ''}</span>
        <span>•</span>
        <span>{Math.floor(totalDuration / 60)} min</span>
        {totalSize > 0 && (
          <>
            <span>•</span>
            <span>{totalSize.toFixed(1)} MB</span>
          </>
        )}
      </div>
    </div>
  );
}

export default StorageInfo;
