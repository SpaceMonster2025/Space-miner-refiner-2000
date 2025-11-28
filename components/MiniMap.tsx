import React, { forwardRef } from 'react';

const MiniMap = forwardRef<HTMLCanvasElement>((_, ref) => {
  return (
    <div className="absolute bottom-6 right-6 w-[200px] h-[200px] bg-slate-900/80 border border-slate-700 rounded-lg overflow-hidden backdrop-blur-md shadow-xl z-20">
      <div className="absolute top-2 left-3 text-[10px] font-mono text-slate-500 tracking-widest pointer-events-none select-none">
        SECTOR SCAN
      </div>
      <canvas 
        ref={ref} 
        width={200} 
        height={200} 
        className="w-full h-full block"
      />
    </div>
  );
});

export default MiniMap;