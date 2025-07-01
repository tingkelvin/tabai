import React from 'react';
import { AlertCircle } from 'lucide-react';

interface AuthErrorProps {
    error: string | null;
    onClear: () => void;
}

const AuthError: React.FC<AuthErrorProps> = ({ error, onClear }) => {
    if (!error) return null;

    return (
        <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/50 rounded-xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1 text-sm">
                    <p className="font-semibold text-red-900 mb-1">Authentication Error</p>
                    <p className="text-red-700">{error}</p>
                </div>
                <button
                    onClick={onClear}
                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                >
                    ×
                </button>
            </div>
        </div>
    );
};

export default AuthError; 