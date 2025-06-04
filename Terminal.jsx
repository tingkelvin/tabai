import React, { forwardRef, useRef } from "react";

const Terminal = forwardRef(({ children, mode = "dark", title = "Terminal", className = "", ...props }, ref) => {
  const contentRef = useRef(null);

  // Simple theme switching without external dependency
  const themes = {
    dark: {
      container: "bg-gray-900 border border-gray-700",
      header: "bg-gray-800 border-b border-gray-700",
      headerText: "text-gray-300",
      content: "bg-gray-900 text-green-400",
      scrollbar: "scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
    },
    light: {
      container: "bg-white border border-gray-300",
      header: "bg-gray-100 border-b border-gray-300",
      headerText: "text-gray-700",
      content: "bg-white text-gray-800",
      scrollbar: "scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200"
    }
  };

  const currentTheme = themes[mode] || themes.dark;

  return (
    <div 
      ref={ref} 
      className={`w-full h-full ${currentTheme.container} rounded-lg shadow-lg overflow-hidden transition-colors duration-300 ${className}`}
      {...props}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2 ${currentTheme.header} transition-colors duration-300`}>
        <div className={`${currentTheme.headerText} text-sm font-mono transition-colors duration-300`}>
          {title}
        </div>
        <div className="flex space-x-2">
          <div className="h-2 w-2 rounded-full bg-red-500"></div>
          <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
          <div className="h-2 w-2 rounded-full bg-green-500"></div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-col h-[calc(100%-36px)]">
        <div 
          ref={contentRef} 
          className={`flex-1 p-4 overflow-y-auto font-mono text-xs ${currentTheme.content} ${currentTheme.scrollbar} transition-colors duration-300`}
        >
          <div className="h-full w-full">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
});

Terminal.displayName = 'Terminal';

export default Terminal;