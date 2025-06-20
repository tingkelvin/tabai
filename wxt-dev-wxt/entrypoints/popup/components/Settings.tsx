import React, { useState, useEffect } from 'react';
import { X, Monitor } from 'lucide-react';
import useSettings from '../hooks/useSettings';

interface SettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
    const { settings, updateSetting } = useSettings();
    const [systemTheme, setSystemTheme] = useState<string | null>(null);

    // Track system theme
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

        const handleChange = (e: MediaQueryListEvent) => {
            setSystemTheme(e.matches ? 'dark' : 'light');
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const handleThemeToggle = () => {
        // If following system or light mode, switch to dark mode
        // If dark mode, switch to light mode
        updateSetting('darkMode', !settings.darkMode);
    };

    const isCurrentlyDark = settings.darkMode === undefined
        ? systemTheme === 'dark'
        : settings.darkMode;

    return (
        <div
            className={`fixed inset-y-0 right-0 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Settings</h2>
                <button
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all duration-200"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Settings Content */}
            <div className="p-6 space-y-6">
                {/* Theme Settings */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-slate-900">Theme</h3>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-slate-600">Dark Mode</span>
                            {settings.darkMode === undefined && (
                                <div className="flex items-center text-xs text-slate-500">
                                    <Monitor className="w-3 h-3 mr-1" />
                                    <span>Using system ({systemTheme})</span>
                                </div>
                            )}
                        </div>
                        <button
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isCurrentlyDark ? 'bg-blue-500' : 'bg-slate-200'
                                }`}
                            role="switch"
                            aria-checked={isCurrentlyDark}
                            onClick={handleThemeToggle}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${isCurrentlyDark ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>
                </div>

                {/* Notification Settings */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-slate-900">Notifications</h3>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Enable Notifications</span>
                        <button
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${settings.notifications ? 'bg-blue-500' : 'bg-slate-200'
                                }`}
                            role="switch"
                            aria-checked={settings.notifications}
                            onClick={() => updateSetting('notifications', !settings.notifications)}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${settings.notifications ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>
                </div>

                {/* Privacy Settings */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-slate-900">Privacy</h3>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Data Collection</span>
                        <button
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${settings.dataCollection ? 'bg-blue-500' : 'bg-slate-200'
                                }`}
                            role="switch"
                            aria-checked={settings.dataCollection}
                            onClick={() => updateSetting('dataCollection', !settings.dataCollection)}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${settings.dataCollection ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings; 