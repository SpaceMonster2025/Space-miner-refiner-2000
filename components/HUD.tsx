
import React from 'react';
import { PlayerShip, MineralType } from '../types';
import { MINERAL_COLORS } from '../constants';

interface HUDProps {
  player: PlayerShip;
  dockAvailable: boolean;
}

const HUD: React.FC<HUDProps> = ({ player, dockAvailable }) => {
  const cargoCount = player.cargo.reduce((a, b) => a + b.quantity, 0);
  const cargoPercent = (cargoCount / player.maxCargo) * 100;

  return (
    <div className="absolute inset-0 pointer-events-none select-none p-6 flex flex-col justify-between">
      
      {/* Top Bar */}
      <div className="flex justify-between items-start">
        
        {/* Cargo */}
        <div className="bg-space-800/80 backdrop-blur-md rounded-lg p-3 border border-slate-700 w-80">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs uppercase text-slate-400 font-bold tracking-widest">Cargo Bay</span>
            <span className="text-xs text-slate-300 font-mono">{cargoCount}/{player.maxCargo}</span>
          </div>
          <div className="h-2 bg-slate-900 rounded-full overflow-hidden mb-2">
             <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${cargoPercent}%` }}></div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {player.cargo.map((c, i) => (
              <div 
                key={i} 
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${c.isRefined ? 'bg-amber-900/30 border-amber-500/50' : 'bg-slate-900/50 border-slate-700/50'}`}
              >
                <div 
                    className={`w-2 h-2 rounded-full ${c.isRefined ? 'animate-pulse' : ''}`} 
                    style={{ backgroundColor: MINERAL_COLORS[c.type], boxShadow: c.isRefined ? `0 0 5px ${MINERAL_COLORS[c.type]}` : 'none' }}
                ></div>
                <span className={`${c.isRefined ? 'text-white font-bold' : 'text-slate-400'}`}>{c.quantity}</span>
                {c.isRefined && <span className="text-[8px] text-amber-500 font-bold ml-1">REF</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Credits */}
        <div className="bg-space-800/80 backdrop-blur-md rounded-full px-6 py-2 border border-slate-700 flex items-center gap-2">
            <span className="text-emerald-400 font-mono text-xl">{Math.floor(player.credits)}</span>
            <span className="text-xs text-emerald-700 font-bold uppercase">CR</span>
        </div>
      </div>

      {/* Center Messages */}
      {dockAvailable && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center animate-pulse-slow">
           <div className="bg-black/50 backdrop-blur px-4 py-2 rounded text-white border border-white/20">
              Press <span className="font-bold text-amber-400">[E]</span> to Dock
           </div>
        </div>
      )}

      {/* Bottom Bar */}
      <div className="flex justify-between items-end">
        {/* Status */}
        <div className="bg-space-800/80 backdrop-blur-md rounded-lg p-3 border border-slate-700 w-48">
            <div className="flex justify-between items-center mb-1">
                <span className="text-xs uppercase text-slate-400 font-bold tracking-widest">Integrity</span>
            </div>
            <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${(player.health / player.maxHealth) * 100}%` }}></div>
            </div>
        </div>

        {/* Controls Hint */}
        <div className="text-xs text-slate-500 text-right space-y-1">
            <p><span className="text-slate-300">WASD</span> Thrust</p>
            <p><span className="text-slate-300">L-Click</span> Mining Laser</p>
            <p><span className="text-slate-300">R-Click</span> Tractor Beam</p>
            <p><span className="text-slate-300">Wheel</span> Zoom</p>
        </div>
      </div>
    </div>
  );
};

export default HUD;
