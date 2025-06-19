export interface ContentAppProps {
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
