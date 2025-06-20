import React, { useState } from 'react';
import { RemoveIcon } from './Icons';

interface ActionButton {
    id: string;
    icon?: React.ReactNode;
    label?: string;
    onClick: () => void;
    title?: string;
    disabled?: boolean;
    style?: React.CSSProperties;
    className?: string;
}

interface ChatInputProps {
    fileActions?: ActionButton[];
    buttons?: ActionButton[];
    chatInputRef: React.RefObject<HTMLTextAreaElement | null>;
    chatInput: string;
    handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    handleKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
    fileActions = [],
    buttons = [],
    chatInputRef,
    chatInput,
    handleInputChange,
    handleKeyPress
}) => {
    const [hoveredAction, setHoveredAction] = useState<string | null>(null);

    const isSquareButton = (action: ActionButton): boolean => {
        return !!(action.icon && (!action.label || action.label.length <= 1));
    };

    const renderActionButton = (action: ActionButton, index: number) => {
        const shouldBeSquare = isSquareButton(action);
        const isFileAction = action.className === 'file-action';
        const isHovered = hoveredAction === action.id;

        return (
            <button
                key={action.id || `${action.className}-${index}`}
                className={`custom-action-btn ${action.className || ''} ${shouldBeSquare ? 'square' : ''}`}
                onClick={action.onClick}
                title={isFileAction && isHovered ? 'Remove file' : action.title}
                disabled={action.disabled}
                style={action.style}
                data-single-icon={shouldBeSquare ? "true" : "false"}
                onMouseEnter={() => setHoveredAction(action.id)}
                onMouseLeave={() => setHoveredAction(null)}
            >
                {action.icon && (
                    <span className="action-icon">
                        {isFileAction && isHovered ? (
                            <RemoveIcon />
                        ) : (
                            action.icon
                        )}
                    </span>
                )}
                {action.label}
            </button>
        );
    };

    return (
        <div className="chat-input-container">
            <textarea
                ref={chatInputRef}
                className="chat-input"
                value={chatInput}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                rows={1}
                autoComplete="off"
                spellCheck="false"
            />

            {(fileActions.length > 0 || buttons.length > 0) && (
                <div className="actions-wrapper">
                    {fileActions.length > 0 && (
                        <div className="file-actions-container">
                            {fileActions.map((action, index) => renderActionButton(action, index))}
                        </div>
                    )}

                    {buttons.length > 0 && (
                        <div className="action-buttons-container">
                            {buttons.map((action, index) => renderActionButton(action, index))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ChatInput;