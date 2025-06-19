export interface ContentAppProps {
    title?: string;
}

export interface TerminalIconProps {
    isTyping: boolean;
}

export interface TerminalHeaderProps {
    dragging: boolean;
    startDrag: (e: React.MouseEvent) => void;
    handleMinimize: () => void;
    handleClose?: () => void;
    title: string;
    currentUrl?: string;
}