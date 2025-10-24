import React from 'react';
import { useApp } from '../../../context/AppContext';

/**
 * ContextChips - Display selected context transcripts as removable chips
 */
const ContextChips = () => {
  const {
    transcripts,
    selectedContextIds,
    setSelectedContextIds,
    selectedTranscript
  } = useApp();

  return (
    <div className="flex flex-wrap gap-2">
      {selectedContextIds.map(id => {
        const transcript = transcripts.find(t => t.id === id);
        if (!transcript) return null;

        return (
          <div
            key={id}
            className="inline-flex items-center gap-2 px-3 py-1 bg-primary bg-opacity-10 text-primary text-xs font-semibold rounded-full"
          >
            <span className="truncate max-w-[150px]">{transcript.fileName}</span>
            <button
              onClick={() => setSelectedContextIds(selectedContextIds.filter(cid => cid !== id))}
              className="hover:bg-primary hover:bg-opacity-20 rounded-full p-0.5 transition-all"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}

      {selectedContextIds.length === 0 && selectedTranscript && (
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
          <span className="truncate max-w-[150px]">{selectedTranscript.fileName}</span>
          <span className="text-gray-500">(current)</span>
        </div>
      )}
    </div>
  );
};

export default ContextChips;
