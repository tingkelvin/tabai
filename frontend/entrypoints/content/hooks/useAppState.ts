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

    const saveState = async (state: AppState): Promise<void> => {
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

        try {
            await sendMessage('saveAppState', { ...state, lastUpdated: Date.now() });
            console.log('✅ [AppState] State saved successfully');
        } catch (error) {
            console.error('❌ [AppState] Failed to save state:', error);
        }
    };

    const saveTimeoutRef = useRef<NodeJS.Timeout>(null);
    // Update state with automatic saving
    const updateState = useCallback(async (updates: Partial<AppState>) => {
        const newState = {
            ...state, // Get current state
            ...updates,
            lastUpdated: Date.now(),
        };

        setState(newState);
        await saveState(newState); // Now properly awaited
    }, [state]);

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

    const stateAge = Date.now() - state.lastUpdated;

    return {
        // Current state
        state,
        isInitialized,

        // State updaters
        updateState,
        loadState,

        // State management
        clearState,

        // Utilities
        isStateLoaded: state.sessionId !== '',
        stateAge: stateAge,
    };
};