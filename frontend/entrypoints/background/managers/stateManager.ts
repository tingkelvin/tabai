import { sendMessage } from '../types/messages';
import { AppState } from '../../content/types/AppState';
import { WIDGET_CONFIG } from '../../content/utils/constant';
import { isValidPage } from '../utils/pageUtils';

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
    pageState: '',

    // Agent state
    task: '',

    // UI state
    isMinimized: false,
    widgetSize: {
        width: WIDGET_CONFIG.DEFAULT_WIDTH,
        height: WIDGET_CONFIG.DEFAULT_HEIGHT,
    },
    iconPosition: {
        top: 50,
        left: 50
    },

    // Timestamps for state management
    lastUpdated: Date.now(),
    sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
});

export const stateManager = {
    state: createDefaultState(),
    listeners: new Set<(state: AppState) => void>(),

    // Get current state
    getState: (): AppState => ({ ...stateManager.state }),

    // Broadcast current state to all valid tabs
    broadcastToTabs: async (): Promise<void> => {
        try {
            const tabs = await chrome.tabs.query({});
            const validTabs = tabs.filter(tab => isValidPage(tab.url));

            console.log(`📡 Broadcasting to ${validTabs.length} valid tabs`);

            const broadcastPromises = validTabs.map(async (tab) => {
                try {
                    await sendMessage('updateAppState', stateManager.state, tab.id);
                    console.log(`✅ Broadcast successful to tab ${tab.id}: ${tab.url?.substring(0, 50)}...`);
                } catch (error) {
                    console.log(`⚠️ Broadcast failed to tab ${tab.id}: ${tab.url?.substring(0, 50)}...`);
                }
            });

            await Promise.allSettled(broadcastPromises);
        } catch (error) {
            console.error('❌ Failed to broadcast state:', error);
        }
    },

    // Update state and broadcast to all valid tabs
    updateState: async (updates: Partial<AppState>): Promise<void> => {
        console.log("updaing:", updates)
        const previousState = { ...stateManager.state };

        if (updates.useAgent === false) updates.task = ""

        stateManager.state = {
            ...stateManager.state,
            ...updates,
            lastUpdated: Date.now(),
        };

        console.log('🔄 State updated:', {
            previous: previousState,
            updates,
            new: stateManager.state
        });

        // Broadcast to all valid tabs
        await stateManager.broadcastToTabs();

        // Notify local listeners
        stateManager.listeners.forEach(listener => listener(stateManager.state));
    },

    // Set complete state (for loading from storage)
    setState: async (newState: AppState): Promise<void> => {
        stateManager.state = {
            ...newState,
            lastUpdated: Date.now(),
        };

        await stateManager.broadcastToTabs();
        stateManager.listeners.forEach(listener => listener(stateManager.state));
    },

    // Specific state updaters with type safety
    updateChatState: async (updates: {
        chatMessages?: any[];
        isThinking?: boolean;
    }): Promise<void> => {
        console.log('🔄 Updating chat state:', updates);
        await stateManager.updateState(updates);
    },

    updateModeState: async (updates: {
        useSearch?: boolean;
        useAgent?: boolean;
    }): Promise<void> => {
        console.log('🔄 Updating mode state:', updates);
        await stateManager.updateState(updates);
    },

    updateFileState: async (updates: {
        uploadedFiles?: File[];
        fileContentAsString?: string;
    }): Promise<void> => {
        console.log('🔄 Updating file state:', updates);
        await stateManager.updateState(updates);
    },

    updateUIState: async (updates: {
        isMinimized?: boolean;
        widgetSize?: { width: number; height: number };
        iconPosition?: { top: number; left: number };
    }): Promise<void> => {
        console.log('🔄 Updating UI state:', updates);
        await stateManager.updateState(updates);
    },

    updateAgentState: async (updates: {
        task?: string;
        pageState?: any;
    }): Promise<void> => {
        console.log('🔄 Updating agent state:', updates);
        await stateManager.updateState(updates);
    },

    // Chat message operations
    addChatMessage: async (message: any): Promise<void> => {
        const newMessages = [...stateManager.state.chatMessages, message];
        await stateManager.updateChatState({ chatMessages: newMessages });
    },

    clearChatMessages: async (): Promise<void> => {
        await stateManager.updateChatState({ chatMessages: [] });
    },

    // Thinking state operations
    setThinking: async (isThinking: boolean): Promise<void> => {
        console.log(`🤔 Setting thinking state: ${isThinking}`);
        // Use updateState directly to avoid potential chat state conflicts
        await stateManager.updateState({ isThinking });
    },

    setTask: async (task: string): Promise<void> => {
        console.log(`🤔 Setting task state: ${task}`);
        // Use updateState directly to avoid potential chat state conflicts
        await stateManager.updateState({ task });
    },

    // Reset to default state
    resetState: async (): Promise<void> => {
        console.log('🔄 Resetting state to default');
        await stateManager.setState(createDefaultState());
    },

    // Add state change listener
    addListener: (listener: (state: AppState) => void): void => {
        stateManager.listeners.add(listener);
    },

    // Remove state change listener
    removeListener: (listener: (state: AppState) => void): void => {
        stateManager.listeners.delete(listener);
    },

    // Export state as JSON
    exportState: (): string => {
        return JSON.stringify(stateManager.state, null, 2);
    },

    // Import state from JSON
    importState: async (jsonState: string): Promise<boolean> => {
        try {
            const parsed = JSON.parse(jsonState);
            // Add validation here if needed
            await stateManager.setState(parsed);
            return true;
        } catch (error) {
            console.error('❌ Failed to import state:', error);
            return false;
        }
    },

    // Force broadcast to all tabs (useful for debugging)
    forceBroadcast: async (): Promise<void> => {
        console.log('🔊 Force broadcasting current state');
        await stateManager.broadcastToTabs();
    },

    // Get state statistics
    getStateStats: () => ({
        messageCount: stateManager.state.chatMessages.length,
        fileCount: stateManager.state.uploadedFiles.length,
        isThinking: stateManager.state.isThinking,
        lastUpdated: new Date(stateManager.state.lastUpdated).toLocaleString(),
        sessionId: stateManager.state.sessionId,
        stateAge: Date.now() - stateManager.state.lastUpdated,
    })
};

export default stateManager;