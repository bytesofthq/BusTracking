import React from 'react';
import { Bus, MapPin, LogIn } from 'lucide-react';

function Header({ currentPage, setCurrentPage, isLoggedIn, setIsLoggedIn, userRole }) {
  return (
    <header className="py-5 px-8 sticky top-0 z-50 bg-clay-bg/80 backdrop-blur-md w-full">
      <nav className="flex justify-between items-center max-w-6xl mx-auto py-2.5 px-6 bg-white rounded-3xl border-3 border-white shadow-[0_8px_32px_rgba(166,180,200,0.15),inset_-4px_-4px_8px_rgba(166,180,200,0.1),inset_4px_4px_8px_rgba(255,255,255,0.9)]">
        {/* Brand/Logo Section */}
        <div 
          className="flex items-center gap-3 cursor-pointer select-none" 
          onClick={() => setCurrentPage('home')}
        >
          <svg 
            viewBox="0 0 160 160" 
            className="w-11 h-11 transition-all duration-300 rounded-[14px] shadow-[4px_4px_10px_rgba(166,180,200,0.2),inset_-3px_-3px_6px_rgba(166,180,200,0.15),inset_3px_3px_6px_#fff]"
          >
            {/* Squircle white background with clay-like inner/outer shadows */}
            <rect x="2" y="2" width="156" height="156" rx="36" ry="36" fill="#ffffff" stroke="#f0f4fa" strokeWidth="2.5" />
            
            {/* Light blue circular background inside */}
            <circle cx="80" cy="80" r="44" fill="#dbeafe" />
            
            {/* Location pin above bus */}
            <path d="M 80,18 C 72,18 66,24 66,32 C 66,42 80,56 80,56 C 80,56 94,42 94,32 C 94,24 88,18 80,18 Z" fill="#3b82f6" />
            <circle cx="80" cy="32" r="5" fill="#ffffff" />
            
            {/* Front-facing blue/white bus */}
            {/* Bus blue bottom body */}
            <path d="M 46,80 L 114,80 L 114,106 C 114,111 109,116 103,116 L 57,116 C 51,116 46,111 46,106 Z" fill="#3b82f6" />
            
            {/* Windscreen/top frame */}
            <path d="M 46,80 L 114,80 L 110,58 C 109,52 103,48 96,48 L 64,48 C 57,48 51,52 50,58 Z" fill="#ffffff" stroke="#3b82f6" strokeWidth="3" />
            
            {/* Windscreen glass */}
            <path d="M 53,74 L 107,74 L 105,55 C 104,52 101,50 97,50 L 63,50 C 59,50 56,52 55,55 Z" fill="#1e293b" />
            
            {/* Headlights */}
            <rect x="52" y="88" width="14" height="8" rx="4" fill="#ffffff" stroke="#93c5fd" strokeWidth="1" />
            <rect x="94" y="88" width="14" height="8" rx="4" fill="#ffffff" stroke="#93c5fd" strokeWidth="1" />
            
            {/* Grill lines */}
            <rect x="70" y="94" width="20" height="3.5" rx="1.75" fill="#1d4ed8" />
            <rect x="74" y="101" width="12" height="3" rx="1.5" fill="#1d4ed8" />
            
            {/* Side mirrors */}
            <path d="M 46,70 C 41,70 38,74 38,79" fill="none" stroke="#1e293b" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M 114,70 C 119,70 122,74 122,79" fill="none" stroke="#1e293b" strokeWidth="4.5" strokeLinecap="round" />
            
            {/* Tires */}
            <rect x="52" y="116" width="11" height="8" rx="2" fill="#1e293b" />
            <rect x="97" y="116" width="11" height="8" rx="2" fill="#1e293b" />
            
            {/* Route dashes */}
            <path d="M 126,62 C 131,72 131,82 126,92" fill="none" stroke="#93c5fd" strokeWidth="4.5" strokeDasharray="3,7" strokeLinecap="round" />
          </svg>
          <span className="brand-name text-2xl text-clay-text-dark tracking-tight">TrackMyBus</span>
        </div>

        {/* Navigation Links */}
        <ul className="flex items-center gap-2 list-none">
          <li>
            <button
              onClick={() => setCurrentPage('home')}
              className={`font-friendly font-semibold text-[1rem] bg-transparent border-none py-2 px-5 rounded-xl cursor-pointer transition-all duration-200 ${
                currentPage === 'home' 
                  ? 'bg-clay-bg text-clay-blue shadow-[inset_2px_2px_5px_rgba(166,180,200,0.2),inset_-2px_-2px_5px_rgba(255,255,255,0.7)]' 
                  : 'text-clay-text-muted hover:text-clay-blue'
              }`}
            >
              Home
            </button>
          </li>
          <li>
            <button
              onClick={() => {
                if (isLoggedIn) {
                  alert('You are already logged in! Let\'s go to your dashboard on the Home page.');
                  setCurrentPage('home');
                } else {
                  setCurrentPage('login');
                }
              }}
              className={`font-friendly font-semibold text-[1rem] bg-transparent border-none py-2 px-5 rounded-xl cursor-pointer transition-all duration-200 ${
                (currentPage === 'login' || currentPage === 'register') 
                  ? 'bg-clay-bg text-clay-blue shadow-[inset_2px_2px_5px_rgba(166,180,200,0.2),inset_-2px_-2px_5px_rgba(255,255,255,0.7)]' 
                  : 'text-clay-text-muted hover:text-clay-blue'
              }`}
            >
              Tracker App
            </button>
          </li>
        </ul>

        {/* Auth / Action Button */}
        <div className="flex items-center">
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <div className="clay-badge clay-badge-blue border-2 text-[0.9rem] py-1.5 px-3">
                {userRole === 'student' ? '🎒 Student' : userRole === 'parent' ? '🏡 Parent' : '🚌 Driver'}
              </div>
              <button 
                className="clay-btn clay-btn-orange text-[0.95rem] py-2 px-5 rounded-2xl" 
                onClick={() => {
                  setIsLoggedIn(false);
                  setCurrentPage('home');
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <button 
              className="clay-btn clay-btn-blue text-[0.95rem] py-2 px-5 rounded-2xl" 
              onClick={() => setCurrentPage('login')}
            >
              <LogIn size={18} />
              Login
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Header;
