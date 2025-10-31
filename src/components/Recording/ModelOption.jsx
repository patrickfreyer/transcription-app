import React from 'react';

function ModelOption({ model, selected, onSelect, disabled }) {
  return (
    <label
      className={`flex items-start gap-3 p-4 rounded-xl border transition-all duration-200 ${
        selected
          ? 'border-primary bg-primary/5 dark:bg-primary/10'
          : 'border bg-surface hover:border-strong'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <input
        type="radio"
        name="model"
        checked={selected}
        onChange={() => !disabled && onSelect(model.id)}
        disabled={disabled}
        className="mt-0.5 w-4 h-4 text-primary focus:ring-primary focus:ring-2"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-foreground">{model.name}</span>
          {model.badge && (
            <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 dark:bg-primary/20 text-primary rounded">
              {model.badge}
            </span>
          )}
        </div>
        <p className="text-xs text-foreground-secondary leading-relaxed">{model.description}</p>
      </div>
    </label>
  );
}

export default ModelOption;
