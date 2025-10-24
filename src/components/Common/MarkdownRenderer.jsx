import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

/**
 * MarkdownRenderer - Safe markdown rendering component
 *
 * Features:
 * - XSS-safe by default (no dangerouslySetInnerHTML)
 * - GitHub Flavored Markdown support (tables, strikethrough, task lists)
 * - Code blocks with language labels (no heavy syntax highlighting)
 * - External link handling for Electron
 * - Custom styling integration
 *
 * @param {string} content - Markdown content to render
 * @param {string} className - Additional CSS classes
 * @param {boolean} enableGFM - Enable GitHub Flavored Markdown (default: true)
 */
const MarkdownRenderer = ({
  content,
  className = '',
  enableGFM = true
}) => {

  // Handle external links in Electron
  const handleLinkClick = (e, href) => {
    e.preventDefault();

    // Open externally in Electron
    if (window.electron?.openExternal) {
      window.electron.openExternal(href);
    } else {
      // Fallback for web context
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  };

  // Custom component renderers
  const components = useMemo(() => ({
    // Links - open externally
    a: ({ node, href, children, ...props }) => (
      <a
        href={href}
        onClick={(e) => handleLinkClick(e, href)}
        className="text-primary hover:underline cursor-pointer"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    ),

    // Code blocks with language labels
    code: ({ node, inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';

      // Block code
      if (!inline && language) {
        return (
          <div className="my-3 rounded-lg overflow-hidden border border-border">
            <div className="bg-surface-secondary px-3 py-1 text-xs font-semibold text-foreground-secondary border-b border-border">
              {language}
            </div>
            <pre className="bg-surface-elevated p-4 overflow-x-auto">
              <code className="text-sm font-mono text-foreground" {...props}>
                {children}
              </code>
            </pre>
          </div>
        );
      }

      // Inline code
      return (
        <code
          className="bg-surface-secondary px-1.5 py-0.5 rounded text-sm font-mono text-foreground"
          {...props}
        >
          {children}
        </code>
      );
    },

    // Headings with proper styling
    h1: ({ node, children, ...props }) => (
      <h1 className="text-2xl font-bold mt-6 mb-3 text-foreground" {...props}>
        {children}
      </h1>
    ),
    h2: ({ node, children, ...props }) => (
      <h2 className="text-xl font-semibold mt-5 mb-2 text-foreground" {...props}>
        {children}
      </h2>
    ),
    h3: ({ node, children, ...props }) => (
      <h3 className="text-lg font-semibold mt-4 mb-2 text-foreground" {...props}>
        {children}
      </h3>
    ),
    h4: ({ node, children, ...props }) => (
      <h4 className="text-base font-semibold mt-3 mb-2 text-foreground" {...props}>
        {children}
      </h4>
    ),
    h5: ({ node, children, ...props }) => (
      <h5 className="text-sm font-semibold mt-3 mb-2 text-foreground" {...props}>
        {children}
      </h5>
    ),
    h6: ({ node, children, ...props }) => (
      <h6 className="text-xs font-semibold mt-2 mb-2 text-foreground-secondary" {...props}>
        {children}
      </h6>
    ),

    // Lists
    ul: ({ node, children, ...props }) => (
      <ul className="list-disc list-outside ml-4 my-2 space-y-1 text-foreground" {...props}>
        {children}
      </ul>
    ),
    ol: ({ node, children, ...props }) => (
      <ol className="list-decimal list-outside ml-4 my-2 space-y-1 text-foreground" {...props}>
        {children}
      </ol>
    ),
    li: ({ node, children, ...props }) => (
      <li className="text-foreground" {...props}>
        {children}
      </li>
    ),

    // Blockquotes
    blockquote: ({ node, children, ...props }) => (
      <blockquote
        className="border-l-4 border-primary pl-4 italic text-foreground-secondary my-3"
        {...props}
      >
        {children}
      </blockquote>
    ),

    // Tables
    table: ({ node, children, ...props }) => (
      <div className="overflow-x-auto my-4">
        <table
          className="min-w-full border border-border rounded-lg text-foreground"
          {...props}
        >
          {children}
        </table>
      </div>
    ),
    thead: ({ node, children, ...props }) => (
      <thead className="bg-surface-secondary" {...props}>
        {children}
      </thead>
    ),
    tbody: ({ node, children, ...props }) => (
      <tbody {...props}>
        {children}
      </tbody>
    ),
    tr: ({ node, children, ...props }) => (
      <tr className="border-b border-border" {...props}>
        {children}
      </tr>
    ),
    th: ({ node, children, ...props }) => (
      <th
        className="font-semibold p-2 text-left border border-border text-foreground"
        {...props}
      >
        {children}
      </th>
    ),
    td: ({ node, children, ...props }) => (
      <td className="p-2 border border-border text-foreground" {...props}>
        {children}
      </td>
    ),

    // Horizontal rule
    hr: ({ node, ...props }) => (
      <hr className="border-border my-4" {...props} />
    ),

    // Paragraphs
    p: ({ node, children, ...props }) => (
      <p className="my-2 text-foreground leading-relaxed" {...props}>
        {children}
      </p>
    ),

    // Strong/bold
    strong: ({ node, children, ...props }) => (
      <strong className="font-semibold text-foreground" {...props}>
        {children}
      </strong>
    ),

    // Emphasis/italic
    em: ({ node, children, ...props }) => (
      <em className="italic text-foreground" {...props}>
        {children}
      </em>
    ),

    // Strikethrough (GFM)
    del: ({ node, children, ...props }) => (
      <del className="line-through text-foreground-secondary" {...props}>
        {children}
      </del>
    ),
  }), []);

  // Prepare remark plugins
  const remarkPlugins = useMemo(() => {
    const plugins = [];
    if (enableGFM) plugins.push(remarkGfm);
    plugins.push(remarkBreaks); // Convert line breaks to <br>
    return plugins;
  }, [enableGFM]);

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        components={components}
      >
        {content || ''}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
