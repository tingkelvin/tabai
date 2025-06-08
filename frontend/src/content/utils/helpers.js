import React from 'react';
import { WIDGET_CONFIG } from './constants';

export const calculateInitialPositions = () => {
  const widgetPosition = {
    top: WIDGET_CONFIG.MARGINS.DEFAULT,
    left: window.innerWidth - WIDGET_CONFIG.DEFAULT_WIDTH - WIDGET_CONFIG.MARGINS.DEFAULT
  };

  const iconPosition = {
    top: WIDGET_CONFIG.MARGINS.DEFAULT,
    left: window.innerWidth - WIDGET_CONFIG.ICON_SIZE - WIDGET_CONFIG.MARGINS.DEFAULT
  };

  return { widgetPosition, iconPosition };
};

// Helper function to convert time string (e.g., "1:23") to seconds
export const parseTimeToSeconds = (timeString) => {
  if (!timeString) return 0;
  
  const parts = timeString.split(':').map(part => parseInt(part, 10));
  
  if (parts.length === 2) {
    // MM:SS format
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    // HH:MM:SS format
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  
  return 0;
};

export const parseMessageContent = (messageText) => {
  const lines = messageText.split('\n');
  let inCodeBlock = false;
  let currentCodeBlock = [];
  let language = '';
  const parsedElements = [];
  let keyCounter = 0;
  
  // Group consecutive bullet points into lists
  let currentList = [];
  let inList = false;

  const flushCurrentList = () => {
    if (currentList.length > 0) {
      parsedElements.push(
        <ul key={`list-${keyCounter++}`}>
          {currentList.map((item, index) => (
            <li key={`list-item-${keyCounter++}-${index}`}>
              {parseMarkdownLine(item)}
            </li>
          ))}
        </ul>
      );
      currentList = [];
      inList = false;
    }
  };

  lines.forEach(line => {
    if (line.trim().startsWith('```')) {
      // Flush any current list before code block
      flushCurrentList();
      
      if (inCodeBlock) {
        // End of code block
        parsedElements.push(
          <pre key={`code-block-${keyCounter++}`}>
            <code className={language ? `language-${language}` : ''}>
              {currentCodeBlock.join('\n')}
            </code>
          </pre>
        );
        inCodeBlock = false;
        currentCodeBlock = [];
        language = '';
      } else {
        // Start of code block
        inCodeBlock = true;
        language = line.trim().substring(3).trim();
      }
    } else if (inCodeBlock) {
      currentCodeBlock.push(line);
    } else {
      // Check if this is a bullet point
      const isBulletPoint = line.trim().startsWith('• ') || line.trim().startsWith('* ');
      
      if (isBulletPoint) {
        const bulletContent = line.trim().substring(2);
        currentList.push(bulletContent);
        inList = true;
      } else {
        // Not a bullet point, flush any current list
        flushCurrentList();
        
        // Handle empty lines
        if (!line.trim()) {
          parsedElements.push(
            <p key={`empty-${keyCounter++}`}>&nbsp;</p>
          );
        } else {
          // Regular paragraph
          parsedElements.push(
            <p key={`paragraph-${keyCounter++}`}>
              {parseMarkdownLine(line)}
            </p>
          );
        }
      }
    }
  });

  // Flush any remaining list at the end
  flushCurrentList();

  // Handle case where message ends with an open code block
  if (inCodeBlock && currentCodeBlock.length > 0) {
    parsedElements.push(
      <pre key={`code-block-${keyCounter++}`}>
        <code className={language ? `language-${language}` : ''}>
          {currentCodeBlock.join('\n')}
        </code>
      </pre>
    );
  }

  return parsedElements;
};

export const parseMarkdownLine = (line) => {
  if (!line) return '';
  
  const parts = [];
  let currentText = line;
  let keyCounter = 0;

  // Process bold text **text**
  currentText = currentText.replace(/\*\*(.*?)\*\*/g, (match, content) => {
    const placeholder = `__BOLD_${keyCounter}__`;
    parts.push({ type: 'bold', content, placeholder, key: keyCounter });
    keyCounter++;
    return placeholder;
  });

  // Process italic text *text* (but not bullet points)
  currentText = currentText.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, (match, content) => {
    const placeholder = `__ITALIC_${keyCounter}__`;
    parts.push({ type: 'italic', content, placeholder, key: keyCounter });
    keyCounter++;
    return placeholder;
  });

  // Process inline code `text`
  currentText = currentText.replace(/`([^`]+?)`/g, (match, content) => {
    const placeholder = `__CODE_${keyCounter}__`;
    parts.push({ type: 'code', content, placeholder, key: keyCounter });
    keyCounter++;
    return placeholder;
  });

  // Build result by replacing placeholders with React elements
  let result = [currentText];
  
  parts.forEach(part => {
    const newResult = [];
    result.forEach(item => {
      if (typeof item === 'string' && item.includes(part.placeholder)) {
        const splitItems = item.split(part.placeholder);
        for (let i = 0; i < splitItems.length; i++) {
          if (splitItems[i]) newResult.push(splitItems[i]);
          if (i < splitItems.length - 1) {
            switch (part.type) {
              case 'bold':
                newResult.push(
                  <strong key={`bold-${part.key}`} className="markdown-bold">
                    {part.content}
                  </strong>
                );
                break;
              case 'italic':
                newResult.push(
                  <em key={`italic-${part.key}`} className="markdown-italic">
                    {part.content}
                  </em>
                );
                break;
              case 'code':
                newResult.push(
                  <code key={`code-${part.key}`} className="markdown-code">
                    {part.content}
                  </code>
                );
                break;
            }
          }
        }
      } else {
        newResult.push(item);
      }
    });
    result = newResult;
  });

  return <>{result}</>;
};