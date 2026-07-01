import React from 'react';
import { Heart, ShieldCheck, HelpCircle, PhoneCall } from 'lucide-react';

function Footer() {
  return (
    <footer className="mt-auto py-12 px-8 bg-clay-bg border-t-4 border-white w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto pb-10">
        {/* Safety Widget */}
        <div className="flex">
          <div className="clay-card flex-1 p-6 rounded-[24px] text-center flex flex-col items-center bg-white">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/15 mb-4 border-2 border-amber-500/30 shadow-[inset_-2px_-2px_5px_rgba(248,200,71,0.1),inset_2px_2px_5px_rgba(255,255,255,0.8)]">
              <ShieldCheck size={24} className="text-clay-yellow-dark" />
            </div>
            <h4 className="text-[1.15rem] font-semibold text-clay-text-dark mb-2 font-friendly">Safety First!</h4>
            <p className="text-[0.9rem] leading-relaxed text-clay-text-muted">
              Your safety is our top priority. Track your bus live and stay warm indoors until it arrives.
            </p>
          </div>
        </div>

        {/* Help Guide Widget */}
        <div className="flex">
          <div className="clay-card flex-1 p-6 rounded-[24px] text-center flex flex-col items-center bg-white">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-clay-blue/15 mb-4 border-2 border-clay-blue/30 shadow-[inset_-2px_-2px_5px_rgba(91,150,245,0.1),inset_2px_2px_5px_rgba(255,255,255,0.8)]">
              <HelpCircle size={24} className="text-clay-blue-dark" />
            </div>
            <h4 className="text-[1.15rem] font-semibold text-clay-text-dark mb-2 font-friendly">Need Help?</h4>
            <p className="text-[0.9rem] leading-relaxed text-clay-text-muted">
              Check our student helper guide or contact the school transportation supervisor anytime.
            </p>
          </div>
        </div>

        {/* Emergency Info Widget */}
        <div className="flex">
          <div className="clay-card flex-1 p-6 rounded-[24px] text-center flex flex-col items-center bg-white">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-clay-green/15 mb-4 border-2 border-clay-green/30 shadow-[inset_-2px_-2px_5px_rgba(92,192,117,0.1),inset_2px_2px_5px_rgba(255,255,255,0.8)]">
              <PhoneCall size={24} className="text-clay-green-dark" />
            </div>
            <h4 className="text-[1.15rem] font-semibold text-clay-text-dark mb-2 font-friendly">Depot Hotlines</h4>
            <p className="text-[0.9rem] leading-relaxed text-clay-text-muted text-center">
              <strong>Bus Depot:</strong> +1 (555) 019-9234<br />
              <strong>School Office:</strong> +1 (555) 019-9200
            </p>
          </div>
        </div>
      </div>

      {/* Bytesoft Credits & Copyright section */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 max-w-6xl mx-auto pt-8 border-t-3 border-white/80">
        
        {/* Copyright badge */}
        <div className="clay-badge clay-badge-blue rounded-2xl py-2 px-5 shadow-[0_4px_10px_rgba(166,180,200,0.15),inset_-3px_-3px_6px_rgba(166,180,200,0.15),inset_3px_3px_6px_rgba(255,255,255,0.9)] border-2 border-clay-blue/20 text-clay-blue-dark">
          <span>Made with</span>
          <Heart size={14} className="mx-1 text-red-500 fill-red-500 inline-block" />
          <span>for students of TrackMyBus &copy; {new Date().getFullYear()}</span>
        </div>

        {/* Bytesoft Brand Credit */}
        <div className="flex flex-col items-center md:items-end gap-2 text-center md:text-right">
          <span className="text-xs font-friendly font-semibold text-clay-text-muted uppercase tracking-wider">
            Developed and managed by
          </span>
          <div className="flex items-center gap-3">
            {/* SVG Replica of Bytesoft Logo Frame from Image */}
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 400 150" 
              className="w-32 h-auto text-slate-800"
              style={{ filter: 'drop-shadow(2px 3px 4px rgba(0,0,0,0.06))' }}
            >
              {/* Frame with a gap at the bottom */}
              <path 
                d="M 12,12 L 388,12 L 388,138 L 290,138 M 110,138 L 12,138 L 12,12" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="10" 
                strokeLinecap="round" 
              />
              {/* BYTESOFT lettering */}
              <text 
                x="200" 
                y="90" 
                fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
                fontSize="68" 
                fontWeight="900" 
                textAnchor="middle" 
                letterSpacing="1" 
                fill="currentColor"
              >
                BYTESOFT
              </text>
              {/* EST. 2022 centered inside bottom gap */}
              <text 
                x="200" 
                y="142" 
                fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
                fontSize="24" 
                fontWeight="bold" 
                textAnchor="middle" 
                letterSpacing="1.5" 
                fill="currentColor"
              >
                EST. 2022
              </text>
            </svg>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
