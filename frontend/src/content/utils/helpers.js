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

export const parseMarkdownLine = (line) => {
  // Handle empty lines
  if (!line.trim()) {
    return <span>&nbsp;</span>;
  }

  // Check if this is a bullet point
  const isBulletPoint = line.trim().startsWith('* ');
  let processedLine = line;
  
  if (isBulletPoint) {
    // Remove the '* ' and process the rest
    processedLine = line.trim().substring(2);
  }

  // Split the line into parts and process markdown
  const parts = [];
  let currentText = processedLine;
  let key = 0;

  // Process bold text **text**
  currentText = currentText.replace(/\*\*(.*?)\*\*/g, (match, content) => {
    const placeholder = `__BOLD_${key}__`;
    parts.push({ type: 'bold', content, placeholder, key });
    key++;
    return placeholder;
  });

  // Process italic text *text*
  currentText = currentText.replace(/\*(.*?)\*/g, (match, content) => {
    const placeholder = `__ITALIC_${key}__`;
    parts.push({ type: 'italic', content, placeholder, key });
    key++;
    return placeholder;
  });

  // Process inline code `text`
  currentText = currentText.replace(/`(.*?)`/g, (match, content) => {
    const placeholder = `__CODE_${key}__`;
    parts.push({ type: 'code', content, placeholder, key });
    key++;
    return placeholder;
  });

  // Split by placeholders and rebuild with React elements
  let result = [currentText];
  
  parts.forEach(part => {
    const newResult = [];
    result.forEach(item => {
      if (typeof item === 'string' && item.includes(part.placeholder)) {
        const splitItems = item.split(part.placeholder);
        for (let i = 0; i < splitItems.length; i++) {
          if (splitItems[i]) newResult.push(splitItems[i]);
          if (i < splitItems.length - 1) {
            // Add the formatted element
            if (part.type === 'bold') {
              newResult.push(<strong key={`bold-${part.key}`} className="markdown-bold">{part.content}</strong>);
            } else if (part.type === 'italic') {
              newResult.push(<em key={`italic-${part.key}`} className="markdown-italic">{part.content}</em>);
            } else if (part.type === 'code') {
              newResult.push(<code key={`code-${part.key}`} className="markdown-code">{part.content}</code>);
            }
          }
        }
      } else {
        newResult.push(item);
      }
    });
    result = newResult;
  });

  // Wrap in bullet point if needed
  if (isBulletPoint) {
    return (
      <div className="markdown-list-item">
        <span className="bullet-point">•</span>
        <span className="bullet-content">{result}</span>
      </div>
    );
  }

  return <span>{result}</span>;
};