import AuthManager from "../managers/authManager";

// middleware/authMiddleware.ts
export const withAuth = async (handler: Function) => {
    if (!AuthManager) {
        return { success: false, error: 'Authentication not available' };
    }

    const authStatus = await AuthManager.checkAuthStatus();
    if (!authStatus.isAuthenticated) {
        await AuthManager.logout();
        return { success: false, error: 'Authentication required' };
    }

    return handler();
};
