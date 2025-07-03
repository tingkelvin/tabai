import { useState, useEffect, useCallback } from 'react';
import { onMessage, sendMessage } from '@/entrypoints/background/types/messages'

import { WIDGET_CONFIG } from '../utils/constant';
import { ContentAppState } from '@/entrypoints/background/types/state';

interface BackgroundStateHookReturn {
  state: ContentAppState;
  isLoading: boolean;
  updateState: (updates: Partial<ContentAppState>) => void;
  resetState: () => void;
}

const createDefaultState = (): ContentAppState => ({
  useSearch: false,
  useAgent: false,
  isMinimized: true,
  widgetSize: {
    width: WIDGET_CONFIG.DEFAULT_WIDTH,
    height: WIDGET_CONFIG.DEFAULT_HEIGHT,
  },
  chatMessages: [],
  chatInput: '',
  uploadedFiles: [],
  currentTask: '',
  iconPosition: { top: 20, left: 20 },
});

export const useBackgroundState = (): BackgroundStateHookReturn => {
  const [state, setState] = useState<ContentAppState>(createDefaultState);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize state from background
  useEffect(() => {
    const initializeState = async () => {
      try {
        const response = await sendMessage('getContentState', undefined);
        if (response?.state) {
          setState(prevState => ({
            ...prevState,
            ...response.state,
          }));
        }
      } catch (error) {
        console.warn('Failed to load state from background:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeState();
  }, []);

  // Listen for state updates from background
  useEffect(() => {
    const unsubscribe = onMessage('stateUpdate', ({ data }) => {
      setState(prevState => ({
        ...prevState,
        ...data.updates,
      }));
    });

    return unsubscribe;
  }, []);

  // Update state and sync with background
  const updateState = useCallback((updates: Partial<ContentAppState>) => {
    setState(prevState => {
      const newState = { ...prevState, ...updates };

      // Sync with background
      sendMessage('updateContentState', { updates }).catch(error => {
        console.warn('Failed to sync state with background:', error);
      });

      return newState;
    });
  }, []);

  // Reset to default state
  const resetState = useCallback(() => {
    const defaultState = createDefaultState();
    setState(defaultState);

    sendMessage('resetContentState', undefined).catch(error => {
      console.warn('Failed to reset state in background:', error);
    });
  }, []);

  return {
    state,
    isLoading,
    updateState,
    resetState,
  };
};