import React from 'react';
import SearchBar from './Sidebar/SearchBar';
import TranscriptList from './Sidebar/TranscriptList';
import StorageInfo from './Sidebar/StorageInfo';

/**
 * ListView - Shows list of transcripts in left panel
 * This is the default view for the left panel
 */
function ListView() {
  return (
    <div className="h-full flex flex-col bg-surface animate-fade-slide-in">
      {/* Row 1: Title Bar */}
      <div className="flex-shrink-0 h-10 px-4 flex items-center justify-between border-b border-border bg-surface">
        <h2 className="text-sm font-medium text-foreground">Transcripts</h2>
      </div>

      {/* Row 2: Search Toolbar */}
      <div className="flex-shrink-0 px-4 py-2.5 flex items-center border-b border-border bg-surface">
        <div className="w-full">
          <SearchBar />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <TranscriptList />
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-border">
        <StorageInfo />
      </div>
    </div>
  );
}

export default ListView;
