// TerminalHeader.tsx
import React from 'react';
import { TerminalHeaderProps } from '../types/components';

const TerminalHeader: React.FC<TerminalHeaderProps> = ({
    dragging,
    startDrag,
    handleMinimize,
    handleClose,
    title,
    currentUrl
}) => {
    return (
        <div
            className={`terminal-header ${dragging ? 'dragging' : ''}`}
            onMouseDown={startDrag}
        >
            <div className="terminal-controls">
                <button
                    className="minimize-btn"
                    onClick={handleMinimize}
                    title="Minimize"
                />
            </div>
            <h3>{title || (currentUrl ? new URL(currentUrl).hostname : 'Terminal')}</h3>
        </div>
    );
};

export default TerminalHeader;