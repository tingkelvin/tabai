// useAuth.js - Custom hook for authentication
import { useState, useEffect } from 'react';
import AuthManager from './AuthManager';

const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Check initial auth status
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const authStatus = await AuthManager.checkAuthStatus();
      setIsAuthenticated(authStatus.isAuthenticated);
      setUser(authStatus.user);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setAuthError('Failed to check authentication status');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async () => {
    try {
      setIsLoading(true);
      setAuthError(null);

      const result = await AuthManager.authenticateWithGoogle();
      
      if (result.success) {
        setUser(result.user);
        setIsAuthenticated(true);
        
        // Notify content scripts
        await AuthManager.notifyContentScripts('USER_AUTHENTICATED', {
          user: result.user
        });
        
        return { success: true };
      } else {
        setAuthError(result.error);
        return { success: false, error: result.error };
      }

    } catch (error) {
      const errorMessage = error.message || 'Login failed';
      setAuthError(errorMessage);
      console.error('Login error:', error);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      setAuthError(null);

      const success = await AuthManager.logout();
      
      if (success) {
        setUser(null);
        setIsAuthenticated(false);
        
        // Notify content scripts
        await AuthManager.notifyContentScripts('USER_LOGGED_OUT');
        
        return { success: true };
      } else {
        setAuthError('Logout failed');
        return { success: false, error: 'Logout failed' };
      }

    } catch (error) {
      const errorMessage = error.message || 'Logout failed';
      setAuthError(errorMessage);
      console.error('Logout error:', error);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setAuthError(null);
  };

  const refreshToken = async () => {
    try {
      const success = await AuthManager.refreshToken();
      if (!success) {
        // Token refresh failed, user needs to login again
        setUser(null);
        setIsAuthenticated(false);
      }
      return success;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  };

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    authError,
    
    // Actions
    login,
    logout,
    clearError,
    refreshToken,
    checkAuthStatus
  };
};

export default useAuth;