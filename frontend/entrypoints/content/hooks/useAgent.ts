// hooks/useAgentActions.ts
import { useCallback, useRef, useEffect } from 'react';
import { PageState } from '../types/page';

import { removeHighlights, getClickableElementsFromDomTree, locateElement } from '../services/DomTreeService';

import { highlightElement } from '../utils/domUtils';
import { ElementDomNode } from '../types/dom/DomNode';
import { AgentResponse } from '../utils/prompMessages';

export interface AgentAction {
    id: number;
    type: 'click' | 'fill' | 'select';
    value?: string;
}

export interface UseAgentActionsConfig {
    pageState?: PageState | null;
    onActionExecuted?: (action: AgentAction) => void;
    onError?: (error: string) => void;
    actionDelay?: number; // Delay between actions in ms
}

export const useAgentActions = (config: UseAgentActionsConfig = {}) => {
    const {
        pageState,
        onActionExecuted,
        onError,
        actionDelay = 100
    } = config;

    const isExecutingRef = useRef(false);
    const currentActionIndexRef = useRef(0);
    const actionsQueueRef = useRef<AgentAction[]>([]);
    const setIconPositionRef = useRef<any>(null);
    const keyListenerRef = useRef<((event: KeyboardEvent) => void) | null>(null);

    // Execute a single action
    const executeAction = useCallback(async (action: AgentAction, setIconPosition: any): Promise<boolean> => {
        const { id, type, value } = action;
        console.log(action)

        try {
            // Get the element from pageState or DOM
            const elementDomNode: ElementDomNode | undefined = pageState?.domSnapshot?.selectorMap.get(id);
            if (!elementDomNode) {
                console.warn(`Element with id ${id} not found in page`);
                return false;
            }

            const element: Element | null = await locateElement(elementDomNode)

            if (!element) {
                console.warn(`Cannot locate element with id ${id} in page`);
                return false;
            }

            const rect = element.getBoundingClientRect();
            const top = Math.round(rect.top);
            const left = Math.round(rect.left);
            setIconPosition({ top, left });

            if (type == 'fill' || type == 'select')
                highlightElement(id, element, `${type} with '${value}'`)
            else
                highlightElement(id, element, 'click')

            switch (type) {
                case 'click':
                    console.log(`🤖 Clicking element ${id}`);

                    // Ensure element is HTMLElement for click functionality
                    if (element instanceof HTMLElement) {
                        try {
                            // Method 1: Standard click
                            element.click();
                        } catch (clickError) {
                            console.warn('Standard click failed, trying alternative methods:', clickError);

                            try {
                                // Method 2: Dispatch click event
                                const clickEvent = new MouseEvent('click', {
                                    bubbles: true,
                                    cancelable: true,
                                    view: window
                                });
                                element.dispatchEvent(clickEvent);
                            } catch (eventError) {
                                console.warn('Event dispatch failed, trying focus method:', eventError);

                                // Method 3: Focus and trigger
                                element.focus();
                                element.click();
                            }
                        }
                    } else {
                        console.warn(`Element ${id} is not an HTMLElement, cannot click`);
                        return false;
                    }
                    break;


                case 'fill':
                    if (value !== undefined) {
                        console.log(`🤖 Filling element ${id} with: ${value}`);
                        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
                            element.value = value;
                            // Trigger input event for React compatibility
                            element.dispatchEvent(new Event('input', { bubbles: true }));
                            element.dispatchEvent(new Event('change', { bubbles: true }));
                        } else {
                            console.warn(`Element ${id} is not an input field`);
                            return false;
                        }
                    } else {
                        console.warn(`No value provided for fill action on element ${id}`);
                        return false;
                    }
                    break;

                case 'select':
                    if (value !== undefined) {
                        console.log(`🤖 Selecting ${value} in element ${id}`);
                        if (element instanceof HTMLSelectElement) {
                            element.value = value;
                            element.dispatchEvent(new Event('change', { bubbles: true }));
                        } else {
                            console.warn(`Element ${id} is not a select element`);
                            return false;
                        }
                    } else {
                        console.warn(`No value provided for select action on element ${id}`);
                        return false;
                    }
                    break;

                default:
                    console.warn(`Unknown action type: ${type}`);
                    return false;
            }

            // Callback for successful action
            onActionExecuted?.(action);
            return true;

        } catch (error) {
            const errorMsg = `Failed to execute ${type} action on element ${id}: ${error}`;
            console.error(errorMsg);
            onError?.(errorMsg);
            return false;
        }
    }, [pageState, onActionExecuted, onError]);

    // Show current action (highlight but don't execute)
    const showCurrentAction = useCallback(async () => {
        const currentIndex = currentActionIndexRef.current;
        const actions = actionsQueueRef.current;
        const setIconPosition = setIconPositionRef.current;

        if (currentIndex >= actions.length || !setIconPosition) {
            console.log('🤖 All actions completed');
            // Clean up
            if (keyListenerRef.current) {
                document.removeEventListener('keydown', keyListenerRef.current);
                keyListenerRef.current = null;
            }
            isExecutingRef.current = false;
            return;
        }

        const action = actions[currentIndex];
        const { id, type, value } = action;

        try {
            // Get the element from pageState or DOM
            const elementDomNode: ElementDomNode | undefined = pageState?.domSnapshot?.selectorMap.get(id);
            if (!elementDomNode) {
                console.warn(`Element with id ${id} not found in page`);
                return;
            }

            const element: Element | null = await locateElement(elementDomNode);

            if (!element) {
                console.warn(`Cannot locate element with id ${id} in page`);
                return;
            }

            const rect = element.getBoundingClientRect();
            const top = Math.round(rect.top);
            const left = Math.round(rect.left);
            setIconPosition({ top, left });

            // Highlight the element but don't execute
            if (type === 'fill' || type === 'select') {
                highlightElement(id, element, `${type} with '${value}'`);
            } else {
                highlightElement(id, element, 'click');
            }

            console.log(`🤖 Ready to execute action ${currentIndex + 1}/${actions.length}: ${type} on element ${id}${value ? ` with value "${value}"` : ''}`);
            console.log('🤖 Press Tab to execute this action');

        } catch (error) {
            console.error(`Failed to show action ${currentIndex + 1}:`, error);
        }
    }, [pageState]);

    // Execute current action and move to next
    const executeCurrentActionAndMoveNext = useCallback(async () => {
        const currentIndex = currentActionIndexRef.current;
        const actions = actionsQueueRef.current;
        const setIconPosition = setIconPositionRef.current;

        if (currentIndex >= actions.length || !setIconPosition) {
            console.log('🤖 All actions completed');
            // Clean up
            if (keyListenerRef.current) {
                document.removeEventListener('keydown', keyListenerRef.current);
                keyListenerRef.current = null;
            }
            isExecutingRef.current = false;
            return;
        }

        const action = actions[currentIndex];
        console.log(`🤖 Executing action ${currentIndex + 1}/${actions.length}:`, action);

        // Execute the current action
        await executeAction(action, setIconPosition);

        // Move to next action
        currentActionIndexRef.current = currentIndex + 1;

        // Check if there are more actions
        if (currentActionIndexRef.current < actions.length) {
            // Show the next action but don't execute it
            await showCurrentAction();
        } else {
            console.log('🤖 All actions completed');
            // Clean up
            if (keyListenerRef.current) {
                document.removeEventListener('keydown', keyListenerRef.current);
                keyListenerRef.current = null;
            }
            isExecutingRef.current = false;
        }
    }, [executeAction, showCurrentAction]);

    // Setup keyboard listener
    const setupKeyboardListener = useCallback(() => {
        // Remove existing listener if any
        if (keyListenerRef.current) {
            document.removeEventListener('keydown', keyListenerRef.current);
        }

        // Create new listener
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Tab') {
                event.preventDefault(); // Prevent default tab behavior
                executeCurrentActionAndMoveNext();
            }
        };

        keyListenerRef.current = handleKeyDown;
        document.addEventListener('keydown', handleKeyDown);
    }, [executeCurrentActionAndMoveNext]);

    // Execute multiple actions sequentially with Tab navigation
    const executeActions = useCallback(async (agentResponse: AgentResponse, setIconPosition: any): Promise<{
        success: boolean;
        executedCount: number;
        totalCount: number;
        reasoning?: string;
    }> => {
        if (isExecutingRef.current) {
            console.warn('Actions already executing, skipping...');
            return { success: false, executedCount: 0, totalCount: 0 };
        }

        isExecutingRef.current = true;
        let reasoning = '';

        try {
            const { actions, reasoning: parsedReasoning } = agentResponse;

            reasoning = parsedReasoning;

            // Setup the action queue
            actionsQueueRef.current = actions;
            currentActionIndexRef.current = 0;
            setIconPositionRef.current = setIconPosition;

            console.log('🤖 Agent reasoning:', reasoning);
            console.log(`🤖 Starting sequential execution of ${actions.length} actions`);

            // Setup keyboard listener
            setupKeyboardListener();

            // Show the first action (but don't execute it)
            if (actions.length > 0) {
                await showCurrentAction();
            }

            // Return initial state
            return {
                success: true,
                executedCount: 0, // No actions executed yet
                totalCount: actions.length,
                reasoning
            };

        } catch (error) {
            const errorMsg = `Failed to parse or execute agent actions: ${error}`;
            console.error(errorMsg);
            onError?.(errorMsg);

            // Clean up on error
            if (keyListenerRef.current) {
                document.removeEventListener('keydown', keyListenerRef.current);
                keyListenerRef.current = null;
            }
            isExecutingRef.current = false;

            return {
                success: false,
                executedCount: 0,
                totalCount: 0,
                reasoning
            };
        }
    }, [setupKeyboardListener, onError, executeCurrentActionAndMoveNext, showCurrentAction]);

    // Check if actions are currently executing
    const isExecuting = useCallback(() => isExecutingRef.current, []);

    // Get current action info
    const getCurrentActionInfo = useCallback(() => ({
        currentIndex: currentActionIndexRef.current,
        totalActions: actionsQueueRef.current.length,
        currentAction: actionsQueueRef.current[currentActionIndexRef.current] || null
    }), []);

    // Move to next action (kept for backward compatibility)
    const moveToNextAction = useCallback(async () => {
        await executeCurrentActionAndMoveNext();
    }, [executeCurrentActionAndMoveNext]);

    // Validate if an action can be executed
    const validateAction = useCallback((action: AgentAction): boolean => {
        const { id, type, value } = action;

        // Check if element exists
        const element = document.querySelector(`[data-element-id="${id}"]`);
        if (!element) {
            return false;
        }

        // Type-specific validation
        switch (type) {
            case 'click':
                return true; // Any element can be clicked

            case 'fill':
                return (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) &&
                    value !== undefined;

            case 'select':
                return element instanceof HTMLSelectElement && value !== undefined;

            default:
                return false;
        }
    }, []);

    // Cleanup function
    const cleanup = useCallback(() => {
        if (keyListenerRef.current) {
            document.removeEventListener('keydown', keyListenerRef.current);
            keyListenerRef.current = null;
        }
        isExecutingRef.current = false;
        currentActionIndexRef.current = 0;
        actionsQueueRef.current = [];
    }, []);

    // Effect for cleanup on unmount
    useEffect(() => {
        return cleanup;
    }, [cleanup]);

    return {
        executeAction,
        executeActions,
        validateAction,
        isExecuting,
        getCurrentActionInfo,
        moveToNextAction,
        cleanup
    };
};

