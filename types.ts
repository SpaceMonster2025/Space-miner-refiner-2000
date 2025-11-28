
export type Vector2 = { x: number; y: number };

export enum MineralType {
  FerroNickel = 'Ferro-Nickel',
  Silicon = 'Silicon Crystal',
  Cobalt = 'Cobalt Ore',
  Aetherium = 'Aetherium Dust',
  Quantum = 'Quantum Fluid'
}

export enum EntityType {
  Player,
  Asteroid,
  Loot,
  Particle,
  Station,
  Projectile
}

export interface Entity {
  id: string;
  type: EntityType;
  pos: Vector2;
  vel: Vector2;
  radius: number;
  rotation: number;
  markedForDeletion: boolean;
}

export interface Asteroid extends Entity {
  type: EntityType.Asteroid;
  tier: 1 | 2 | 3;
  hp: number;
  maxHp: number;
  mineral: MineralType;
  vertices: Vector2[]; // For jagged drawing
}

export interface Loot extends Entity {
  type: EntityType.Loot;
  mineral: MineralType;
  value: number;
  attracted: boolean;
}

export interface Particle extends Entity {
  type: EntityType.Particle;
  life: number;
  maxLife: number;
  color: string;
}

export enum StationType {
  Refinery,
  Trade
}

export interface Station extends Entity {
  type: EntityType.Station;
  name: string;
  stationType: StationType;
  specialization: MineralType[];
}

export interface CargoItem {
  type: MineralType;
  quantity: number;
  isRefined: boolean;
}

export interface RefiningJob {
  id: string;
  mineral: MineralType;
  quantity: number;
  startTime: number;
  duration: number; // ms
  cost: number;
  ready: boolean;
}

export interface RefineryAccount {
  raw: Partial<Record<MineralType, number>>;
  refined: Partial<Record<MineralType, number>>;
  jobs: RefiningJob[];
}

export interface PlayerShip extends Entity {
  type: EntityType.Player;
  cargo: CargoItem[];
  refineryAccount: RefineryAccount;
  maxCargo: number;
  credits: number;
  health: number;
  maxHealth: number;
  miningPower: number;
  tractorRange: number;
  enginePower: number;
}

// Stats used for upgrades
export interface ShipStats {
  cargoCapacity: number;
  miningEfficiency: number;
  tractorBeam: number;
  thrusterSpeed: number;
  scanRange: number;
}

export interface UpgradeCost {
  base: number;
  multiplier: number;
}
