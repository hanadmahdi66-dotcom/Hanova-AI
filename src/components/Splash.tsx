import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

interface SplashProps {
  onComplete: () => void;
}

export default function Splash({ onComplete }: SplashProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    const timer = setTimeout(() => {
      onComplete();
    }, 6000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-[#FAFAFA] flex flex-col justify-between items-center text-slate-900 z-50 p-8 overflow-hidden select-none border-8 border-slate-100">
      {/* Tiny subtle background decor items (honest & non-distracting) */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-100/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-200/40 rounded-full blur-[120px] pointer-events-none" />

      {/* Decorative top spacer */}
      <div />

      {/* Main Branding Block */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1.0, ease: "easeOut" }}
        className="flex flex-col items-center text-center space-y-4 relative z-10"
      >
        {/* Modern clean logo token - crisp solid border */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="p-4 bg-white border-2 border-slate-200 rounded-2xl shadow-sm mb-3"
        >
          <Sparkles className="h-10 w-10 text-blue-600" />
        </motion.div>

        <h1 className="text-6xl md:text-8xl font-sans font-black tracking-tighter text-slate-900 uppercase leading-none">
          Hanova
        </h1>
        
        <p className="text-[10px] md:text-xs uppercase tracking-[0.25em] font-bold text-slate-400 mt-1 italic">
          Modern Intelligent Utility
        </p>

        {/* Dynamic Loading Pulsar */}
        <div className="pt-6 flex items-center space-x-2">
          <span className="text-xs font-mono font-bold text-blue-600 uppercase tracking-widest">
            Initializing System{dots}
          </span>
        </div>
      </motion.div>

      {/* App Footer Credits */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="text-center pb-4 relative z-10"
      >
        <p className="text-xs font-mono font-extrabold tracking-[0.2em] text-slate-400 uppercase">
          Powered by MHHS GAME INC
        </p>
      </motion.footer>
    </div>
  );
}
