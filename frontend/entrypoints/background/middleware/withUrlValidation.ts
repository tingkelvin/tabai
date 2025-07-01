// middleware/urlValidationMiddleware.ts
export const withUrlValidation = <T extends { data: any }>(
    handler: (request: T) => Promise<any>
) => {
    return async (request: T) => {
        try {
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!activeTab?.url) {
                throw new Error('No active tab or URL found');
            }

            const url = activeTab.url;
            const isValid = url.startsWith('http://') || url.startsWith('https://');

            if (!isValid) {
                throw new Error('Invalid URL - must be http:// or https://');
            }

            // URL is valid, proceed with handler
            return await handler(request);
        } catch (error) {
            console.error('Error in URL validation:', error);
            throw error;
        }
    };
};