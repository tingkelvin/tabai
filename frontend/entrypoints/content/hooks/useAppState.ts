import { useState, useEffect, useCallback, useRef } from 'react';
import { WIDGET_CONFIG } from '../utils/constant';
import { AppState } from '../types/AppState';
import { calculateInitialPositions } from '../utils/helper'
import { Position } from '../types';
import { sendMessage, onMessage } from '@/entrypoints/background/types/messages';


const STATE_STORAGE_KEY = 'contentapp_state';
const STATE_VERSION = '1.0.0';

// Generate unique session ID
const generateSessionId = (): string => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Default state factory
const createDefaultState = (): AppState => ({
    // Chat state
    chatMessages: [],
    isThinking: false,

    // Mode states
    useSearch: false,
    useAgent: false,

    // File state
    uploadedFiles: [],
    fileContentAsString: '',

    // Page state
    pageState: null,

    // Agent state
    currentTask: '',

    // UI state
    isMinimized: false,
    widgetSize: {
        width: WIDGET_CONFIG.DEFAULT_WIDTH,
        height: WIDGET_CONFIG.DEFAULT_HEIGHT,
    },
    iconPosition: calculateInitialPositions().iconPosition,

    // Timestamps for state management
    lastUpdated: Date.now(),
    sessionId: generateSessionId(),
});

// State validation
const validateState = (state: any): state is AppState => {
    if (!state || typeof state !== 'object') return false;

    const requiredFields = [
        'chatMessages', 'isThinking', 'useSearch', 'useAgent',
        'uploadedFiles', 'fileContentAsString', 'pageState',
        'currentTask', 'isMinimized', 'widgetSize', 'iconPosition',
        'lastUpdated', 'sessionId'
    ];

    return requiredFields.every(field => field in state);
};

// Load state from memory
const loadState = async (): Promise<AppState> => {
    try {
        const stored = await sendMessage('loadAppState');
        console.log("load state", stored)
        if (!stored || !validateState(stored)) {
            return createDefaultState();
        }
        return stored;
    } catch (error) {
        console.error('Failed to load state:', error);
        return createDefaultState();
    }
};



// Save state to memory


export const useAppState = (initialState?: Partial<AppState>) => {
    const [state, setState] = useState<AppState>(() => createDefaultState());
    const lastSavedState = useRef<AppState | null>(null);

    useEffect(() => {
        const initializeState = async () => {
            const loadedState = await loadState();
            if (loadedState) {
                setState(loadedState);
            }
        };
        initializeState();
    }, []);

    const saveState = (state: AppState): void => {
        // Skip if state hasn't meaningfully changed
        if (JSON.stringify(state) === JSON.stringify(lastSavedState.current)) {
            return;
        }

        lastSavedState.current = state;
        console.log("saving to background")
        sendMessage('saveAppState', { ...state, lastUpdated: Date.now() });
    };

    const saveTimeoutRef = useRef<NodeJS.Timeout>(null);
    // Update state with automatic saving
    const updateState = useCallback((updates: Partial<AppState> | ((prev: AppState) => Partial<AppState>)) => {
        console.log("sending updates")
        setState(prevState => {
            const newUpdates = typeof updates === 'function' ? updates(prevState) : updates;

            // Only process pageState if it exists and has the expected structure
            if (newUpdates.pageState?.domSnapshot?.root?.clickableElementsToString) {
                newUpdates.pageState = newUpdates.pageState.domSnapshot.root.clickableElementsToString();
            }

            const newState = {
                ...prevState,
                ...newUpdates,
                lastUpdated: Date.now(),
            };

            saveState(newState);
            return newState;
        });
    }, [saveState]);

    // Specific state updaters
    const updateChatState = useCallback((updates: {
        chatMessages?: any[];
        isThinking?: boolean;
    }) => {
        console.log('🔄 updateChatState called with:', updates);
        if (updates.chatMessages) {
            console.log('🔄 New chatMessages length:', updates.chatMessages.length);
        }
        updateState(updates);
    }, [updateState]);

    const updateModeState = useCallback((updates: {
        useSearch?: boolean;
        useAgent?: boolean;
    }) => {
        updateState(updates);
    }, [updateState]);

    const updateFileState = useCallback((updates: {
        uploadedFiles?: File[];
        fileContentAsString?: string;
    }) => {
        updateState(updates);
    }, [updateState]);

    const updateUIState = useCallback((updates: {
        isMinimized?: boolean;
        widgetSize?: { width: number; height: number };
        iconPosition?: Position;
    }) => {
        updateState(updates);
    }, [updateState]);

    const updateAgentState = useCallback((updates: {
        currentTask?: string;
        pageState?: any;
    }) => {
        updateState(updates);
    }, [updateState]);

    // Clear state
    const clearState = useCallback(() => {
        const newState = createDefaultState();
        setState(newState);
        saveState(newState);
    }, []);


    // Export state as JSON
    const exportState = useCallback(() => {
        return JSON.stringify(state, null, 2);
    }, [state]);

    // Import state from JSON
    const importState = useCallback((jsonState: string) => {
        try {
            const parsed = JSON.parse(jsonState);
            if (validateState(parsed)) {
                setState(parsed);
                saveState(parsed);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }, []);

    // Save immediately (bypass debounce)
    const saveImmediately = useCallback(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveState(state);
    }, [state]);

    useEffect(() => {
        onMessage('updateAppState', (message) => {
            setState(message.data); // Direct AppState object
        });
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveState(state);
            }
        };
    }, [state]);

    return {
        // Current state
        state,

        // State updaters
        updateState,
        updateChatState,
        updateModeState,
        updateFileState,
        updateUIState,
        updateAgentState,
        loadState,

        // State management
        clearState,
        exportState,
        importState,
        saveImmediately,

        // Utilities
        isStateLoaded: state.sessionId !== '',
        stateAge: Date.now() - state.lastUpdated,
    };
};