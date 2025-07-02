// hooks/useAgentActions.ts
import { useCallback, useRef } from 'react';
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

    // Execute a single action
    const executeAction = useCallback(async (action: AgentAction): Promise<boolean> => {
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

            if (type == 'fill' || type == 'select')
                highlightElement(id, element, `${type} with '${value}'`)
            else
                highlightElement(id, element, 'click')

            if (!element) {
                console.warn(`Element with id ${id} not found`);
                return false;
            }

            switch (type) {
                case 'click':
                    console.log(`🤖 Clicking element ${id}`);
                    // element.click();
                    break;

                case 'fill':
                    if (value !== undefined) {
                        console.log(`🤖 Filling element ${id} with: ${value}`);
                        // if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
                        //     element.value = value;
                        //     // Trigger input event for React compatibility
                        //     element.dispatchEvent(new Event('input', { bubbles: true }));
                        //     element.dispatchEvent(new Event('change', { bubbles: true }));
                        // } else {
                        //     console.warn(`Element ${id} is not an input field`);
                        //     return false;
                        // }
                    } else {
                        console.warn(`No value provided for fill action on element ${id}`);
                        return false;
                    }
                    break;

                case 'select':
                    if (value !== undefined) {
                        console.log(`🤖 Selecting ${value} in element ${id}`);
                        // if (element instanceof HTMLSelectElement) {
                        //     element.value = value;
                        //     element.dispatchEvent(new Event('change', { bubbles: true }));
                        // } else {
                        //     console.warn(`Element ${id} is not a select element`);
                        //     return false;
                        // }
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

    // Execute multiple actions from JSON string
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

        isExecutingRef.current = true;
        let executedCount = 0;
        let totalCount = 0;
        let reasoning = '';

        try {
            const { actions, reasoning: parsedReasoning } = agentResponse;

            reasoning = parsedReasoning;
            totalCount = actions.length;

            console.log('🤖 Agent reasoning:', reasoning);
            console.log(`🤖 Executing ${totalCount} actions`);

            for (const action of actions) {
                const success = await executeAction(action);
                if (success) {
                    executedCount++;
                }

                // Add delay between actions for stability
                if (actionDelay > 0) {
                    await new Promise(resolve => setTimeout(resolve, actionDelay));
                }
            }

            const allSuccess = executedCount === totalCount;
            console.log(`🤖 Completed: ${executedCount}/${totalCount} actions executed`);

            return {
                success: allSuccess,
                executedCount,
                totalCount,
                reasoning
            };

        } catch (error) {
            const errorMsg = `Failed to parse or execute agent actions: ${error}`;
            console.error(errorMsg);
            onError?.(errorMsg);

            return {
                success: false,
                executedCount,
                totalCount,
                reasoning
            };
        } finally {
            isExecutingRef.current = false;
        }
    }, [executeAction, actionDelay, onError]);

    // Check if actions are currently executing
    const isExecuting = useCallback(() => isExecutingRef.current, []);

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

    return {
        executeAction,
        executeActions,
        validateAction,
        isExecuting
    };
};

// Optional: Higher-level hook that combines chat and agent actions
export const useAgentChat = (chatHook: any, agentConfig: UseAgentActionsConfig = {}) => {
    const agentActions = useAgentActions({
        ...agentConfig,
        onError: (error) => {
            chatHook.addAssistantMessage(`❌ ${error}`);
            agentConfig.onError?.(error);
        }
    });

    const processAgentResponse = useCallback(async (response: AgentResponse) => {
        await agentActions.executeActions(response);
        chatHook.addAssistantMessage(response.reasoning);

    }, [agentActions]);

    return {
        ...agentActions,
        processAgentResponse
    };
};