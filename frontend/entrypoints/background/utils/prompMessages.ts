// utils/promptMessages.ts
import {
    AppState
} from "@/common/types/AppState";

export interface AgentAction {
    id: number;
    type: 'click' | 'fill' | 'select';
    value?: string;
}

export interface AgentResponse {
    actions: AgentAction[];
    reasoning: string;
}

export const PromptBuilder = {
    /**
     * Build a complete prompt message based on configuration
     */
    buildMessage: (userMessage: string | "", appState: AppState): string => {
        const { task, fileContentAsString, useAgent } = appState
        let message = '';

        // Add main content (task or user message)
        if (appState.useAgent && task) {
            message += `<task>${task}</task>`;
        } else if (userMessage) {
            message += `<user_message>${userMessage}</user_message>`;
        }

        // Add file context if available
        if (fileContentAsString) {
            message += `<context>${fileContentAsString}</context>`;
        }

        // Add page state and instructions for agent mode
        if (useAgent) {
            message += `<page_state>${appState.pageStateAsString}</page_state>`;
            message += PromptBuilder.getAgentInstructions();
        }

        return message;
    },

    /**
     * Build a continuation message for agent mode when page state updates
     */
    buildContinuationMessage: (task: string, fileContent: string, appState: AppState): string => {
        let message = `<task>Page updated. Continue with task: ${task}</task>`;
        message += `<context>${fileContent}</context>`;
        message += `<page_state>${appState.pageStateAsString}</page_state>`;
        message += PromptBuilder.getAgentInstructions();

        return message;
    },

    /**
     * Get the standard agent instructions
     */
    getAgentInstructions: (): string => {
        return `<instructions>
Complete the task by interacting with the page elements, it preserves the hierarchy structure of the web.

Actions available:
- "click" - you can only click buttons, links, or interactive elements
- "fill" - you can only fill text into input elements like <input>
- "select" - you can only choose from dropdown/select elements like <select>
- "scroll" - you can scroll if you do not have enough info

Return only JSON with actions and reasoning, do not include any other text:
{
  "actions": [
    {"id": 0, "type": "fill", "value": "your_suggested_input"},
    {"id": 3, "type": "select", "value": "your_suggested_option"},
    {"id": 5, "type": "click"}
    {"type": "scroll"}
  ],
  "reasoning": "Brief explanation of the action sequence"
}
</instructions>`;
    },

    /**
     * Parse agent response from JSON string
     */
    parseAgentResponse: (response: string): AgentResponse | null => {
        try {
            // Clean up the response by removing any markdown code blocks
            const cleanResponse = response
                .replace(/```json\s*/g, '')
                .replace(/```\s*/g, '')
                .trim();

            const parsed = JSON.parse(cleanResponse);

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

            return parsed as AgentResponse;
        } catch (error) {
            console.error('Failed to parse agent response:', error);
            return null;
        }
    },

    /**
     * Build a system prompt for different modes
     */
    getSystemPrompt: (useAgent: boolean = false, useSearch: boolean = false): string => {
        let systemPrompt = 'You are a helpful AI assistant.';

        if (useAgent) {
            systemPrompt += ` You are operating in agent mode and can interact with web pages. 
You should analyze the page state and provide specific actions to complete the given task. 
Always respond with valid JSON containing actions and reasoning.`;
        }

        if (useSearch) {
            systemPrompt += ` You have access to search capabilities and can look up current information when needed.`;
        }

        return systemPrompt;
    },

    /**
     * Validate a task before sending
     */
    validateTask: (task: string): { valid: boolean; error?: string } => {
        if (!task || task.trim().length === 0) {
            return { valid: false, error: 'Task cannot be empty' };
        }

        if (task.length > 1000) {
            return { valid: false, error: 'Task is too long (max 1000 characters)' };
        }

        return { valid: true };
    },

    /**
     * Sanitize user input
     */
    sanitizeInput: (input: string): string => {
        return input
            .trim()
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    }
};

// Template constants for common prompts
export const PROMPT_TEMPLATES = {
    AGENT_WELCOME: "I'm ready to help you navigate and interact with web pages. What task would you like me to complete?",

    CHAT_WELCOME: "Hello! I'm here to help you with any questions or tasks. How can I assist you today?",

    NO_PAGE_STATE: "I don't have access to the current page state. Please make sure you're on a web page and try again.",

    INVALID_TASK: "I couldn't understand the task. Please provide a clear description of what you'd like me to do on this page.",

    PARSING_ERROR: "I received an invalid response format. Let me try again with the correct structure.",

    COMPLETION_SUCCESS: "Task completed successfully! Is there anything else you'd like me to do?",

    COMPLETION_PARTIAL: "I've made progress on the task, but it may need additional steps. Should I continue?",

    ERROR_GENERIC: "I encountered an error while processing your request. Please try again or rephrase your message."
};