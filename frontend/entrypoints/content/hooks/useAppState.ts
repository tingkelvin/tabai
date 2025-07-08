import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, defaultAppState } from '@/common/types/AppState';
import { Position } from '../types';
import { sendMessage, onMessage } from '@/entrypoints/background/types/messages';
import { PageState } from '../types/page';

// Load state from memory
const loadState = async (): Promise<AppState> => {
    try {
        console.log('🔄 [AppState] Loading state from background...');
        const stored = await sendMessage('loadAppState');

        if (!stored) {
            console.log('📝 [AppState] No stored state found, using default state');
            return defaultAppState;
        }

        console.log('✅ [AppState] Successfully loaded state:', {
            sessionId: stored.sessionId,
            lastUpdated: new Date(stored.lastUpdated).toLocaleString(),
            chatMessages: stored.chatMessages?.length || 0,
            isMinimized: stored.isMinimized
        });
        return stored;
    } catch (error) {
        console.error('❌ [AppState] Failed to load state:', error);
        return defaultAppState;
    }
};

// Save state to memory
export const useAppState = (initialState?: Partial<AppState>) => {
    const [state, setState] = useState<AppState>(() => defaultAppState);
    const lastSavedState = useRef<AppState | null>(null);

    useEffect(() => {
        const initializeState = async () => {
            console.log('🚀 [AppState] Initializing state...');
            const loadedState = await loadState();

            if (loadedState) {
                setState(loadedState);
                console.log('🎯 [AppState] State initialization complete');
            }
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
            chatMessages: state.chatMessages?.length || 0,
            hasPageState: !!state.pageStateAsString
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
    const updatePageState = useCallback((updates: {
        pageState: PageState;
    }) => {
        console.log('🌐 [AppState] Updating page state:', {
            hasRoot: !!updates.pageState.domSnapshot?.root,
            url: updates.pageState.url || 'unknown'
        });

        if (updates.pageState.domSnapshot?.root) {
            const elementsString = updates.pageState.domSnapshot?.root.clickableElementsToString();
            console.log('📋 [AppState] Generated clickable elements string:', {
                length: elementsString?.length || 0
            });
            updateState({ pageStateAsString: elementsString });
        }
    }, [updateState]);

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
        pageState?: any;
    }) => {
        console.log('🤖 [AppState] Updating agent state:', {
            hasTask: !!updates.task,
            taskLength: updates.task?.length || 0,
            hasPageState: !!updates.pageState
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
        console.log('👂 [AppState] Setting up message listener for state updates');
        onMessage('updateAppState', (message) => {
            console.log('📨 [AppState] Received state update from background:', {
                sessionId: message.data.sessionId,
                timestamp: new Date().toLocaleString(),
                messageKeys: Object.keys(message.data)
            });
            setState(message.data); // Direct AppState object
        });
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            console.log('🧽 [AppState] Component unmounting, performing cleanup');
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                console.log('💾 [AppState] Saving final state before unmount');
                saveState(state);
            }
        };
    }, [state]);

    const stateAge = Date.now() - state.lastUpdated;
    console.log('📈 [AppState] Current state age:', {
        ageMs: stateAge,
        ageSeconds: Math.round(stateAge / 1000),
        isLoaded: state.sessionId !== ''
    });

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
        updatePageState,

        // State management
        clearState,

        // Utilities
        isStateLoaded: state.sessionId !== '',
        stateAge: stateAge,
    };
};