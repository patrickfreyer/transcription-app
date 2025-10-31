import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';

function SearchBar() {
  const { searchQuery, setSearchQuery } = useApp();
  const [localQuery, setLocalQuery] = useState('');

  const handleSearch = () => {
    setSearchQuery(localQuery);
  };

  const handleClear = () => {
    setLocalQuery('');
    setSearchQuery('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={localQuery}
        onChange={(e) => setLocalQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search transcripts..."
        className="w-full pl-10 pr-10 py-2 border border-border rounded-xl text-sm bg-surface text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      />
      <svg
        className="absolute left-3 top-2.5 w-5 h-5 text-foreground-tertiary"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      {localQuery && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-2.5 text-foreground-secondary hover:text-foreground transition-colors"
          title="Clear search"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default SearchBar;
