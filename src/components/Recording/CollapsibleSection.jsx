import React from 'react';

function CollapsibleSection({ title, isOpen, onToggle, children, disabled }) {
  return (
    <div className={`border border-border rounded-xl overflow-hidden transition-all duration-200 ${
      isOpen ? 'shadow-md' : 'shadow-sm'
    }`}>
      {/* Header */}
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-5 py-4 bg-surface-tertiary hover:bg-surface-secondary transition-all duration-200 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <span className="text-sm font-semibold text-text-dark">{title}</span>
        <svg
          className={`w-5 h-5 text-text-gray transition-all duration-300 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Content */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className={`p-5 bg-surface border-t border-border transition-opacity duration-300 ${
            isOpen ? 'opacity-100' : 'opacity-0'
          }`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CollapsibleSection;
