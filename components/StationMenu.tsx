
import React, { useState, useEffect } from 'react';
import { MineralType, PlayerShip, Station, StationType } from '../types';
import { MINERAL_BASE_VALUES, MINERAL_COLORS, UPGRADE_COSTS } from '../constants';

interface StationMenuProps {
  player: PlayerShip;
  station: Station;
  onClose: () => void;
  // Actions
  onSellRefined: (type: MineralType, amount: number, price: number) => void;
  onUpgrade: (type: 'cargo' | 'mining' | 'tractor' | 'engine', cost: number) => boolean;
  onDeposit: (type: MineralType, amount: number) => void;
  onRefine: (type: MineralType, amount: number, tier: 'standard' | 'priority') => void;
  onWithdraw: (type: MineralType, amount: number) => void;
}

const StationMenu: React.FC<StationMenuProps> = ({ 
    player, station, onClose, 
    onSellRefined, onUpgrade, onDeposit, onRefine, onWithdraw 
}) => {
  const [activeTab, setActiveTab] = useState<'market' | 'refinery' | 'hangar'>('market');
  
  // Set default tab based on station type
  useEffect(() => {
    if (station.stationType === StationType.Refinery) setActiveTab('refinery');
    else setActiveTab('market');
  }, [station]);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-3/4 max-w-5xl h-3/4 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl flex overflow-hidden">
        
        {/* Sidebar */}
        <div className="w-1/4 bg-slate-800 p-6 flex flex-col border-r border-slate-700">
          <div className="mb-8">
            <h2 className={`text-2xl font-bold mb-1 ${station.stationType === StationType.Refinery ? 'text-amber-400' : 'text-teal-400'}`}>
                {station.name}
            </h2>
            <p className="text-slate-400 text-sm">
                {station.stationType === StationType.Refinery ? 'Refinery & Manufacturing' : 'Trade Hub'}
            </p>
          </div>
          
          <div className="mb-4 space-y-4">
            <div>
                <span className="text-xs uppercase text-slate-500 tracking-wider">Credits</span>
                <div className="text-2xl font-mono text-emerald-400">{Math.floor(player.credits)} cr</div>
            </div>
            <div>
                <span className="text-xs uppercase text-slate-500 tracking-wider">Cargo</span>
                <div className="text-xl font-mono text-sky-400">
                    {player.cargo.reduce((a, b) => a + b.quantity, 0)} / {player.maxCargo}
                </div>
            </div>
          </div>
          
          <div className="flex-1"></div>

          <div className="space-y-2 mb-6">
             {station.stationType === StationType.Refinery ? (
                 <>
                    <button onClick={() => setActiveTab('refinery')} className={`w-full py-2 px-4 rounded text-left ${activeTab === 'refinery' ? 'bg-amber-900/40 text-amber-200 border border-amber-800' : 'hover:bg-slate-700 text-slate-300'}`}>
                        Refining Operations
                    </button>
                    <button onClick={() => setActiveTab('hangar')} className={`w-full py-2 px-4 rounded text-left ${activeTab === 'hangar' ? 'bg-amber-900/40 text-amber-200 border border-amber-800' : 'hover:bg-slate-700 text-slate-300'}`}>
                        Ship Upgrades
                    </button>
                 </>
             ) : (
                <>
                    <button onClick={() => setActiveTab('market')} className={`w-full py-2 px-4 rounded text-left ${activeTab === 'market' ? 'bg-teal-900/40 text-teal-200 border border-teal-800' : 'hover:bg-slate-700 text-slate-300'}`}>
                        Trade Market
                    </button>
                </>
             )}
          </div>

          <button 
            onClick={onClose}
            className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
          >
            Undock Ship
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-y-auto bg-slate-900/50">
          
          {/* REFINERY VIEW */}
          {activeTab === 'refinery' && station.stationType === StationType.Refinery && (
              <div className="space-y-8">
                  {/* Account Overview */}
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
                          <h4 className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-wide">Raw Ore Storage</h4>
                          <div className="space-y-1">
                              {Object.values(MineralType).map(m => {
                                  const qty = player.refineryAccount.raw[m] || 0;
                                  return (
                                      <div key={m} className="flex justify-between text-sm">
                                          <span style={{color: MINERAL_COLORS[m]}}>{m}</span>
                                          <span className="font-mono text-slate-300">{qty}</span>
                                      </div>
                                  )
                              })}
                          </div>
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
                          <h4 className="text-sm font-bold text-emerald-400 mb-2 uppercase tracking-wide">Refined Storage</h4>
                          <div className="space-y-1">
                              {Object.values(MineralType).map(m => {
                                  const qty = player.refineryAccount.refined[m] || 0;
                                  return (
                                      <div key={m} className="flex justify-between text-sm items-center">
                                          <span style={{color: MINERAL_COLORS[m]}} className="font-semibold">{m}</span>
                                          <div className="flex gap-3 items-center">
                                            <span className="font-mono text-emerald-300">{qty}</span>
                                            <button 
                                                onClick={() => onWithdraw(m, 1)}
                                                disabled={qty <= 0}
                                                className="text-[10px] bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded text-white disabled:opacity-20"
                                            >
                                                RETRIEVE
                                            </button>
                                          </div>
                                      </div>
                                  )
                              })}
                          </div>
                      </div>
                  </div>

                  {/* Deposit Section */}
                  <div className="bg-slate-800/30 p-6 rounded border border-slate-700">
                      <h3 className="text-lg font-semibold text-slate-200 mb-4">Deposit Raw Ore</h3>
                      <div className="flex flex-wrap gap-2">
                        {player.cargo.filter(c => !c.isRefined).length === 0 && <span className="text-slate-500 italic text-sm">No raw ore in ship cargo.</span>}
                        {player.cargo.filter(c => !c.isRefined).map((c, i) => (
                            <div key={i} className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded border border-slate-700">
                                <div className="w-3 h-3 rounded-full" style={{backgroundColor: MINERAL_COLORS[c.type]}}></div>
                                <span className="text-sm text-slate-300">{c.type}</span>
                                <span className="text-sm font-mono text-slate-500">x{c.quantity}</span>
                                <button 
                                    onClick={() => onDeposit(c.type, c.quantity)}
                                    className="ml-2 text-xs bg-amber-900/50 text-amber-200 px-2 py-1 rounded hover:bg-amber-800"
                                >
                                    Deposit All
                                </button>
                            </div>
                        ))}
                      </div>
                  </div>

                  {/* Active Jobs */}
                  <div className="bg-slate-800/30 p-6 rounded border border-slate-700">
                      <h3 className="text-lg font-semibold text-slate-200 mb-4">Processing Queue</h3>
                      <div className="space-y-2">
                          {player.refineryAccount.jobs.length === 0 && <span className="text-slate-500 italic text-sm">No active jobs.</span>}
                          {player.refineryAccount.jobs.map(job => {
                              const progress = Math.min(100, ((Date.now() - job.startTime) / job.duration) * 100);
                              return (
                                  <div key={job.id} className="bg-slate-900 p-3 rounded border border-slate-700 flex items-center gap-4">
                                      <div className="flex-1">
                                          <div className="flex justify-between text-xs text-slate-400 mb-1">
                                              <span>Refining {job.mineral} x{job.quantity}</span>
                                              <span>{progress < 100 ? `${Math.floor((job.duration - (Date.now() - job.startTime))/1000)}s` : 'COMPLETE'}</span>
                                          </div>
                                          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                              <div className="h-full bg-amber-500 transition-all duration-1000" style={{width: `${progress}%`}}></div>
                                          </div>
                                      </div>
                                  </div>
                              )
                          })}
                      </div>
                  </div>

                  {/* Start New Job */}
                  <div className="bg-slate-800/30 p-6 rounded border border-slate-700">
                      <h3 className="text-lg font-semibold text-slate-200 mb-4">Start Refining Job</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {Object.values(MineralType).map(m => {
                             const available = player.refineryAccount.raw[m] || 0;
                             if (available === 0) return null;
                             
                             return (
                                 <div key={m} className="bg-slate-900 p-4 rounded border border-slate-800">
                                     <div className="flex justify-between items-center mb-4">
                                         <span style={{color: MINERAL_COLORS[m]}} className="font-bold">{m}</span>
                                         <span className="text-xs text-slate-500">Available: {available}</span>
                                     </div>
                                     <div className="space-y-2">
                                         <button 
                                            disabled={available < 10 || player.credits < 100}
                                            onClick={() => onRefine(m, 10, 'standard')}
                                            className="w-full flex justify-between items-center px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm disabled:opacity-30"
                                         >
                                             <span>Batch (10) - Standard (5m)</span>
                                             <span className="text-amber-400">100cr</span>
                                         </button>
                                         <button 
                                            disabled={available < 10 || player.credits < 250}
                                            onClick={() => onRefine(m, 10, 'priority')}
                                            className="w-full flex justify-between items-center px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm disabled:opacity-30"
                                         >
                                             <span>Batch (10) - Priority (1m)</span>
                                             <span className="text-amber-400">250cr</span>
                                         </button>
                                     </div>
                                 </div>
                             )
                         })}
                      </div>
                  </div>
              </div>
          )}

          {/* TRADE VIEW */}
          {activeTab === 'market' && station.stationType === StationType.Trade && (
              <div>
                  <div className="mb-6 bg-teal-900/20 p-4 rounded border border-teal-900/50">
                      <h4 className="text-teal-400 font-bold mb-2">Market Demand</h4>
                      <div className="flex gap-2">
                          {station.specialization.map(m => (
                              <span key={m} className="text-xs bg-teal-900 text-teal-200 px-2 py-1 rounded border border-teal-700">
                                  +10% Bonus: {m}
                              </span>
                          ))}
                      </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                      {Object.values(MineralType).map(m => {
                          const stock = player.cargo.find(c => c.type === m && c.isRefined)?.quantity || 0;
                          const basePrice = MINERAL_BASE_VALUES[m] * 5; // Refined Value
                          const isSpecial = station.specialization.includes(m);
                          const finalPrice = Math.floor(basePrice * (isSpecial ? 1.1 : 1.0));

                          return (
                            <div key={m} className="flex items-center justify-between bg-slate-800/50 p-4 rounded border border-slate-700">
                                <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full border-2 border-white/50" style={{ backgroundColor: MINERAL_COLORS[m], boxShadow: `0 0 10px ${MINERAL_COLORS[m]}` }}></div>
                                <div>
                                    <div className="font-medium text-slate-200">{m} <span className="text-xs text-amber-300 font-bold">REFINED</span></div>
                                    <div className="text-xs text-slate-500">Market Price: {finalPrice} cr {isSpecial && <span className="text-teal-400">(High Demand)</span>}</div>
                                </div>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="text-xs text-slate-400">Cargo</div>
                                    <div className="font-mono text-lg">{stock}</div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                      onClick={() => onSellRefined(m, 1, finalPrice)}
                                      disabled={stock === 0}
                                      className="px-3 py-2 bg-emerald-900/50 hover:bg-emerald-800 text-emerald-300 border border-emerald-700/50 rounded disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                                  >
                                      Sell 1
                                  </button>
                                  <button
                                      onClick={() => onSellRefined(m, stock, finalPrice)}
                                      disabled={stock === 0}
                                      className="px-3 py-2 bg-emerald-900/50 hover:bg-emerald-800 text-emerald-300 border border-emerald-700/50 rounded disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold"
                                  >
                                      Sell All
                                  </button>
                                </div>
                                </div>
                            </div>
                          )
                      })}
                  </div>
              </div>
          )}

          {/* UPGRADES VIEW (Shared visuals) */}
          {activeTab === 'hangar' && (
             <div className="grid grid-cols-2 gap-4">
                {[
                { id: 'cargo', name: 'Cargo Bay Expansion', desc: 'Increases capacity by 4 slots', current: player.maxCargo },
                { id: 'mining', name: 'Focus Lens', desc: 'Increases laser efficiency', current: player.miningPower.toFixed(1) },
                { id: 'tractor', name: 'Mag-Beam Amplifier', desc: 'Increases beam range', current: player.tractorRange.toFixed(0) },
                { id: 'engine', name: 'Ion Thrusters', desc: 'Increases flight speed', current: player.enginePower.toFixed(2) }
                ].map((upg) => {
                const type = upg.id as keyof typeof UPGRADE_COSTS;
                const cost = Math.floor(UPGRADE_COSTS[type].base); 

                return (
                    <div key={upg.id} className="bg-slate-800/50 p-4 rounded border border-slate-700 flex flex-col justify-between">
                    <div>
                        <h4 className="font-semibold text-slate-300">{upg.name}</h4>
                        <p className="text-xs text-slate-500 mb-2">{upg.desc}</p>
                        <div className="text-xs text-amber-500/80 mb-4">Current Stat: {upg.current}</div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <span className="text-amber-400 font-mono">{cost} cr</span>
                        <button 
                            onClick={() => onUpgrade(type as any, cost)}
                            className="px-3 py-1 bg-amber-900/30 hover:bg-amber-800/50 text-amber-200 border border-amber-700/30 rounded text-sm transition-colors"
                        >
                            Install
                        </button>
                    </div>
                    </div>
                );
                })}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default StationMenu;
