import React, { useState, useRef, useEffect } from 'react';

/**
 * CompactDropdown - Streamlined dropdown for inline forms
 * More compact than the standard Dropdown component
 * Descriptions only shown in expanded state for space efficiency
 */
function CompactDropdown({ options, value, onChange, disabled, placeholder = 'Select an option', label }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOption = options.find(opt => opt.id === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (e, optionId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      onChange(optionId);
      setIsOpen(false);
    }
  };

  return (
    <div className="space-y-1">
      {/* Label */}
      {label && (
        <label className="text-xs font-semibold text-foreground-secondary uppercase tracking-wide">
          {label}
        </label>
      )}

      {/* Dropdown */}
      <div ref={dropdownRef} className="relative">
        {/* Trigger Button - Compact */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg border transition-all duration-200 text-left ${
            isOpen
              ? 'border-primary bg-primary/5 shadow-sm'
              : 'border-border bg-surface hover:border-strong'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selectedOption ? (
              <>
                <span className="text-xs font-medium text-foreground truncate">{selectedOption.name}</span>
                {selectedOption.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary rounded flex-shrink-0">
                    {selectedOption.badge}
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-foreground-secondary">{placeholder}</span>
            )}
          </div>
          <svg
            className={`w-3.5 h-3.5 text-foreground-secondary transition-transform duration-200 flex-shrink-0 ml-2 ${
              isOpen ? 'rotate-180' : ''
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

        {/* Dropdown Menu - Compact */}
        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-1 bg-surface border border-border rounded-lg shadow-lg overflow-hidden animate-slide-down">
            <div className="py-0.5 max-h-64 overflow-y-auto">
              {options.map((option) => {
                const isSelected = option.id === value;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={(e) => handleSelect(e, option.id)}
                    className={`w-full flex items-start gap-1.5 px-3 py-1.5 transition-colors text-left ${
                      isSelected
                        ? 'bg-primary/5'
                        : 'hover:bg-surface-tertiary'
                    }`}
                  >
                    {/* Checkmark */}
                    <div className="flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center mt-0.5">
                      {isSelected && (
                        <svg
                          className="w-3 h-3 text-primary"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>

                    {/* Option Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-xs font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                          {option.name}
                        </span>
                        {option.badge && (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary rounded flex-shrink-0">
                            {option.badge}
                          </span>
                        )}
                      </div>
                      {option.description && (
                        <p className="text-[11px] text-foreground-secondary leading-snug">{option.description}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Show selected option description below (optional hint) */}
      {selectedOption?.description && !isOpen && (
        <p className="text-[11px] text-foreground-tertiary leading-snug px-1">
          {selectedOption.description}
        </p>
      )}
    </div>
  );
}

export default CompactDropdown;
