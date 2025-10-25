import React from 'react';
import SearchBar from './Sidebar/SearchBar';
import FilterTabs from './Sidebar/FilterTabs';
import TranscriptList from './Sidebar/TranscriptList';
import StorageInfo from './Sidebar/StorageInfo';

/**
 * ListView - Shows list of transcripts in left panel
 * This is the default view for the left panel
 */
function ListView() {
  return (
    <div className="h-full flex flex-col bg-surface animate-fade-slide-in">
      {/* Row 1: Title Bar (48px fixed height) */}
      <div className="flex-shrink-0 h-12 px-4 flex items-center justify-between border-b border-border bg-surface">
        <h2 className="text-base font-semibold text-foreground">Transcripts</h2>
      </div>

      {/* Row 2: Search Toolbar */}
      <div className="flex-shrink-0 min-h-[60px] px-4 py-2 flex items-center border-b border-border bg-surface-secondary">
        <div className="w-full">
          <SearchBar />
        </div>
      </div>

      {/* Row 3: Filter Tabs */}
      <div className="flex-shrink-0 border-b border-border">
        <FilterTabs />
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
