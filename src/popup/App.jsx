import React, { useState } from 'react';

function App() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    // Container with responsive padding and max-width
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      {/* Card with shadow and rounded corners */}
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
          <h1 className="text-2xl font-bold text-white">Tailwind CSS Example</h1>
          <p className="text-blue-100 mt-2">Showing various Tailwind features</p>
        </div>

        {/* Content section */}
        <div className="p-6">
          {/* Flex container for button group */}
          <div className="flex space-x-4 mb-6">
            <button 
              className="bg-blue-500 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg
                        transition duration-300 ease-in-out transform hover:scale-105"
            >
              Hover me!
            </button>
            <button 
              className="border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold 
                        py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Focus me!
            </button>
          </div>

          {/* Grid layout example */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-600">Grid Item 1</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-600">Grid Item 2</p>
            </div>
          </div>

          {/* Dropdown example */}
          <div className="relative">
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="w-full flex items-center justify-between bg-gray-50 px-4 py-2 rounded-lg
                        hover:bg-gray-100 transition-colors duration-200"
            >
              <span>Click to toggle</span>
              <svg 
                className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Dropdown content with transition */}
            <div className={`
              mt-2 bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-200
              ${isOpen ? 'opacity-100 max-h-40' : 'opacity-0 max-h-0'}
            `}>
              <div className="p-4">
                <p className="text-gray-600">Dropdown content here!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App; 