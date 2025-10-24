import React from 'react';
import { useApp } from '../../../context/AppContext';

function FilterTabs() {
  const { filterMode, setFilterMode } = useApp();

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'starred', label: 'Starred' },
    { id: 'recent', label: 'Recent' }
  ];

  return (
    <div className="flex items-center bg-surface-tertiary p-2 gap-1">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setFilterMode(tab.id)}
          className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            filterMode === tab.id
              ? 'bg-primary text-white shadow-sm'
              : 'text-foreground-secondary hover:bg-surface-secondary hover:text-foreground'
          }`}
        >
          {tab.id === 'starred' && (
            <svg className="w-4 h-4 inline mr-1" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          )}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default FilterTabs;
