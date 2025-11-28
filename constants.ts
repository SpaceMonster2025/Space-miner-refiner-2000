
import { MineralType, StationType, UpgradeCost } from './types';

export const WORLD_SIZE = 40000; // Size of the play area
export const SCREEN_WIDTH = window.innerWidth;
export const SCREEN_HEIGHT = window.innerHeight;

export const MINERAL_COLORS: Record<MineralType, string> = {
  [MineralType.FerroNickel]: '#7a828e', // Gray-blue
  [MineralType.Silicon]: '#2dd4bf', // Teal glow
  [MineralType.Cobalt]: '#7e22ce', // Deep purple
  [MineralType.Aetherium]: '#fbbf24', // Golden
  [MineralType.Quantum]: '#ffffff', // White
};

// Base value for RAW minerals (low value if sold directly, if logic allows)
// REFINED value is 5x this.
export const MINERAL_BASE_VALUES: Record<MineralType, number> = {
  [MineralType.FerroNickel]: 10,
  [MineralType.Silicon]: 25,
  [MineralType.Cobalt]: 60,
  [MineralType.Aetherium]: 150,
  [MineralType.Quantum]: 500,
};

export const STATION_DEFINITIONS = [
  {
    name: "The Forge",
    type: StationType.Refinery,
    pos: { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 },
    specialization: []
  },
  {
    name: "Nexus-7",
    type: StationType.Trade,
    pos: { x: WORLD_SIZE / 2 + 5000, y: WORLD_SIZE / 2 - 5000 },
    specialization: [MineralType.Silicon, MineralType.Quantum]
  },
  {
    name: "Outpost Zeta",
    type: StationType.Trade,
    pos: { x: WORLD_SIZE / 2 - 6000, y: WORLD_SIZE / 2 + 4000 },
    specialization: [MineralType.FerroNickel, MineralType.Cobalt]
  },
  {
    name: "Void Monastery",
    type: StationType.Trade,
    pos: { x: WORLD_SIZE / 2 - 3000, y: WORLD_SIZE / 2 - 7000 },
    specialization: [MineralType.Aetherium]
  }
];

export const UPGRADE_COSTS: Record<string, UpgradeCost> = {
  cargo: { base: 500, multiplier: 1.5 },
  mining: { base: 750, multiplier: 1.4 },
  tractor: { base: 400, multiplier: 1.3 },
  engine: { base: 600, multiplier: 1.4 },
};

export const FRICTION = 0.98;
export const TURN_SPEED = 0.08;
export const TRACTOR_FORCE = 0.4;
