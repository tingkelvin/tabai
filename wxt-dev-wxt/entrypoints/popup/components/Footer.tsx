import React from 'react';

const Footer: React.FC = () => {
    return (
        <div className="pt-4 border-t border-slate-200">
            <div className="flex justify-center gap-4 text-xs text-slate-500">
                <a
                    href="https://tubetor.xyz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-slate-700 transition-colors"
                >
                    Terms of Service
                </a>
                <span>·</span>
                <a
                    href="https://tubetor.xyz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-slate-700 transition-colors"
                >
                    Privacy Policy
                </a>
            </div>
        </div>
    );
};

export default Footer; 