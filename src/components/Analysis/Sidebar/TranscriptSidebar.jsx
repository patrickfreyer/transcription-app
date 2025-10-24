import React from 'react';
import SearchBar from './SearchBar';
import FilterTabs from './FilterTabs';
import TranscriptList from './TranscriptList';
import StorageInfo from './StorageInfo';

function TranscriptSidebar() {
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex-shrink-0 p-4 border-b-2 border-gray-200">
        <h2 className="text-xl font-bold text-text-dark mb-3">Transcripts</h2>
        <SearchBar />
      </div>

      <div className="flex-shrink-0 border-b-2 border-gray-200">
        <FilterTabs />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <TranscriptList />
      </div>

      <div className="flex-shrink-0 border-t-2 border-gray-200">
        <StorageInfo />
      </div>
    </div>
  );
}

export default TranscriptSidebar;
