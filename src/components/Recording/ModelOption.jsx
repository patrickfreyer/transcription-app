import React from 'react';

function ModelOption({ model, selected, onSelect, disabled }) {
  return (
    <label
      className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
        selected
          ? 'border-ios-blue bg-ios-blue/5'
          : 'border-bg-gray-200 bg-white hover:border-bg-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <input
        type="radio"
        name="model"
        checked={selected}
        onChange={() => !disabled && onSelect(model.id)}
        disabled={disabled}
        className="mt-0.5 w-4 h-4 text-ios-blue focus:ring-ios-blue focus:ring-2"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-text-dark">{model.name}</span>
          {model.badge && (
            <span className="px-2 py-0.5 text-xs font-medium bg-ios-blue/10 text-ios-blue rounded">
              {model.badge}
            </span>
          )}
        </div>
        <p className="text-xs text-text-gray leading-relaxed">{model.description}</p>
      </div>
    </label>
  );
}

export default ModelOption;
