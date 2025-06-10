import React from 'react';

const QuickLinks = () => {
  const links = [
    {
      title: 'Official Website',
      url: 'https://tubetor.xyz',
      description: 'tubetor.xyz',
      icon: (
        <svg className="w-[24px] h-[24px] text-slate-600" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
      )
    },
    {
      title: 'Support & Feedback (Telegram)',
      url: 'https://t.me/tabersupport',
      description: '@tabersupport',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-[24px] h-[24px]">
          <path fill="#29b6f6" d="M24 4A20 20 0 1 0 24 44A20 20 0 1 0 24 4Z"/>
          <path fill="#fff" d="M33.95,15l-3.746,19.126c0,0-0.161,0.874-1.245,0.874c-0.576,0-0.873-0.274-0.873-0.274l-8.114-6.733 l-3.97-2.001l-5.095-1.355c0,0-0.907-0.262-0.907-1.012c0-0.625,0.933-0.923,0.933-0.923l21.316-8.468 c-0.001-0.001,0.651-0.235,1.126-0.234C33.667,14,34,14.125,34,14.5C34,14.75,33.95,15,33.95,15z"/>
          <path fill="#b0bec5" d="M23,30.505l-3.426,3.374c0,0-0.149,0.115-0.348,0.12c-0.069,0.002-0.143-0.009-0.219-0.043 l0.964-5.965L23,30.505z"/>
          <path fill="#cfd8dc" d="M29.897,18.196c-0.169-0.22-0.481-0.26-0.701-0.093L16,26c0,0,2.106,5.892,2.427,6.912 c0.322,1.021,0.58,1.045,0.58,1.045l0.964-5.965l9.832-9.096C30.023,18.729,30.064,18.416,29.897,18.196z"/>
        </svg>
      )
    },
    {
      title: 'Follow us',
      url: 'https://x.com/TubetorS89652',
      description: '@TubetorS89652',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-[24px] h-[24px]" fill="currentColor">
          <path d="M 5.9199219 6 L 20.582031 27.375 L 6.2304688 44 L 9.4101562 44 L 21.986328 29.421875 L 31.986328 44 L 44 44 L 28.681641 21.669922 L 42.199219 6 L 39.029297 6 L 27.275391 19.617188 L 17.933594 6 L 5.9199219 6 z M 9.7167969 8 L 16.880859 8 L 40.203125 42 L 33.039062 42 L 9.7167969 8 z"/>
        </svg>
      )
    }
  ];

  return (
    <div className="space-y-3">
      {links.map((link, index) => (
        <a
          key={index}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-3 bg-white/50 hover:bg-white rounded-lg border border-slate-200 transition-colors group"
        >
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-slate-200 transition-colors">
            {link.icon}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700">{link.title}</p>
            <p className="text-xs text-slate-500">{link.description}</p>
          </div>
        </a>
      ))}
    </div>
  );
};

export default QuickLinks; 