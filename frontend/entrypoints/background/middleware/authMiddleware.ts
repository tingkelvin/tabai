import AuthManager from "../managers/authManager";
import { ErrorHandler } from "../utils/errorUtils";

// middleware/authMiddleware.ts
export const withAuth = async (handler: Function) => {
    if (!AuthManager) {
        return ErrorHandler.createChatResponse({
            status: 'NO_AUTH_MANAGER',
            message: 'AuthManager is not initialized'
        }, 'Auth Middleware');
    }

    const authStatus = await AuthManager.checkAuthStatus();
    if (!authStatus.isAuthenticated) {
        await AuthManager.logout();
        return ErrorHandler.createChatResponse({
            status: 401,
            message: 'User is not authenticated'
        }, 'Auth Middleware');
    }

    return handler();
};
