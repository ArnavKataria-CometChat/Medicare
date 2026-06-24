import React from 'react';

/**
 * Lightweight, dependency-free markdown renderer.
 *
 * Supports the common subset used by the health articles:
 *  - Headings (#, ##, ... ######)
 *  - Bold (**text** / __text__), italic (*text* / _text_), strikethrough (~~text~~)
 *  - Inline code (`code`) and fenced code blocks (```)
 *  - Unordered (-, *, +) and ordered (1.) lists
 *  - Blockquotes (>)
 *  - Horizontal rules (---, ***, ___)
 *  - Links ([label](url))
 *
 * Output is built as React elements (no dangerouslySetInnerHTML), so the
 * admin-authored content is rendered safely without injecting raw HTML.
 */

let keyCounter = 0;
const nextKey = () => `md-${keyCounter++}`;

// Parse inline markdown within a single block of text into React nodes.
const parseInline = (text) => {
  if (!text) return null;

  const nodes = [];
  // Alternation order = precedence: code, links, bold, italic, strikethrough.
  const pattern =
    /(`[^`]+`)|(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*|__[^_]+__)|(\*[^*\s][^*]*\*|_[^_\s][^_]*_)|(~~[^~]+~~)/g;

  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];

    if (match[1]) {
      nodes.push(
        <code key={nextKey()} className="md-inline-code">
          {token.slice(1, -1)}
        </code>
      );
    } else if (match[2]) {
      const link = /\[([^\]]+)\]\(([^)]+)\)/.exec(token);
      nodes.push(
        <a key={nextKey()} href={link[2]} target="_blank" rel="noopener noreferrer">
          {link[1]}
        </a>
      );
    } else if (match[3]) {
      nodes.push(<strong key={nextKey()}>{parseInline(token.slice(2, -2))}</strong>);
    } else if (match[4]) {
      nodes.push(<em key={nextKey()}>{parseInline(token.slice(1, -1))}</em>);
    } else if (match[5]) {
      nodes.push(<del key={nextKey()}>{token.slice(2, -2)}</del>);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
};

const Markdown = ({ children }) => {
  const source = typeof children === 'string' ? children : '';
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  const paragraph = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(
        <p key={nextKey()} className="md-p">
          {parseInline(paragraph.join(' '))}
        </p>
      );
      paragraph.length = 0;
    }
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Fenced code block
    if (/^```/.test(trimmed)) {
      flushParagraph();
      const codeLines = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push(
        <pre key={nextKey()} className="md-pre">
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Blank line ends a paragraph
    if (trimmed === '') {
      flushParagraph();
      i++;
      continue;
    }

    // Heading (shift down one level so it never competes with the article's h1 title)
    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      const Tag = `h${Math.min(level + 1, 6)}`;
      blocks.push(
        React.createElement(
          Tag,
          { key: nextKey(), className: `md-h md-h${level}` },
          parseInline(heading[2])
        )
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushParagraph();
      blocks.push(<hr key={nextKey()} className="md-hr" />);
      i++;
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(trimmed)) {
      flushParagraph();
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quote.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push(
        <blockquote key={nextKey()} className="md-quote">
          {parseInline(quote.join(' '))}
        </blockquote>
      );
      continue;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(trimmed)) {
      flushParagraph();
      const items = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*+]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={nextKey()} className="md-ul">
          {items.map((it) => (
            <li key={nextKey()}>{parseInline(it)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph();
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol key={nextKey()} className="md-ol">
          {items.map((it) => (
            <li key={nextKey()}>{parseInline(it)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Default: accumulate into the current paragraph
    paragraph.push(trimmed);
    i++;
  }

  flushParagraph();

  return <div className="markdown-body">{blocks}</div>;
};

export default Markdown;
