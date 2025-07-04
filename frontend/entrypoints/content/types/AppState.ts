import { Position } from "./widget";

export interface AppState {
    // Chat state
    chatMessages: any[];
    isThinking: boolean;

    // Mode states
    useSearch: boolean;
    useAgent: boolean;

    // File state
    uploadedFiles: File[];
    fileContentAsString: string;

    // Page state
    pageState: any;

    // Agent state
    currentTask: string;

    // UI state
    isMinimized: boolean;
    widgetSize: {
        width: number;
        height: number;
    };
    iconPosition: Position
    // Timestamps for state management
    lastUpdated: number;
    sessionId: string;
}