import React, { useState } from 'react';
import { Brain, Zap, ArrowRight, Chrome, Settings, Star } from 'lucide-react';

const IntroPage = () => {
  const [isHovered, setIsHovered] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header Section */}
        <div className="text-center mb-12">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-lg">
            <Brain className="w-10 h-10 text-white" />
          </div>
          
          {/* Title */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AI Tools Extension
          </h1>
          
          {/* Description */}
          <p className="text-xl text-gray-600 leading-relaxed max-w-lg mx-auto">
            Access powerful AI tools instantly with a simple tab. Boost your productivity with intelligent assistance right in your browser.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Instant Access</h3>
            <p className="text-sm text-gray-600">Quick keyboard shortcut to open AI tools anywhere</p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Settings className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Customizable</h3>
            <p className="text-sm text-gray-600">Tailor AI tools to your specific workflow needs</p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Star className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Smart & Fast</h3>
            <p className="text-sm text-gray-600">Optimized for speed with intelligent suggestions</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button 
            className="group flex items-center gap-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            onMouseEnter={() => setIsHovered('install')}
            onMouseLeave={() => setIsHovered(null)}
            onClick={() => {
              // Add your installation logic here
              console.log('Install extension clicked');
            }}
          >
            <Chrome className="w-5 h-5" />
            Install Extension
            <ArrowRight className={`w-5 h-5 transition-transform ${isHovered === 'install' ? 'translate-x-1' : ''}`} />
          </button>
          
          <button 
            className="flex items-center gap-3 border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
            onMouseEnter={() => setIsHovered('learn')}
            onMouseLeave={() => setIsHovered(null)}
            onClick={() => {
              // Add your learn more logic here
              console.log('Learn more clicked');
            }}
          >
            Learn More
            <ArrowRight className={`w-5 h-5 transition-transform ${isHovered === 'learn' ? 'translate-x-1' : ''}`} />
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-gray-500">
          <p>Compatible with Chrome, Edge, and other Chromium-based browsers</p>
        </div>
      </div>
    </div>
  );
};

export default IntroPage;