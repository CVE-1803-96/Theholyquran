import React from 'react';

export const HeavenlyBackground = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-heaven-50">
      {/* Base Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-heaven-50 via-[#fff9e6] to-divine-50 pointer-events-none" />

      {/* Sun/Light Source */}
      <div 
        className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full pointer-events-none opacity-60"
        style={{
          background: 'radial-gradient(circle, rgba(255,215,100,0.25) 0%, rgba(255,248,225,0.1) 50%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Floating Orbs/Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[20%] left-[10%] w-64 h-64 bg-heaven-200/20 rounded-full blur-3xl animate-float" style={{ animationDuration: '15s' }} />
        <div className="absolute bottom-[20%] right-[10%] w-96 h-96 bg-divine-200/10 rounded-full blur-3xl animate-float" style={{ animationDuration: '20s', animationDelay: '-5s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
};
