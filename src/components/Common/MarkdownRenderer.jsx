import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * MarkdownRenderer - Renders markdown content with proper formatting
 * Supports GitHub Flavored Markdown (GFM) including tables, task lists, etc.
 */
function MarkdownRenderer({ content, className = '' }) {
  console.log('MarkdownRenderer - Content type:', typeof content);
  console.log('MarkdownRenderer - Content length:', content?.length);
  console.log('MarkdownRenderer - Content preview:', content?.substring(0, 100));

  // Handle empty or undefined content
  if (!content || typeof content !== 'string') {
    console.warn('MarkdownRenderer - Invalid content:', content);
    return (
      <div className="text-foreground-secondary italic">
        No content available
      </div>
    );
  }

  try {
    console.log('MarkdownRenderer - Rendering markdown...');
    return (
      <ReactMarkdown
        className={`markdown-content ${className}`}
        remarkPlugins={[remarkGfm]}
        components={{
        // Headings
        h1: ({ node, ...props }) => (
          <h1 className="text-2xl font-bold text-text-dark mt-6 mb-4 border-b border-border pb-2" {...props} />
        ),
        h2: ({ node, ...props }) => (
          <h2 className="text-xl font-bold text-text-dark mt-5 mb-3 border-b border-border pb-2" {...props} />
        ),
        h3: ({ node, ...props }) => (
          <h3 className="text-lg font-semibold text-text-dark mt-4 mb-2" {...props} />
        ),
        h4: ({ node, ...props }) => (
          <h4 className="text-base font-semibold text-text-dark mt-3 mb-2" {...props} />
        ),
        h5: ({ node, ...props }) => (
          <h5 className="text-sm font-semibold text-text-dark mt-3 mb-2" {...props} />
        ),
        h6: ({ node, ...props }) => (
          <h6 className="text-xs font-semibold text-text-dark mt-3 mb-2" {...props} />
        ),

        // Paragraphs
        p: ({ node, ...props }) => (
          <p className="text-sm text-text-dark leading-relaxed mb-4" {...props} />
        ),

        // Lists
        ul: ({ node, ...props }) => (
          <ul className="list-disc list-inside text-sm text-text-dark mb-4 ml-4 space-y-1" {...props} />
        ),
        ol: ({ node, ...props }) => (
          <ol className="list-decimal list-inside text-sm text-text-dark mb-4 ml-4 space-y-1" {...props} />
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
                className="bg-surface-secondary text-red-600 px-1.5 py-0.5 rounded text-xs font-mono"
                {...props}
              />
            );
          }
          return (
            <code
              className="block bg-foreground text-surface p-4 rounded-lg overflow-x-auto text-sm font-mono leading-relaxed mb-4"
              {...props}
            />
          );
        },

        // Pre blocks (wraps code blocks)
        pre: ({ node, ...props }) => (
          <pre className="mb-4" {...props} />
        ),

        // Blockquotes
        blockquote: ({ node, ...props }) => (
          <blockquote
            className="border-l-4 border-strong pl-4 py-2 my-4 italic text-foreground bg-surface-tertiary"
            {...props}
          />
        ),

        // Tables
        table: ({ node, ...props }) => (
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full border border-border text-sm" {...props} />
          </div>
        ),
        thead: ({ node, ...props }) => (
          <thead className="bg-surface-secondary border-b border-border" {...props} />
        ),
        tbody: ({ node, ...props }) => (
          <tbody {...props} />
        ),
        tr: ({ node, ...props }) => (
          <tr className="border-b border-border" {...props} />
        ),
        th: ({ node, ...props }) => (
          <th className="px-4 py-2 text-left font-semibold text-text-dark" {...props} />
        ),
        td: ({ node, ...props }) => (
          <td className="px-4 py-2 text-text-dark" {...props} />
        ),

        // Horizontal rule
        hr: ({ node, ...props }) => (
          <hr className="my-6 border-t border-border" {...props} />
        ),

        // Images
        img: ({ node, ...props }) => (
          <img className="max-w-full h-auto rounded-lg my-4" alt="" {...props} />
        ),

        // Strong/Bold
        strong: ({ node, ...props }) => (
          <strong className="font-bold text-text-dark" {...props} />
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
      <div className="text-red-600 p-4 bg-red-50 border border-red-200 rounded">
        <p className="font-semibold">Error rendering markdown:</p>
        <p className="text-sm">{error.message}</p>
        <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto max-h-40">
          {content}
        </pre>
      </div>
    );
  }
}

export default MarkdownRenderer;
