import { ChatHookReturn, ChatMessage } from '../types/chat';

export interface ContentAppProps {
    customChatHook?: () => ChatHookReturn;
    title?: string
}

export interface TerminalIconProps {
    isTyping: boolean
    onClick?: (e: React.MouseEvent) => void
}

export interface TerminalHeaderProps {
    dragging: boolean
    startDrag: (e: React.MouseEvent) => void
    handleMinimize: (e: React.MouseEvent) => void
    handleClose?: () => void
    title: string
    currentUrl?: string
}

export interface ActionButton {
    id: string;
    icon?: React.ReactNode;
    label?: string;
    onClick: () => void;
    title?: string;
    disabled?: boolean;
    style?: React.CSSProperties;
    className?: string;
}

export interface ChatInputProps {
    fileActions?: ActionButton[];
    buttons?: ActionButton[];
    chatInputRef: React.RefObject<HTMLTextAreaElement | null>;
    chatInput: string;
    handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    handleKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export interface ChatHistoryProps {
    chatMessages: ChatMessage[];
    isTyping: boolean;
    chatMessagesRef: React.RefObject<HTMLDivElement | null>;
}
