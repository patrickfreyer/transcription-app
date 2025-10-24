import React, { useState, useRef, useEffect } from 'react';

function Dropdown({ options, value, onChange, disabled, placeholder = 'Select an option' }) {
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
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all duration-200 text-left ${
          isOpen
            ? 'border-bcg-green bg-bcg-green/5 shadow-sm'
            : 'border-bg-gray-200 bg-white hover:border-bg-gray-300 hover:shadow-sm'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex-1 min-w-0">
          {selectedOption ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-dark">{selectedOption.name}</span>
              {selectedOption.badge && (
                <span className="px-2 py-0.5 text-xs font-medium bg-bcg-green/10 text-bcg-green rounded">
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-text-gray">{placeholder}</span>
          )}
          {selectedOption?.description && (
            <p className="text-xs text-text-gray mt-0.5 truncate">{selectedOption.description}</p>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-text-gray transition-transform duration-200 flex-shrink-0 ml-2 ${
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

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-bg-gray-200 rounded-xl shadow-lg overflow-hidden animate-slide-down">
          <div className="py-2">
            {options.map((option) => {
              const isSelected = option.id === value;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={(e) => handleSelect(e, option.id)}
                  className={`w-full flex items-start gap-3 px-4 py-3 transition-colors ${
                    isSelected
                      ? 'bg-bcg-green/5'
                      : 'hover:bg-bg-gray-50'
                  }`}
                >
                  {/* Checkmark */}
                  <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                    {isSelected && (
                      <svg
                        className="w-4 h-4 text-bcg-green"
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
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-medium ${isSelected ? 'text-bcg-green' : 'text-text-dark'}`}>
                        {option.name}
                      </span>
                      {option.badge && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-bcg-green/10 text-bcg-green rounded">
                          {option.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-gray leading-relaxed">{option.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dropdown;
