
import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './services/GameEngine';
import HUD from './components/HUD';
import StationMenu from './components/StationMenu';
import MiniMap from './components/MiniMap';
import { PlayerShip, Station, MineralType, StationType } from './types';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniMapRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [playerState, setPlayerState] = useState<PlayerShip>({
    id: 'player',
    type: 0,
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    radius: 0,
    rotation: 0,
    markedForDeletion: false,
    cargo: [],
    maxCargo: 10,
    credits: 0,
    health: 100,
    maxHealth: 100,
    miningPower: 1,
    tractorRange: 100,
    enginePower: 0.1,
    refineryAccount: { raw: {}, refined: {}, jobs: [] }
  });

  const [nearbyStation, setNearbyStation] = useState<Station | null>(null);
  const [isDocked, setIsDocked] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Set canvas to full screen
    canvasRef.current.width = window.innerWidth;
    canvasRef.current.height = window.innerHeight;

    const engine = new GameEngine(
      canvasRef.current,
      (updates) => {
        setPlayerState(prev => ({ ...prev, ...updates }));
      },
      (station) => {
        setNearbyStation(station);
      }
    );

    if (miniMapRef.current) {
      engine.setMiniMap(miniMapRef.current);
    }

    engine.start();
    engineRef.current = engine;

    // Init player state from engine
    setPlayerState({ ...engine.player });

    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Handle docking interaction
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyE' && nearbyStation && !isDocked) {
        setIsDocked(true);
      } else if (e.code === 'Escape' && isDocked) {
        setIsDocked(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nearbyStation, isDocked]);

  const handleSellRefined = (type: MineralType, amount: number, price: number) => {
    engineRef.current?.sellRefinedMineral(type, amount, price);
  };

  const handleUpgrade = (type: 'cargo' | 'mining' | 'tractor' | 'engine', cost: number) => {
    return engineRef.current?.buyUpgrade(type, cost) ?? false;
  };
  
  const handleDeposit = (type: MineralType, amount: number) => {
      engineRef.current?.depositOre(type, amount);
  };

  const handleRefine = (type: MineralType, amount: number, tier: 'standard' | 'priority') => {
      engineRef.current?.startRefiningJob(type, amount, tier);
  };

  const handleWithdraw = (type: MineralType, amount: number) => {
      engineRef.current?.withdrawRefined(type, amount);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-space-900">
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />
      
      <HUD 
        player={playerState} 
        dockAvailable={!!nearbyStation && !isDocked} 
      />
      
      <MiniMap ref={miniMapRef} />

      {isDocked && nearbyStation && (
        <StationMenu 
          player={playerState}
          station={nearbyStation}
          onClose={() => setIsDocked(false)}
          onSellRefined={handleSellRefined}
          onUpgrade={handleUpgrade}
          onDeposit={handleDeposit}
          onRefine={handleRefine}
          onWithdraw={handleWithdraw}
        />
      )}
    </div>
  );
};

export default App;
