import React, { useState, useEffect } from 'react';
import { Bus, MapPin, Navigation, Bell, Share2, Compass, Play, RotateCcw } from 'lucide-react';
import { getFCMToken } from "../../firebase/fcm";

function Home({ setCurrentPage, isLoggedIn, userRole }) {
  // Bus simulation state
  const [busPosition, setBusPosition] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentStop, setCurrentStop] = useState('School Depot');

  useEffect(() => {
    let interval;
    if (isSimulating) {
      interval = setInterval(() => {
        setBusPosition((prev) => {
          const next = prev + 1.5;
          if (next >= 100) {
            setIsSimulating(false);
            setCurrentStop('Sweet Home 🏡');
            return 100;
          }
          if (next < 25) setCurrentStop('School Depot 🏫');
          else if (next < 50) setCurrentStop('Oak Junction 🌳');
          else if (next < 75) setCurrentStop('Sunny Library 📚');
          else setCurrentStop('Grand Avenue 🛣️');
          return next;
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isSimulating]);

  const handleStartSimulation = () => {
    setBusPosition(0);
    setIsSimulating(true);
    setCurrentStop('School Depot 🏫');
  };

  const handleResetSimulation = () => {
    setBusPosition(0);
    setIsSimulating(false);
    setCurrentStop('School Depot 🏫');
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-6 w-full">
      {/* Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-12">
        <div className="flex flex-col items-start gap-5 text-left lg:text-left">
          <div className="clay-badge clay-badge-yellow border-2 text-[0.9rem] py-1.5 px-3 self-start">
            <Compass size={14} className="mr-1 inline-block" />
            <span>Smart School Bus Tracking</span>
          </div>
          <h1 className="text-5xl lg:text-6xl font-friendly font-semibold text-clay-text-dark leading-none">
            Track Your School Bus, <span className="text-clay-blue">The Fun Way!</span>
          </h1>
          <p className="text-lg leading-relaxed text-clay-text-muted max-w-xl">
            Say goodbye to waiting in the rain or cold. View the exact location of your school bus in real-time, get delay pings, and enjoy a stress-free ride to school!
          </p>
          <div className="flex gap-3 mt-4">
            <button 
              className="clay-btn clay-btn-blue py-3 px-6 rounded-2xl flex items-center gap-2" 
              onClick={() => setCurrentPage(isLoggedIn ? 'home' : 'login')}
            >
              <Navigation size={18} />
              {isLoggedIn ? 'Go to Tracking' : 'Start Tracking Now'}
            </button>
            <a 
              href="#simulation" 
              className="clay-btn clay-btn-white py-3 px-6 rounded-2xl flex items-center gap-2 text-decoration-none"
            >
              Try Simulator
            </a>
          </div>
        </div>

        {/* Hero Visual Section - Claymorphic Bus Illustration */}
        <div className="flex justify-center items-center">
          <div className="relative w-[320px] h-[320px] flex items-center justify-center">
            {/* Background Clouds */}
            <div className="absolute top-[20px] left-[-10px] w-20 h-9 bg-white rounded-full shadow-[8px_8px_16px_rgba(166,180,200,0.2),inset_-3px_-3px_6px_rgba(166,180,200,0.15),inset_3px_3px_6px_#fff] z-10 anim-float-slow" />
            <div className="absolute bottom-[40px] right-[-20px] w-[100px] h-10 bg-white rounded-full shadow-[8px_8px_16px_rgba(166,180,200,0.2),inset_-3px_-3px_6px_rgba(166,180,200,0.15),inset_3px_3px_6px_#fff] z-10 anim-float" />
            
            {/* Main Clay Logo Badge in Large format */}
            <div className="flex items-center justify-center relative w-[260px] h-[260px] rounded-full bg-clay-blue border-[12px] border-white/45 shadow-[12px_12px_36px_rgba(91,150,245,0.45),inset_-16px_-16px_32px_rgba(0,0,0,0.15),inset_16px_16px_32px_rgba(255,255,255,0.35)]">
              <div className="w-[150px] h-[90px] flex justify-center items-center anim-bounce-slow">
                {/* Yellow Clay Bus Body */}
                <div className="relative w-[140px] h-[75px] bg-clay-yellow rounded-t-[24px] rounded-b-[16px] border-3 border-white/40 shadow-[inset_-8px_-8px_16px_rgba(0,0,0,0.1),inset_8px_8px_16px_rgba(255,255,255,0.4)]">
                  {/* Bus Windows */}
                  <div className="flex gap-2 absolute top-3 left-3">
                    <div className="w-6 h-6 bg-clay-text-dark rounded-md border-[1.5px] border-white/30" />
                    <div className="w-6 h-6 bg-clay-text-dark rounded-md border-[1.5px] border-white/30" />
                    <div className="w-6 h-6 bg-clay-text-dark rounded-md border-[1.5px] border-white/30" />
                  </div>
                  {/* Headlight */}
                  <div className="absolute top-[25px] right-0 w-3 h-3 bg-[#fff7d6] rounded-r-md border-[1.5px] border-clay-yellow-dark" />
                  {/* Bus Wheels */}
                  <div className="absolute -bottom-3 left-5 w-8 h-8 bg-clay-text-dark rounded-full border-3 border-slate-300 shadow-[inset_-2px_-2px_6px_rgba(0,0,0,0.3),inset_2px_2px_6px_rgba(255,255,255,0.2)]" />
                  <div className="absolute -bottom-3 right-5 w-8 h-8 bg-clay-text-dark rounded-full border-3 border-slate-300 shadow-[inset_-2px_-2px_6px_rgba(0,0,0,0.3),inset_2px_2px_6px_rgba(255,255,255,0.2)]" />
                </div>
              </div>
              <div className="absolute top-[25px] right-[85px] rotate-[15deg] anim-float">
                <MapPin size={24} className="text-clay-yellow fill-clay-yellow" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Simulation Dashboard */}
      <section id="simulation" className="py-16">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-friendly font-semibold text-clay-text-dark mb-2">Interactive Bus Tracker Simulator</h2>
          <p className="text-lg text-clay-text-muted max-w-[600px] mx-auto">
            Want to see how it works? Press play to watch the clay bus drive from school to home!
          </p>
        </div>

        <div className="clay-card bg-white flex flex-col gap-8">
          {/* Status Bar */}
          <div className="flex justify-between items-center flex-wrap gap-4 border-b-3 border-clay-bg pb-6">
            <div className="clay-badge clay-badge-blue text-[0.95rem] font-semibold py-2 px-4 rounded-xl">
              <Bus size={16} className="inline mr-1" />
              <span>Bus No. 42B</span>
            </div>
            <div className="font-friendly text-xl text-center">
              <span>Next Stop: </span>
              <strong className="text-clay-blue">{currentStop}</strong>
            </div>
            <div className="clay-badge clay-badge-yellow text-[0.95rem] font-semibold py-2 px-4 rounded-xl">
              <span>ETA: {isSimulating ? Math.max(1, Math.ceil((100 - busPosition) / 10)) : busPosition === 100 ? 0 : 10} Mins</span>
            </div>
          </div>

          {/* Map track */}
          <div className="relative h-[140px] bg-clay-bg rounded-[24px] border-3 border-white/80 shadow-[inset_4px_4px_10px_rgba(166,180,200,0.15),inset_-4px_-4px_10px_rgba(255,255,255,0.8)] overflow-hidden flex items-center">
            {/* Dashed Road Line */}
            <div className="absolute left-[15%] right-[15%] h-2 border-t-4 border-dashed border-slate-300" />

            {/* School Depot Element */}
            <div className="absolute left-[8%] flex flex-col items-center z-10">
              <div className="text-4xl drop-shadow-[2px_4px_6px_rgba(166,180,200,0.4)]">🏫</div>
              <span className="mt-1 font-friendly font-semibold text-[0.9rem] text-clay-text-muted">School</span>
            </div>

            {/* Home Depot Element */}
            <div className="absolute right-[8%] flex flex-col items-center z-10">
              <div className="text-4xl drop-shadow-[2px_4px_6px_rgba(166,180,200,0.4)]">🏡</div>
              <span className="mt-1 font-friendly font-semibold text-[0.9rem] text-clay-text-muted">Home</span>
            </div>

            {/* Animated Driving School Bus */}
            <div 
              className="absolute bottom-12 z-20 -translate-x-1/2 transition-all duration-75"
              style={{
                left: `calc(10% + ${busPosition * 0.76}%)`,
              }}
            >
              <div className="relative w-[65px] h-[38px] bg-clay-yellow rounded-t-xl rounded-b-lg border-2 border-white/40 shadow-[4px_6px_12px_rgba(248,200,71,0.3),inset_-3px_-3px_6px_rgba(0,0,0,0.1),inset_3px_3px_6px_rgba(255,255,255,0.4)]">
                <div className="flex gap-1 absolute top-1.5 left-1.5">
                  <span className="text-[0.75rem]">🧒</span>
                  <span className="text-[0.75rem]">👧</span>
                </div>
                <div className="absolute -bottom-1.5 left-2 w-4 h-4 bg-clay-text-dark rounded-full border border-slate-300" />
                <div className="absolute -bottom-1.5 right-2 w-4 h-4 bg-clay-text-dark rounded-full border border-slate-300" />
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-3">
            {!isSimulating ? (
              <button className="clay-btn clay-btn-green py-3 px-6 rounded-2xl flex items-center gap-2" onClick={handleStartSimulation}>
                <Play size={18} fill="#ffffff" />
                {busPosition === 100 ? 'Restart Simulation' : 'Start Simulation'}
              </button>
            ) : (
              <button className="clay-btn clay-btn-orange py-3 px-6 rounded-2xl flex items-center gap-2" onClick={handleResetSimulation}>
                <RotateCcw size={18} />
                Reset Bus
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="py-12">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-friendly font-semibold text-clay-text-dark mb-2">Built Just For You</h2>
          <p className="text-lg text-clay-text-muted max-w-[600px] mx-auto">
            Our special features make your daily commute safe, easy, and awesome.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Card 1 */}
          <div className="clay-card flex flex-col items-center text-center gap-4 rounded-[32px]">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/15 border-2 border-amber-500/30 shadow-[inset_-2px_-2px_6px_rgba(248,200,71,0.15),inset_2px_2px_6px_#fff]">
              <MapPin size={32} className="text-clay-yellow-dark" />
            </div>
            <h3 className="text-[1.35rem] font-semibold text-clay-text-dark font-friendly">Live Map Tracking</h3>
            <p className="text-[0.95rem] leading-relaxed text-clay-text-muted">
              See your school bus crawling on our digital playground map. Know exactly which corner the bus is turning and skip the cold bus stop wait!
            </p>
          </div>

          {/* Card 2 */}
          <div className="clay-card flex flex-col items-center text-center gap-4 rounded-[32px]">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-clay-blue/15 border-2 border-clay-blue/30 shadow-[inset_-2px_-2px_6px_rgba(91,150,245,0.15),inset_2px_2px_6px_#fff]">
              <Bell size={32} className="text-clay-blue-dark" />
            </div>
            <h3 className="text-[1.35rem] font-semibold text-clay-text-dark font-friendly">Instant Safety Pings</h3>
            <p className="text-[0.95rem] leading-relaxed text-clay-text-muted">
              Driver hit morning traffic or a weather delay? Instantly receive a notification bubble on your screen so you and your parents stay informed.
            </p>
          </div>

          {/* Card 3 */}
          <div className="clay-card flex flex-col items-center text-center gap-4 rounded-[32px]">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-clay-green/15 border-2 border-clay-green/30 shadow-[inset_-2px_-2px_6px_rgba(92,192,117,0.15),inset_2px_2px_6px_#fff]">
              <Share2 size={32} className="text-clay-green-dark" />
            </div>
            <h3 className="text-[1.35rem] font-semibold text-clay-text-dark font-friendly">Family Coordination</h3>
            <p className="text-[0.95rem] leading-relaxed text-clay-text-muted">
              Keep your parents connected! Share automatic status updates when you board or disembark, keeping the whole family happy and in sync.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
