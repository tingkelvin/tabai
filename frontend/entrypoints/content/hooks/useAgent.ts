// hooks/useAgentActions.ts
import { useCallback, useRef, useEffect } from 'react';
import { removeHighlights, locateElement } from '../services/DomTreeService';
import { highlightElement } from '../utils/domUtils';
import { ElementDomNode } from '../types/dom/DomNode';
import { AgentResponse } from '../utils/prompMessages';
import { Position } from '../types';

export interface AgentAction {
    id: number;
    type: 'click' | 'fill' | 'select';
    value?: string;
}

export interface UseAgentActionsConfig {
    onActionExecuted?: (action: AgentAction) => Promise<void>;
    setIconPosition?: (position: Position) => void;
    onError?: (error: string) => void;
    actionDelay?: number;
}

export const useAgentActions = (config: UseAgentActionsConfig = {}) => {
    const {
        onActionExecuted,
        setIconPosition,
        onError,
        actionDelay = 100
    } = config;

    const isExecutingRef = useRef(false);
    const currentActionIndexRef = useRef(0);
    const actionsQueueRef = useRef<AgentAction[]>([]);
    const keyListenerRef = useRef<((event: KeyboardEvent) => void) | null>(null);
    const selectorMapRef = useRef<Map<number, ElementDomNode> | null>(null);

    // Execute a single action
    const executeAction = useCallback(async (action: AgentAction): Promise<boolean> => {
        const { id, type, value } = action;

        if (!selectorMapRef.current) {
            console.error('No selector map available');
            return false;
        }

        try {
            const elementDomNode: ElementDomNode | undefined = selectorMapRef.current.get(id);
            if (!elementDomNode) {
                console.log('Available selector map keys:', Array.from(selectorMapRef.current.keys()));
                console.warn(`Element with id ${id} not found in selector map`);
                return false;
            }

            const element: Element | null = await locateElement(elementDomNode);

            if (!element) {
                console.warn(`Cannot locate element with id ${id} in DOM`);
                return false;
            }

            const rect = element.getBoundingClientRect();
            const top = Math.round(rect.top);
            const left = Math.round(rect.left);
            setIconPosition?.({ top, left });

            // Highlight element with action info
            if (type === 'fill' || type === 'select') {
                highlightElement(id, element, `${type} with '${value}'`);
            } else {
                highlightElement(id, element, 'click');
            }

            switch (type) {
                case 'click':
                    console.log(`🤖 Clicking element ${id}`);
                    if (element instanceof HTMLElement) {
                        try {
                            element.click();
                        } catch (clickError) {
                            console.warn('Standard click failed, trying alternative methods:', clickError);
                            try {
                                const clickEvent = new MouseEvent('click', {
                                    bubbles: true,
                                    cancelable: true,
                                    view: window
                                });
                                element.dispatchEvent(clickEvent);
                            } catch (eventError) {
                                console.warn('Event dispatch failed, trying focus method:', eventError);
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

            onActionExecuted?.(action);
            return true;

        } catch (error) {
            const errorMsg = `Failed to execute ${type} action on element ${id}: ${error}`;
            console.error(errorMsg);
            onError?.(errorMsg);
            return false;
        }
    }, [onActionExecuted, setIconPosition, onError]);

    // Show current action (highlight but don't execute)
    const showCurrentAction = useCallback(async () => {
        const currentIndex = currentActionIndexRef.current;
        const actions = actionsQueueRef.current;

        if (currentIndex >= actions.length) {
            console.log('🤖 All actions completed');
            cleanup();
            return;
        }

        const action = actions[currentIndex];
        const { id, type, value } = action;

        if (!selectorMapRef.current) {
            console.error('No selector map available');
            return;
        }

        try {
            const elementDomNode: ElementDomNode | undefined = selectorMapRef.current.get(id);
            if (!elementDomNode) {
                console.warn(`Element with id ${id} not found in selector map`);
                return;
            }

            const element: Element | null = await locateElement(elementDomNode);

            if (!element) {
                console.warn(`Cannot locate element with id ${id} in DOM`);
                return;
            }

            const rect = element.getBoundingClientRect();
            const top = Math.round(rect.top);
            const left = Math.round(rect.left);
            setIconPosition?.({ top, left });

            removeHighlights();

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
    }, [setIconPosition]);

    // Execute current action and move to next
    const executeCurrentActionAndMoveNext = useCallback(async () => {
        const currentIndex = currentActionIndexRef.current;
        const actions = actionsQueueRef.current;

        if (currentIndex >= actions.length) {
            console.log('🤖 All actions completed');
            cleanup();
            return;
        }

        const action = actions[currentIndex];
        console.log(`🤖 Executing action ${currentIndex + 1}/${actions.length}:`, action);

        // Execute the current action
        await executeAction(action);

        // Move to next action
        currentActionIndexRef.current = currentIndex + 1;

        // Check if there are more actions
        if (currentActionIndexRef.current < actions.length) {
            await showCurrentAction();
        } else {
            console.log('🤖 All actions completed');
            cleanup();
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
                event.preventDefault();
                executeCurrentActionAndMoveNext();
            }
        };

        keyListenerRef.current = handleKeyDown;
        document.addEventListener('keydown', handleKeyDown);
    }, [executeCurrentActionAndMoveNext]);

    // Set the selector map for use by all actions
    const setSelectorMap = useCallback((selectorMap: Map<number, ElementDomNode>) => {
        if (!selectorMap || selectorMap.size === 0) {
            console.warn('Setting empty or invalid selector map');
        }

        selectorMapRef.current = selectorMap;
        console.log(`🤖 Selector map updated with ${selectorMap?.size || 0} elements`);
    }, []);

    // Execute multiple actions sequentially with Tab navigation
    const executeActions = useCallback(async (agentResponse: AgentResponse): Promise<{
        success: boolean;
        executedCount: number;
        totalCount: number;
        reasoning?: string;
    }> => {
        if (isExecutingRef.current) {
            console.warn('Actions already executing, skipping...');
            return { success: false, executedCount: 0, totalCount: 0 };
        }

        if (!selectorMapRef.current || selectorMapRef.current.size === 0) {
            console.error('No selector map available. Call setSelectorMap() first.');
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

            console.log('🤖 Agent reasoning:', reasoning);
            console.log(`🤖 Starting sequential execution of ${actions.length} actions`);
            console.log(`🤖 Using selector map with ${selectorMapRef.current.size} elements`);

            // Setup keyboard listener
            setupKeyboardListener();

            // Show the first action (but don't execute it)
            if (actions.length > 0) {
                await showCurrentAction();
            }

            return {
                success: true,
                executedCount: 0,
                totalCount: actions.length,
                reasoning
            };

        } catch (error) {
            const errorMsg = `Failed to parse or execute agent actions: ${error}`;
            console.error(errorMsg);
            onError?.(errorMsg);
            cleanup();

            return {
                success: false,
                executedCount: 0,
                totalCount: 0,
                reasoning
            };
        }
    }, [setupKeyboardListener, onError, showCurrentAction]);

    // Cleanup function
    const cleanup = useCallback(() => {
        if (keyListenerRef.current) {
            document.removeEventListener('keydown', keyListenerRef.current);
            keyListenerRef.current = null;
        }
        isExecutingRef.current = false;
        currentActionIndexRef.current = 0;
        actionsQueueRef.current = [];
        selectorMapRef.current = null;
    }, []);

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
    const validateAction = useCallback((action: AgentAction, selectorMap: Map<number, ElementDomNode>): boolean => {
        const { id, type, value } = action;

        // Check if element exists in selector map
        const elementDomNode = selectorMap.get(id);
        if (!elementDomNode) {
            return false;
        }

        // Type-specific validation
        switch (type) {
            case 'click':
                return true; // Any element can be clicked

            case 'fill':
                return value !== undefined &&
                    (elementDomNode.tagName === 'INPUT' || elementDomNode.tagName === 'TEXTAREA');

            case 'select':
                return elementDomNode.tagName === 'SELECT' && value !== undefined;

            default:
                return false;
        }
    }, []);

    // Effect for cleanup on unmount
    useEffect(() => {
        return cleanup;
    }, [cleanup]);

    return {
        setSelectorMap,
        executeAction,
        executeActions,
        validateAction,
        isExecuting,
        getCurrentActionInfo,
        moveToNextAction,
        cleanup
    };
};

// Higher-level hook that combines chat and agent actions
export const useAgentChat = (chatHook: any, agentConfig: UseAgentActionsConfig = {}) => {
    const agentActions = useAgentActions({
        ...agentConfig,
        onError: (error) => {
            chatHook.addAssistantMessage(`❌ ${error}`);
            agentConfig.onError?.(error);
        }
    });

    const processAgentReply = useCallback(async (reply: string) => {
        // Set the selector map first
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

        await agentActions.executeActions(parsed);
        chatHook.addAssistantMessage(parsed.reasoning);

    }, [agentActions]);

    return {
        ...agentActions,
        processAgentReply
    };
};