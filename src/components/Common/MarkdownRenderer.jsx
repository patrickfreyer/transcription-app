import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * MarkdownRenderer - Renders markdown content with proper formatting
 * Supports GitHub Flavored Markdown (GFM) including tables, task lists, etc.
 */
function MarkdownRenderer({ content, className = '' }) {
  // Handle empty or undefined content
  if (!content || typeof content !== 'string') {
    return (
      <div className="text-foreground-secondary italic text-sm">
        No content available
      </div>
    );
  }

  try {
    return (
      <ReactMarkdown
        className={`markdown-content ${className}`}
        remarkPlugins={[remarkGfm]}
        components={{
        // Headings
        h1: ({ node, ...props }) => (
          <h1 className="text-2xl font-bold text-foreground mt-4 mb-3 border-b border-border pb-2 first:mt-0" {...props} />
        ),
        h2: ({ node, ...props }) => (
          <h2 className="text-xl font-bold text-foreground mt-4 mb-2 border-b border-border pb-2 first:mt-0" {...props} />
        ),
        h3: ({ node, ...props }) => (
          <h3 className="text-lg font-semibold text-foreground mt-3 mb-2 first:mt-0" {...props} />
        ),
        h4: ({ node, ...props }) => (
          <h4 className="text-base font-semibold text-foreground mt-3 mb-2 first:mt-0" {...props} />
        ),
        h5: ({ node, ...props }) => (
          <h5 className="text-sm font-semibold text-foreground mt-2 mb-1 first:mt-0" {...props} />
        ),
        h6: ({ node, ...props }) => (
          <h6 className="text-xs font-semibold text-foreground mt-2 mb-1 first:mt-0" {...props} />
        ),

        // Paragraphs
        p: ({ node, ...props }) => (
          <p className="text-sm text-foreground leading-relaxed mb-3 last:mb-0" {...props} />
        ),

        // Lists
        ul: ({ node, ...props }) => (
          <ul className="list-disc list-inside text-sm text-foreground mb-3 ml-4 space-y-1 last:mb-0" {...props} />
        ),
        ol: ({ node, ...props }) => (
          <ol className="list-decimal list-inside text-sm text-foreground mb-3 ml-4 space-y-1 last:mb-0" {...props} />
        ),
        li: ({ node, ...props }) => (
          <li className="text-sm leading-relaxed" {...props} />
        ),

        // Links
        a: ({ node, ...props }) => (
          <a
            className="text-primary hover:underline font-medium"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          />
        ),

        // Code blocks
        code: ({ node, inline, ...props }) => {
          if (inline) {
            return (
              <code
                className="bg-surface-tertiary text-primary px-1.5 py-0.5 rounded text-xs font-mono"
                {...props}
              />
            );
          }
          return (
            <code
              className="block bg-surface-tertiary text-foreground p-3 rounded-lg overflow-x-auto text-xs font-mono leading-relaxed mb-3 border border-border"
              {...props}
            />
          );
        },

        // Pre blocks (wraps code blocks)
        pre: ({ node, ...props }) => (
          <pre className="mb-3 last:mb-0" {...props} />
        ),

        // Blockquotes
        blockquote: ({ node, ...props }) => (
          <blockquote
            className="border-l-4 border-primary pl-4 py-2 my-3 italic text-foreground-secondary bg-surface-secondary rounded-r"
            {...props}
          />
        ),

        // Tables
        table: ({ node, ...props }) => (
          <div className="overflow-x-auto mb-3 last:mb-0">
            <table className="min-w-full border border-border text-sm rounded-lg" {...props} />
          </div>
        ),
        thead: ({ node, ...props }) => (
          <thead className="bg-surface-secondary border-b border-border" {...props} />
        ),
        tbody: ({ node, ...props }) => (
          <tbody {...props} />
        ),
        tr: ({ node, ...props }) => (
          <tr className="border-b border-border last:border-b-0" {...props} />
        ),
        th: ({ node, ...props }) => (
          <th className="px-3 py-2 text-left font-semibold text-foreground" {...props} />
        ),
        td: ({ node, ...props }) => (
          <td className="px-3 py-2 text-foreground" {...props} />
        ),

        // Horizontal rule
        hr: ({ node, ...props }) => (
          <hr className="my-4 border-t border-border" {...props} />
        ),

        // Images
        img: ({ node, ...props }) => (
          <img className="max-w-full h-auto rounded-lg my-3" alt="" {...props} />
        ),

        // Strong/Bold
        strong: ({ node, ...props }) => (
          <strong className="font-bold text-foreground" {...props} />
        ),

        // Emphasis/Italic
        em: ({ node, ...props }) => (
          <em className="italic" {...props} />
        ),

        // Strikethrough (GFM)
        del: ({ node, ...props }) => (
          <del className="line-through text-foreground-secondary" {...props} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
    );
  } catch (error) {
    console.error('MarkdownRenderer error:', error);
    return (
      <div className="text-error p-3 bg-error/10 border border-error/30 rounded-lg">
        <p className="font-semibold text-sm">Error rendering markdown:</p>
        <p className="text-xs mt-1">{error.message}</p>
        <pre className="mt-2 text-xs bg-surface p-2 rounded overflow-auto max-h-32 text-foreground">
          {content}
        </pre>
      </div>
    );
  }
}

export default MarkdownRenderer;
