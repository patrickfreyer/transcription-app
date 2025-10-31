import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

function SummaryTemplatesTab() {
  const { summaryTemplates, addTemplate, updateTemplate, deleteTemplate } = useApp();
  const [editingId, setEditingId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prompt: ''
  });

  const handleCreate = () => {
    setIsCreating(true);
    setFormData({ name: '', description: '', prompt: '' });
    setEditingId(null);
  };

  const handleEdit = (template) => {
    setEditingId(template.id);
    setFormData({
      name: template.name,
      description: template.description,
      prompt: template.prompt
    });
    setIsCreating(false);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({ name: '', description: '', prompt: '' });
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('Template name is required');
      return;
    }

    if (isCreating) {
      addTemplate({
        name: formData.name.trim(),
        description: formData.description.trim(),
        prompt: formData.prompt.trim()
      });
    } else if (editingId) {
      updateTemplate(editingId, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        prompt: formData.prompt.trim()
      });
    }

    handleCancel();
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      deleteTemplate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">Summary Templates</h3>
          <p className="text-sm text-foreground-secondary mt-1">
            Create custom templates to format your transcription summaries
          </p>
        </div>
        {!isCreating && !editingId && (
          <button
            onClick={handleCreate}
            className="px-4 py-2.5 rounded-xl bg-gradient-bcg text-white font-semibold text-sm transition-all hover:shadow-lg hover:scale-105 flex items-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Template
          </button>
        )}
      </div>

      {/* Template Editor (Create/Edit) */}
      {(isCreating || editingId) && (
        <div className="p-6 border border-primary/30 rounded-2xl bg-gradient-to-br from-primary/5 via-surface to-primary/5 space-y-4 animate-fade-in">
          <h4 className="text-lg font-bold text-foreground">
            {isCreating ? 'New Template' : 'Edit Template'}
          </h4>

          {/* Name Field */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Template Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Meeting Minutes"
              className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of what this template does"
              className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          {/* Prompt Field */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Summary Instructions
            </label>
            <textarea
              value={formData.prompt}
              onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
              placeholder="Provide instructions for how to summarize the transcription..."
              className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none transition-all"
              rows={6}
            />
            <p className="mt-2 text-xs text-foreground-secondary">
              These instructions will be sent to the AI along with the transcription to generate the summary
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-gradient-bcg text-white font-semibold text-sm transition-all hover:shadow-lg hover:scale-105"
            >
              {isCreating ? 'Create Template' : 'Save Changes'}
            </button>
            <button
              onClick={handleCancel}
              className="px-6 py-2.5 rounded-xl bg-surface-secondary hover:bg-surface-tertiary border border-strong text-foreground font-semibold text-sm transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Template List */}
      <div className="space-y-3">
        {summaryTemplates.map((template) => (
          <div
            key={template.id}
            className={`p-5 rounded-2xl border transition-all ${
              template.isDefault
                ? 'border-border bg-gradient-to-br from-surface-tertiary via-surface to-surface-tertiary'
                : 'border-border bg-surface hover:border-primary/30 hover:shadow-md'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-base font-bold text-foreground">{template.name}</h4>
                  {template.isDefault && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-surface-secondary text-foreground rounded-full">
                      Built-in
                    </span>
                  )}
                </div>
                {template.description && (
                  <p className="text-sm text-foreground-secondary mb-3">{template.description}</p>
                )}
                {template.prompt && (
                  <details className="mt-3">
                    <summary className="text-xs font-semibold text-primary cursor-pointer hover:text-primary-hover">
                      View Instructions
                    </summary>
                    <div className="mt-2 p-3 bg-surface-tertiary rounded-lg border border-border">
                      <p className="text-xs text-foreground whitespace-pre-wrap">{template.prompt}</p>
                    </div>
                  </details>
                )}
              </div>

              {/* Action Buttons (only for non-default templates) */}
              {!template.isDefault && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(template)}
                    className="p-2 rounded-lg text-foreground-secondary hover:text-primary hover:bg-primary/10 transition-all"
                    title="Edit template"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-2 rounded-lg text-foreground-secondary hover:text-error hover:bg-error/10 dark:hover:bg-error/20 transition-all"
                    title="Delete template"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SummaryTemplatesTab;
