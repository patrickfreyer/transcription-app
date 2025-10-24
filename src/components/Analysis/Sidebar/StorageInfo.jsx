import React from 'react';
import { useApp } from '../../../context/AppContext';

function StorageInfo() {
  const { transcripts } = useApp();

  const totalCount = transcripts.length;
  const totalDuration = transcripts.reduce((sum, t) => sum + (t.duration || 0), 0);
  const totalSize = transcripts.reduce((sum, t) => sum + (t.fileSize || 0), 0);

  return (
    <div className="p-4 bg-gray-50">
      <div className="text-xs text-text-gray space-y-1">
        <div className="flex justify-between">
          <span>Total transcripts:</span>
          <span className="font-semibold text-text-dark">{totalCount}</span>
        </div>
        <div className="flex justify-between">
          <span>Total duration:</span>
          <span className="font-semibold text-text-dark">
            {Math.floor(totalDuration / 60)} min
          </span>
        </div>
        {totalSize > 0 && (
          <div className="flex justify-between">
            <span>Total size:</span>
            <span className="font-semibold text-text-dark">{totalSize.toFixed(1)} MB</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default StorageInfo;
