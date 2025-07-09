import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, defaultAppState } from '@/common/types/AppState';
import { Position } from '../types';
import { sendMessage, onMessage } from '@/entrypoints/background/types/messages';

// Load state from memory
const loadState = async (): Promise<AppState> => {
    try {
        console.log('🔄 [AppState] Loading state from background...');
        const stored = await sendMessage('loadAppState');

        if (!stored) {
            console.log('📝 [AppState] No stored state found, using default state');
            return defaultAppState;
        }

        console.log('✅ [AppState] Successfully loaded state:', stored);
        return stored;
    } catch (error) {
        console.error('❌ [AppState] Failed to load state:', error);
        return defaultAppState;
    }
};

// Save state to memory
export const useAppState = () => {
    const [state, setState] = useState<AppState>(() => defaultAppState);
    const lastSavedState = useRef<AppState | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);


    useEffect(() => {
        const initializeState = async () => {
            console.log('🚀 [AppState] Initializing state...');
            const loadedState = await loadState();

            if (loadedState) {
                setState(loadedState);
                console.log('🎯 [AppState] State initialization complete');
            }
            setIsInitialized(true);
        };
        initializeState();

    }, []);

    const saveState = (state: AppState): void => {
        // Skip if state hasn't meaningfully changed
        if (JSON.stringify(state) === JSON.stringify(lastSavedState.current)) {
            console.log('⏭️  [AppState] State unchanged, skipping save');
            return;
        }

        lastSavedState.current = state;
        console.log('💾 [AppState] Saving state to background:', {
            sessionId: state.sessionId,
            timestamp: new Date().toLocaleString(),
            chatMessages: state.chatMessages?.length || 0
        });
        sendMessage('saveAppState', { ...state, lastUpdated: Date.now() });
    };

    const saveTimeoutRef = useRef<NodeJS.Timeout>(null);
    // Update state with automatic saving
    const updateState = useCallback((updates: Partial<AppState>) => {
        console.log('🔄 [AppState] Updating state with:', Object.keys(updates));
        setState(prevState => {
            const newState = {
                ...prevState,
                ...updates,
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
        console.log('💬 [AppState] Updating chat state:', {
            newMessagesCount: updates.chatMessages?.length || 0,
            isThinking: updates.isThinking,
            timestamp: new Date().toLocaleString()
        });

        if (updates.chatMessages) {
            console.log('📊 [AppState] Chat messages details:', {
                total: updates.chatMessages.length,
                lastMessageType: updates.chatMessages[updates.chatMessages.length - 1]?.type || 'unknown'
            });
        }
        updateState(updates);
    }, [updateState]);

    const updateModeState = useCallback((updates: {
        useSearch?: boolean;
        useAgent?: boolean;
    }) => {
        console.log('⚙️  [AppState] Updating mode state:', {
            useSearch: updates.useSearch,
            useAgent: updates.useAgent
        });
        updateState(updates);
    }, [updateState]);

    const updateFileState = useCallback((updates: {
        fileContentAsString?: string;
    }) => {
        console.log('📄 [AppState] Updating file state:', {
            hasContent: !!updates.fileContentAsString,
            contentLength: updates.fileContentAsString?.length || 0
        });
        updateState(updates);
    }, [updateState]);

    const updateUIState = useCallback((updates: {
        isMinimized?: boolean;
        widgetSize?: { width: number; height: number };
        iconPosition?: Position;
    }) => {
        console.log('🎨 [AppState] Updating UI state:', {
            isMinimized: updates.isMinimized,
            widgetSize: updates.widgetSize,
            iconPosition: updates.iconPosition
        });
        updateState(updates);
    }, [updateState]);

    const updateAgentState = useCallback((updates: {
        task?: string;
    }) => {
        console.log('🤖 [AppState] Updating agent state:', {
            hasTask: !!updates.task,
        });
        updateState(updates);
    }, [updateState]);

    // Clear state
    const clearState = useCallback(() => {
        console.log('🧹 [AppState] Clearing state, resetting to default');
        const newState = defaultAppState;
        setState(newState);
        saveState(newState);
        console.log('✅ [AppState] State cleared successfully');
    }, []);

    useEffect(() => {
        onMessage('updateAppState', (message) => {
            setState(message.data); // Direct AppState object
        });

        onMessage('getAppState', () => { return state })
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

    const stateAge = Date.now() - state.lastUpdated;

    return {
        // Current state
        state,
        isInitialized,

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

        // Utilities
        isStateLoaded: state.sessionId !== '',
        stateAge: stateAge,
    };
};