// components/MessageContent.tsx
import React from 'react';

interface MessageContentProps {
    content: string;
}

interface MarkdownPart {
    type: 'bold' | 'italic' | 'code';
    content: string;
    placeholder: string;
    key: number;
}

const parseMarkdownLine = (line: string): React.ReactNode => {
    if (!line) return '';

    const parts: MarkdownPart[] = [];
    let currentText = line;
    let keyCounter = 0;

    // Process bold text **text**
    currentText = currentText.replace(/\*\*(.*?)\*\*/g, (match, content) => {
        const placeholder = `__BOLD_${keyCounter}__`;
        parts.push({ type: 'bold', content, placeholder, key: keyCounter });
        keyCounter++;
        return placeholder;
    });

    // Process italic text *text*
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

    let result: (string | React.ReactNode)[] = [currentText];

    parts.forEach(part => {
        const newResult: (string | React.ReactNode)[] = [];
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

const MessageContent: React.FC<MessageContentProps> = ({ content }) => {
    const lines = content.split('\n');
    let inCodeBlock = false;
    let currentCodeBlock: string[] = [];
    let language = '';
    const parsedElements: React.ReactNode[] = [];
    let keyCounter = 0;

    let currentList: string[] = [];

    const flushCurrentList = (): void => {
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
        }
    };

    lines.forEach(line => {
        if (line.trim().startsWith('```')) {
            flushCurrentList();

            if (inCodeBlock) {
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
                inCodeBlock = true;
                language = line.trim().substring(3).trim();
            }
        } else if (inCodeBlock) {
            currentCodeBlock.push(line);
        } else {
            const isBulletPoint = line.trim().startsWith('• ') || line.trim().startsWith('* ');

            if (isBulletPoint) {
                const bulletContent = line.trim().substring(2);
                currentList.push(bulletContent);
            } else {
                flushCurrentList();

                if (!line.trim()) {
                    parsedElements.push(<p key={`empty-${keyCounter++}`}>&nbsp;</p>);
                } else {
                    parsedElements.push(
                        <p key={`paragraph-${keyCounter++}`}>
                            {parseMarkdownLine(line)}
                        </p>
                    );
                }
            }
        }
    });

    flushCurrentList();

    if (inCodeBlock && currentCodeBlock.length > 0) {
        parsedElements.push(
            <pre key={`code-block-${keyCounter++}`}>
                <code className={language ? `language-${language}` : ''}>
                    {currentCodeBlock.join('\n')}
                </code>
            </pre>
        );
    }

    return <>{parsedElements}</>;
};

export default MessageContent;