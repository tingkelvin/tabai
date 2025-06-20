import React from 'react';
import { Settings, LogOut, Zap, ZapOff } from 'lucide-react';
import StatusIndicator from './StatusIndicator';

interface HeaderProps {
    isAuthenticated: boolean;
    isActive: boolean;
    isAuthenticating: boolean;
    onToggleExtension: () => void;
    onOpenSettings: () => void;
    onLogout: () => void;
    onGoogleLogin: () => void;
}

const Header: React.FC<HeaderProps> = ({
    isAuthenticated,
    isActive,
    isAuthenticating,
    onToggleExtension,
    onOpenSettings,
    onLogout,
    onGoogleLogin
}) => {
    return (
        <div className="relative bg-white/80 backdrop-blur-xl p-6 border-b border-slate-200/50">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5"></div>

            <div className="relative flex items-center gap-4 mb-4">
                <StatusIndicator isAuthenticated={isAuthenticated} isActive={isActive} />

                {/* Header Controls */}
                <div className="flex items-center gap-2 ml-auto">
                    {isAuthenticated ? (
                        <>
                            <button
                                onClick={onToggleExtension}
                                disabled={!isAuthenticated}
                                className={`p-2 text-slate-400 rounded-xl transition-all duration-200 disabled:opacity-50 group ${isActive ? 'hover:bg-red-50' : 'hover:bg-emerald-50'
                                    }`}
                                title={isActive ? "Stop Tab" : "Start Tab"}
                            >
                                {isActive ? (
                                    <ZapOff className="w-5 h-5 text-slate-600 group-hover:text-red-500 group-hover:rotate-12 transition-all duration-300" />
                                ) : (
                                    <Zap className="w-5 h-5 text-slate-600 group-hover:text-emerald-500 group-hover:rotate-12 transition-all duration-300" />
                                )}
                            </button>

                            <button
                                onClick={onOpenSettings}
                                disabled={!isAuthenticated}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all duration-200 disabled:opacity-50 group"
                            >
                                <Settings className="w-5 h-5 text-slate-600 group-hover:rotate-90 transition-transform duration-300" />
                            </button>

                            <button
                                onClick={onLogout}
                                disabled={isAuthenticating}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200 disabled:opacity-50 group"
                                title="Sign out"
                            >
                                <LogOut className="w-5 h-5 text-slate-600 group-hover:text-red-500 group-hover:rotate-12 transition-all duration-300" />
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onGoogleLogin}
                            disabled={isAuthenticating}
                            className="px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-xl transition-all duration-200 disabled:opacity-50 group flex items-center gap-2"
                            title="Sign in with Google"
                        >
                            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span className="text-sm font-medium">Sign in</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Header;