// Optional: Higher-level hook that combines chat and agent actions
export const useAgentChat = (chatHook: any, setIconPosition: any, agentConfig: UseAgentActionsConfig = {}) => {
    const agentActions = useAgentActions({
        ...agentConfig,
        onError: (error) => {
            chatHook.addAssistantMessage(`❌ ${error}`);
            agentConfig.onError?.(error);
        }
    });

    const processAgentReply = useCallback(async (reply: string) => {
        const cleanReply = reply
            .replace(/```json\s*/g, '')
            .replace(/```\s*/g, '')
            .trim();

        const parsed = JSON.parse(cleanReply);

        // Validate the structure
        if (!parsed.actions || !Array.isArray(parsed.actions) || !parsed.reasoning) {
            throw new Error('Invalid agent response structure');
        }

        // Validate each action
        for (const action of parsed.actions) {
            if (!action.type) {
                throw new Error('Invalid action structure');
            }

            if (!['click', 'fill', 'select', 'scroll'].includes(action.type)) {
                throw new Error(`Invalid action type: ${action.type}`);
            }

            if ((action.type === 'fill' || action.type === 'select') && !action.value) {
                throw new Error(`Action type ${action.type} requires a value`);
            }
        }

        await agentActions.executeActions(parsed, setIconPosition);
        chatHook.addAssistantMessage(parsed.reasoning);

    }, [agentActions]);

    return {
        ...agentActions,
        processAgentReply
    };
};