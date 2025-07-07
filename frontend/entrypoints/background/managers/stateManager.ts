import { onMessage, sendMessage } from '@/entrypoints/background/types/messages';
import { AppState } from '@/entrypoints/content/types/AppState';
import { isValidPage } from '@/entrypoints/background/utils/pageUtils';
import { WIDGET_CONFIG } from '@/entrypoints/content/utils/constant';
import { calculateInitialPositions } from '@/entrypoints/content/utils/helper';

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
    sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
});

let appStateStorage: AppState = createDefaultState()

// Background script state management
export const backgroundStateManager = {
    // Get current state
    getState: (): AppState | null => {
        return appStateStorage;
    },

    // Set state and broadcast to all tabs
    setState: async (newState: AppState): Promise<void> => {
        console.log('Setting app state in background:', newState);
        appStateStorage = newState;

        // Broadcast to all tabs
        await broadcastStateToAllTabs(newState);
    },

    // Update state partially and broadcast
    updateState: async (updates: Partial<AppState>): Promise<void> => {
        if (!appStateStorage) {
            console.warn('No existing state to update');
            return;
        }

        const newState = {
            ...appStateStorage,
            ...updates,
            lastUpdated: Date.now(),
        };

        await backgroundStateManager.setState(newState);
    },
};

// Broadcast state to all tabs using WXT messaging with page filtering
const broadcastStateToAllTabs = async (state: AppState): Promise<void> => {
    try {
        const tabs = await chrome.tabs.query({});
        const validTabs = tabs.filter(tab => isValidPage(tab.url));

        const broadcastPromises = validTabs.map(async (tab) => {
            if (!tab.id) return;

            try {
                // Using WXT messaging to send to specific tab
                await sendMessage('updateAppState', state, tab.id);
                console.log(`✅ Sent to tab ${tab.id}: ${tab.url}`);
            } catch (error) {
                console.log(`⚠️ Failed tab ${tab.id}: ${tab.url?.substring(0, 50)}...`);
            }
        });

        await Promise.allSettled(broadcastPromises);
        console.log(`📊 Broadcasted to ${validTabs.length}/${tabs.length} valid tabs`);
    } catch (error) {
        console.error('Error broadcasting state to tabs:', error);
    }
};

// Setup WXT message handlers
export const setupBackgroundMessageHandlers = () => {
    // Handle state load requests
    onMessage('loadAppState', async () => {
        console.log('Loading app state from background');
        return appStateStorage;
    });

    // Handle state save requests
    onMessage('saveAppState', async ({ data: state }) => {
        console.log('Saving app state to background:', state);
        await backgroundStateManager.setState(state);
    });

    // Handle partial state updates
    onMessage('updateAppState', async ({ data: updates }) => {
        console.log('Updating app state in background:', updates);
        await backgroundStateManager.updateState(updates);
    });

    // Handle external state updates
    onMessage('onUpdateAppState', async ({ data: state }) => {
        console.log('External update app state in background:', state);
        await backgroundStateManager.setState(state);
    });
};

// Initialize background state manager
setupBackgroundMessageHandlers();