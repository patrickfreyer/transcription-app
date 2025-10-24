import React from 'react';
import SearchBar from './SearchBar';
import FilterTabs from './FilterTabs';
import TranscriptList from './TranscriptList';
import StorageInfo from './StorageInfo';

function TranscriptSidebar() {
  return (
    <div className="h-full flex flex-col bg-surface">
      <div className="flex-shrink-0 px-4 py-3 border-b border-border">
        <h2 className="text-lg font-semibold text-text-dark mb-2">Transcripts</h2>
        <SearchBar />
      </div>

      <div className="flex-shrink-0 border-b border-border">
        <FilterTabs />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <TranscriptList />
      </div>

      <div className="flex-shrink-0 border-t border-border">
        <StorageInfo />
      </div>
    </div>
  );
}

export default TranscriptSidebar;
