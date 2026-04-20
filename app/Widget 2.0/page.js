import React from 'react';

const KavishaWidget = () => {
  return (
    // 1. THE BACKGROUND: Light orange, centering the content, and a subtle "pulse" animation
    <div className="min-h-screen w-full bg-orange-50 flex flex-col items-center justify-center p-6 animate-pulse">

      {/* 2. THE HEADING: Kavisha AI Widget */}
      <h1 className="mb-8 text-4xl md:text-6xl font-black text-orange-900 tracking-tight drop-shadow-sm">
        Kavisha AI Widget
      </h1>

      {/* 3. THE CARD: Dull Maroon to Violet Gradient */}
      {/* 'hover:scale-105' is a 2D animation that happens when you mouse over it */}
      <div className="max-w-md w-full p-8 rounded-3xl shadow-2xl transition-transform duration-500 hover:scale-105 
                      bg-gradient-to-br from-[#6b1d1d] to-[#4c1d95]">

        <h2 className="text-2xl font-bold text-white mb-4">
          Meet Kavisha
        </h2>

        <p className="text-white text-opacity-90 leading-relaxed text-lg">
          Kavisha is a next-generation AI chatbot designed to simplify your workflow.
          By blending emotional intelligence with high-speed data processing,
          she provides answers that aren't just accurate—they're helpful.
        </p>

        {/* A little decorative button inside the card */}
        <button className="mt-6 w-full py-3 bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-semibold rounded-xl backdrop-blur-sm transition-all">
          Chat Now
        </button>
      </div>

    </div>
  );
};

export default KavishaWidget;