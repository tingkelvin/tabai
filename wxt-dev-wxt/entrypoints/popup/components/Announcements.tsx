import React from 'react';

const Announcements: React.FC = () => {
    return (
        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">📢 Announcements</h3>
            <p className="text-xs text-blue-600">New features coming soon! Stay tuned for updates.</p>
        </div>
    );
};

export default Announcements; 