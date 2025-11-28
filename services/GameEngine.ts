
import { Asteroid, EntityType, Loot, MineralType, Particle, PlayerShip, Station, Vector2, StationType, RefiningJob } from '../types';
import { FRICTION, MINERAL_COLORS, WORLD_SIZE, TRACTOR_FORCE, TURN_SPEED, STATION_DEFINITIONS } from '../constants';
import { vecAdd, vecSub, vecMult, vecLen, vecNorm, dist, generatePolygon, randomRange } from './MathUtils';
import { AudioManager } from './AudioManager';

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  player: PlayerShip;
  entities: (Asteroid | Loot | Particle | Station)[];
  camera: Vector2 = { x: 0, y: 0 };
  
  keys: Set<string> = new Set();
  mousePos: Vector2 = { x: 0, y: 0 };
  isMouseDown: boolean = false;
  isRightMouseDown: boolean = false;
  
  // Audio
  audio: AudioManager;
  
  // Zoom properties
  zoom: number = 1;
  targetZoom: number = 1;

  // Laser properties
  laserHitPoint: Vector2 | null = null;
  
  // Screen Shake properties
  shakeTimer: number = 0;
  shakeStrength: number = 0;

  // MiniMap properties
  miniMapCanvas: HTMLCanvasElement | null = null;
  miniMapCtx: CanvasRenderingContext2D | null = null;

  lastTime: number = 0;
  onStatsUpdate: (stats: Partial<PlayerShip>) => void;
  onStationProximity: (station: Station | null) => void;

  constructor(
    canvas: HTMLCanvasElement, 
    onStatsUpdate: (stats: Partial<PlayerShip>) => void,
    onStationProximity: (station: Station | null) => void
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.onStatsUpdate = onStatsUpdate;
    this.onStationProximity = onStationProximity;

    // Initialize Audio
    this.audio = new AudioManager();

    // Initialize Player
    this.player = {
      id: 'player',
      type: EntityType.Player,
      pos: { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 + 300 }, // Slightly offset from Forge
      vel: { x: 0, y: 0 },
      radius: 15,
      rotation: -Math.PI/2,
      markedForDeletion: false,
      cargo: [],
      maxCargo: 12,
      credits: 500, // Starting credits for refining
      health: 100,
      maxHealth: 100,
      miningPower: 1, 
      tractorRange: 200,
      enginePower: 0.2,
      refineryAccount: {
        raw: {},
        refined: {},
        jobs: []
      }
    };

    this.entities = [];
    this.initWorld();
    this.bindEvents();
  }

  setMiniMap(canvas: HTMLCanvasElement) {
    this.miniMapCanvas = canvas;
    this.miniMapCtx = canvas.getContext('2d');
  }

  initWorld() {
    // Generate Stations from Constants
    STATION_DEFINITIONS.forEach((def, idx) => {
      const station: Station = {
        id: `station-${idx}`,
        type: EntityType.Station,
        pos: def.pos,
        vel: { x: 0, y: 0 },
        radius: def.type === StationType.Refinery ? 80 : 60,
        rotation: 0,
        markedForDeletion: false,
        name: def.name,
        stationType: def.type,
        specialization: def.specialization
      };
      this.entities.push(station);
    });

    // Generate Asteroids
    for (let i = 0; i < 1200; i++) {
      this.spawnAsteroid(1);
    }
  }

  spawnAsteroid(tier: 1 | 2 | 3, pos?: Vector2) {
    const position = pos || {
      x: randomRange(0, WORLD_SIZE),
      y: randomRange(0, WORLD_SIZE)
    };
    
    // Check collision with stations
    let tooClose = false;
    if (!pos) {
       // Avoid spawning on player
       if (dist(position, this.player.pos) < 500) tooClose = true;
       // Avoid spawning on stations
       this.entities.forEach(e => {
         if (e.type === EntityType.Station && dist(position, e.pos) < 400) tooClose = true;
       });
    }
    if (tooClose) return;

    const minerals = Object.values(MineralType);
    // Simple rarity distribution
    const rand = Math.random();
    let mineral = MineralType.FerroNickel;
    if (rand > 0.6) mineral = MineralType.Silicon;
    if (rand > 0.85) mineral = MineralType.Cobalt;
    if (rand > 0.95) mineral = MineralType.Aetherium;
    if (rand > 0.99) mineral = MineralType.Quantum;

    const sizes = { 1: 50, 2: 25, 3: 12 };
    const hp = { 1: 300, 2: 150, 3: 50 };

    const asteroid: Asteroid = {
      id: `ast-${Date.now()}-${Math.random()}`,
      type: EntityType.Asteroid,
      pos: position,
      vel: { x: randomRange(-0.5, 0.5), y: randomRange(-0.5, 0.5) },
      radius: sizes[tier],
      rotation: randomRange(0, Math.PI * 2),
      markedForDeletion: false,
      tier,
      hp: hp[tier],
      maxHp: hp[tier],
      mineral: mineral,
      vertices: generatePolygon(sizes[tier], 8, sizes[tier] * 0.3)
    };
    this.entities.push(asteroid);
  }

  spawnLoot(pos: Vector2, mineral: MineralType) {
    const loot: Loot = {
      id: `loot-${Date.now()}-${Math.random()}`,
      type: EntityType.Loot,
      pos: { ...pos },
      vel: { x: randomRange(-1, 1), y: randomRange(-1, 1) },
      radius: 6,
      rotation: randomRange(0, Math.PI * 2),
      markedForDeletion: false,
      mineral,
      value: 1,
      attracted: false
    };
    this.entities.push(loot);
  }

  spawnParticles(pos: Vector2, color: string, count: number) {
    for(let i=0; i<count; i++) {
      const p: Particle = {
        id: `p-${Math.random()}`,
        type: EntityType.Particle,
        pos: { ...pos },
        vel: { x: randomRange(-2, 2), y: randomRange(-2, 2) },
        radius: randomRange(1, 3),
        rotation: 0,
        markedForDeletion: false,
        life: 1.0,
        maxLife: 1.0,
        color
      };
      this.entities.push(p);
    }
  }

  triggerShake(strength: number) {
    this.shakeStrength = strength;
    this.shakeTimer = 0.4; // 400ms shake
  }

  bindEvents() {
    const startAudio = () => this.audio.resume();

    window.addEventListener('keydown', (e) => {
        this.keys.add(e.code);
        startAudio();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos = { 
        x: e.clientX - rect.left, 
        y: e.clientY - rect.top 
      };
    });
    this.canvas.addEventListener('mousedown', (e) => {
      startAudio();
      if (e.button === 0) this.isMouseDown = true;
      if (e.button === 2) this.isRightMouseDown = true;
    });
    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.isMouseDown = false;
      if (e.button === 2) this.isRightMouseDown = false;
    });
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomSpeed = 0.001;
      this.targetZoom -= e.deltaY * zoomSpeed;
      this.targetZoom = Math.max(0.5, Math.min(2.0, this.targetZoom));
    }, { passive: false });
  }

  update(dt: number) {
    const now = Date.now();

    // -- Refinery Jobs Update --
    let jobsChanged = false;
    this.player.refineryAccount.jobs.forEach(job => {
        if (!job.ready && now >= job.startTime + job.duration) {
            job.ready = true;
            jobsChanged = true;
            // Auto move to refined inventory? Or strictly "Claim"?
            // Let's auto move to "Refined Inventory" in account
            const currentRefined = this.player.refineryAccount.refined[job.mineral] || 0;
            this.player.refineryAccount.refined[job.mineral] = currentRefined + job.quantity;
        }
    });
    
    // Remove completed jobs from array? Or keep them as "Ready to Claim" notification?
    // Design choice: Jobs turn into refined inventory automatically (easier flow)
    // So we just filter them out after processing
    if (jobsChanged) {
        this.player.refineryAccount.jobs = this.player.refineryAccount.jobs.filter(j => !j.ready);
        this.onStatsUpdate({ refineryAccount: { ...this.player.refineryAccount } });
    }

    // Audio State Updates
    const isMoving = this.keys.has('KeyW') || this.keys.has('ArrowUp');
    this.audio.setThruster(isMoving);
    this.audio.setLaser(this.isMouseDown);
    this.audio.setTractor(this.isRightMouseDown);

    // Shake Decay
    if (this.shakeTimer > 0) {
        this.shakeTimer -= dt / 1000;
        if (this.shakeTimer < 0) this.shakeTimer = 0;
    }

    // Smooth zoom interpolation
    this.zoom += (this.targetZoom - this.zoom) * 0.1;

    // Reset laser hit
    this.laserHitPoint = null;

    // Player Physics
    if (isMoving) {
      this.player.vel.x += Math.cos(this.player.rotation) * this.player.enginePower;
      this.player.vel.y += Math.sin(this.player.rotation) * this.player.enginePower;
      
      if (Math.random() > 0.5) {
        const offset = vecMult(vecNorm(this.player.vel), -15);
        this.spawnParticles(vecAdd(this.player.pos, offset), '#f97316', 1);
      }
    }
    
    // Rotate towards mouse
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const angle = Math.atan2(this.mousePos.y - cy, this.mousePos.x - cx);
    
    let diff = angle - this.player.rotation;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.player.rotation += diff * TURN_SPEED;

    this.player.pos = vecAdd(this.player.pos, this.player.vel);
    this.player.vel = vecMult(this.player.vel, FRICTION);

    this.player.pos.x = Math.max(0, Math.min(WORLD_SIZE, this.player.pos.x));
    this.player.pos.y = Math.max(0, Math.min(WORLD_SIZE, this.player.pos.y));

    this.camera.x = this.player.pos.x - this.canvas.width / 2;
    this.camera.y = this.player.pos.y - this.canvas.height / 2;

    // Entities Logic
    let nearbyStation: Station | null = null;

    this.entities.forEach(entity => {
      entity.pos = vecAdd(entity.pos, entity.vel);
      if (entity.type !== EntityType.Station) {
        entity.vel = vecMult(entity.vel, 0.99); // Drag
      }

      if (entity.type === EntityType.Particle) {
        const p = entity as Particle;
        p.life -= 0.02;
        if (p.life <= 0) p.markedForDeletion = true;
      }

      if (entity.type === EntityType.Station) {
        // Rotate station slowly
        entity.rotation += 0.0015;

        const d = dist(this.player.pos, entity.pos);
        if (d < entity.radius + 100) {
          nearbyStation = entity as Station;
        }
      }

      if (this.isRightMouseDown && entity.type === EntityType.Loot) {
        const d = dist(this.player.pos, entity.pos);
        if (d < this.player.tractorRange) {
          const dir = vecNorm(vecSub(this.player.pos, entity.pos));
          entity.vel = vecAdd(entity.vel, vecMult(dir, TRACTOR_FORCE));
          (entity as Loot).attracted = true;
        } else {
          (entity as Loot).attracted = false;
        }
      }

      if (entity.type === EntityType.Loot) {
        const d = dist(this.player.pos, entity.pos);
        if (d < this.player.radius + entity.radius) {
          this.collectLoot(entity as Loot);
        }
      }
    });

    this.onStationProximity(nearbyStation);

    if (this.isMouseDown) {
      this.fireLaser();
    }

    this.entities = this.entities.filter(e => !e.markedForDeletion);
  }

  collectLoot(loot: Loot) {
    if (loot.markedForDeletion) return;

    const currentCargoCount = this.player.cargo.reduce((acc, c) => acc + c.quantity, 0);
    if (currentCargoCount >= this.player.maxCargo) {
      return; 
    }

    this.audio.playCollect();

    loot.markedForDeletion = true;
    
    // Check if we have a stack of this Raw mineral
    const existing = this.player.cargo.find(c => c.type === loot.mineral && !c.isRefined);
    if (existing) {
      existing.quantity++;
    } else {
      this.player.cargo.push({ type: loot.mineral, quantity: 1, isRefined: false });
    }

    this.onStatsUpdate({ cargo: [...this.player.cargo] });
  }

  fireLaser() {
    const range = 250;
    const rayDir = {
      x: Math.cos(this.player.rotation),
      y: Math.sin(this.player.rotation)
    };

    let closestDist = range;
    let hitAsteroid: Asteroid | null = null;
    let hitPos: Vector2 | null = null;

    for (const ent of this.entities) {
      if (ent.type !== EntityType.Asteroid) continue;
      const ast = ent as Asteroid;

      const toCenter = vecSub(ast.pos, this.player.pos);
      const t = toCenter.x * rayDir.x + toCenter.y * rayDir.y;

      if (t < 0 || t - ast.radius > range) continue;

      const closePointOnRay = vecAdd(this.player.pos, vecMult(rayDir, t));
      const distToCenter = dist(closePointOnRay, ast.pos);

      if (distToCenter < ast.radius) {
        const dt = Math.sqrt(ast.radius * ast.radius - distToCenter * distToCenter);
        const hitDistance = t - dt;

        if (hitDistance > 0 && hitDistance < closestDist) {
          closestDist = hitDistance;
          hitAsteroid = ast;
          hitPos = vecAdd(this.player.pos, vecMult(rayDir, hitDistance));
        }
      }
    }

    if (hitAsteroid && hitPos) {
      this.laserHitPoint = hitPos;
      this.damageAsteroid(hitAsteroid, hitPos);
    } else {
      this.laserHitPoint = null;
    }
  }

  damageAsteroid(ast: Asteroid, hitPos?: Vector2) {
    ast.hp -= this.player.miningPower;
    
    const pos = hitPos || ast.pos;
    this.spawnParticles(pos, MINERAL_COLORS[ast.mineral], 1);

    if (ast.hp <= 0) {
      ast.markedForDeletion = true;
      this.fractureAsteroid(ast);
    }
  }

  fractureAsteroid(parent: Asteroid) {
    const size = parent.tier === 1 ? 'large' : parent.tier === 2 ? 'medium' : 'small';
    this.audio.playExplosion(size);
    
    this.triggerShake(parent.tier === 1 ? 15 : parent.tier === 2 ? 8 : 4);

    this.spawnParticles(parent.pos, '#ffffff', 5);

    if (parent.tier === 3) {
      this.spawnLoot(parent.pos, parent.mineral);
    } else {
      const numChildren = randomRange(2, 4);
      for(let i=0; i<numChildren; i++) {
        const offset = { 
          x: parent.pos.x + randomRange(-10, 10), 
          y: parent.pos.y + randomRange(-10, 10) 
        };
        this.spawnAsteroid((parent.tier + 1) as 1|2|3, offset);
      }
    }
    
    if (Math.random() > 0.8) {
        this.spawnLoot(parent.pos, parent.mineral);
    }
  }

  draw() {
    this.ctx.fillStyle = '#0a0a1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeTimer > 0) {
        const decay = this.shakeTimer / 0.4;
        const mag = this.shakeStrength * decay;
        shakeX = (Math.random() - 0.5) * mag;
        shakeY = (Math.random() - 0.5) * mag;
    }

    this.ctx.translate(cx + shakeX, cy + shakeY);
    this.ctx.scale(this.zoom, this.zoom);
    this.ctx.translate(-this.player.pos.x, -this.player.pos.y);

    const visibleW = this.canvas.width / this.zoom;
    const visibleH = this.canvas.height / this.zoom;
    const viewL = this.player.pos.x - visibleW / 2 - 150; 
    const viewR = this.player.pos.x + visibleW / 2 + 150;
    const viewT = this.player.pos.y - visibleH / 2 - 150;
    const viewB = this.player.pos.y + visibleH / 2 + 150;

    this.ctx.strokeStyle = '#1e1e36';
    this.ctx.lineWidth = 1; 
    this.ctx.beginPath();
    for (let x = 0; x <= WORLD_SIZE; x += 200) {
      if (x < viewL || x > viewR) continue;
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, WORLD_SIZE);
    }
    for (let y = 0; y <= WORLD_SIZE; y += 200) {
      if (y < viewT || y > viewB) continue;
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(WORLD_SIZE, y);
    }
    this.ctx.stroke();

    this.entities.forEach(e => {
      if (e.pos.x < viewL || e.pos.x > viewR ||
          e.pos.y < viewT || e.pos.y > viewB) {
        return;
      }

      this.ctx.save();
      this.ctx.translate(e.pos.x, e.pos.y);
      this.ctx.rotate(e.rotation);

      if (e.type === EntityType.Asteroid) {
        const ast = e as Asteroid;
        this.ctx.fillStyle = '#1e293b';
        this.ctx.strokeStyle = MINERAL_COLORS[ast.mineral];
        this.ctx.lineWidth = 2;
        
        this.ctx.beginPath();
        ast.vertices.forEach((v, i) => {
          if (i === 0) this.ctx.moveTo(v.x, v.y);
          else this.ctx.lineTo(v.x, v.y);
        });
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        if (ast.hp < ast.maxHp) {
            this.ctx.strokeStyle = '#000';
            this.ctx.globalAlpha = 1 - (ast.hp / ast.maxHp);
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(ast.radius * 0.7, 0);
            this.ctx.stroke();
            this.ctx.globalAlpha = 1;
        }
      } 
      else if (e.type === EntityType.Loot) {
        const loot = e as Loot;
        this.ctx.fillStyle = MINERAL_COLORS[loot.mineral];
        this.ctx.shadowColor = this.ctx.fillStyle;
        this.ctx.shadowBlur = 10;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      }
      else if (e.type === EntityType.Particle) {
        const p = e as Particle;
        this.ctx.globalAlpha = p.life;
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
      }
      else if (e.type === EntityType.Station) {
        const s = e as Station;
        const isRefinery = s.stationType === StationType.Refinery;
        const accentColor = isRefinery ? '#e76f51' : '#2a9d8f'; // Retro Orange / Teal
        const hullColor = '#e9c46a'; // Retro Cream/Yellowish for hull
        const time = Date.now();

        // 1. Long Antennae (Stationary relative to station rotation)
        this.ctx.strokeStyle = '#6b7280';
        this.ctx.lineWidth = 2;
        for(let i=0; i<3; i++) {
            this.ctx.save();
            this.ctx.rotate((Math.PI * 2 / 3) * i);
            this.ctx.beginPath();
            this.ctx.moveTo(s.radius, 0);
            this.ctx.lineTo(s.radius * 2.2, 0); 
            this.ctx.stroke();
            
            // Blinking tip
            const tipBlink = Math.sin(time/500 + i) > 0.5;
            this.ctx.fillStyle = tipBlink ? '#ef4444' : '#374151';
            this.ctx.beginPath();
            this.ctx.arc(s.radius * 2.2, 0, 3, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }

        // 2. Main Gravity Ring
        // Outer Hull
        this.ctx.beginPath();
        this.ctx.arc(0, 0, s.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#1f2937'; // Dark interior
        this.ctx.fill();
        this.ctx.strokeStyle = hullColor;
        this.ctx.lineWidth = 12;
        this.ctx.stroke();
        
        // Accent Strip
        this.ctx.strokeStyle = accentColor;
        this.ctx.lineWidth = 4;
        this.ctx.setLineDash([20, 15]); // Segments
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // 3. Inner Spokes/Structure
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#4b5563';
        const spokeCount = 4;
        for(let i=0; i<spokeCount; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            const angle = (Math.PI * 2 / spokeCount) * i;
            this.ctx.lineTo(Math.cos(angle) * s.radius, Math.sin(angle) * s.radius);
            this.ctx.stroke();
        }

        // 4. Central Hub
        this.ctx.beginPath();
        this.ctx.arc(0, 0, s.radius * 0.4, 0, Math.PI * 2);
        this.ctx.fillStyle = '#d1d5db'; // Light Grey
        this.ctx.fill();
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = '#374151';
        this.ctx.stroke();

        // Hub Detail - Spinning Radar Dish? 
        // Let's just do a central beacon light
        const pulse = (Math.sin(time / 400) + 1) / 2;
        this.ctx.fillStyle = isRefinery ? `rgba(244, 162, 97, ${0.5 + pulse * 0.5})` : `rgba(42, 157, 143, ${0.5 + pulse * 0.5})`;
        this.ctx.shadowColor = this.ctx.fillStyle;
        this.ctx.shadowBlur = 15;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, s.radius * 0.15, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
        
        // Window Lights on Ring
        const lights = 12;
        for(let i=0; i<lights; i++) {
            const angle = (Math.PI * 2 / lights) * i;
            const r = s.radius; 
            // Only light up random ones or cycle them
            if ((Math.floor(time/1000) + i) % 3 === 0) {
                this.ctx.fillStyle = '#fef3c7'; // Warm light
                this.ctx.beginPath();
                this.ctx.arc(Math.cos(angle) * r, Math.sin(angle) * r, 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
      }

      this.ctx.restore();
    });

    this.ctx.save();
    this.ctx.translate(this.player.pos.x, this.player.pos.y);
    this.ctx.rotate(this.player.rotation);
    
    this.ctx.fillStyle = '#0f172a';
    this.ctx.strokeStyle = '#38bdf8'; 
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(15, 0);
    this.ctx.lineTo(-10, 10);
    this.ctx.lineTo(-5, 0);
    this.ctx.lineTo(-10, -10);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.restore();

    if (this.isMouseDown) {
      this.ctx.strokeStyle = '#ef4444';
      this.ctx.lineWidth = 2;
      this.ctx.shadowColor = '#f87171';
      this.ctx.shadowBlur = 10;
      
      const beamStart = this.player.pos;
      let beamEnd = {
          x: this.player.pos.x + Math.cos(this.player.rotation) * 250,
          y: this.player.pos.y + Math.sin(this.player.rotation) * 250
      };

      if (this.laserHitPoint) {
        beamEnd = this.laserHitPoint;
      }

      this.ctx.beginPath();
      this.ctx.moveTo(beamStart.x, beamStart.y);
      this.ctx.lineTo(beamEnd.x, beamEnd.y);
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;

      if (this.laserHitPoint) {
        this.ctx.save();
        this.ctx.translate(beamEnd.x, beamEnd.y);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowColor = '#ffffff';
        this.ctx.shadowBlur = 10;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      }
    }

    if (this.isRightMouseDown) {
      this.ctx.strokeStyle = '#a855f7';
      this.ctx.lineWidth = 1;
      this.ctx.globalAlpha = 0.3;
      
      this.ctx.beginPath();
      this.ctx.moveTo(this.player.pos.x, this.player.pos.y);
      this.ctx.arc(this.player.pos.x, this.player.pos.y, this.player.tractorRange, 
        this.player.rotation - 0.5, this.player.rotation + 0.5);
      this.ctx.lineTo(this.player.pos.x, this.player.pos.y);
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
    }

    this.ctx.restore();
    this.drawMiniMap();
  }
  
  drawMiniMap() {
    if (!this.miniMapCtx || !this.miniMapCanvas) return;
    
    const ctx = this.miniMapCtx;
    const w = this.miniMapCanvas.width;
    const h = this.miniMapCanvas.height;
    const scale = w / WORLD_SIZE;
  
    ctx.clearRect(0, 0, w, h);
  
    this.entities.forEach(e => {
      if (e.type === EntityType.Station) {
        const s = e as Station;
        ctx.fillStyle = s.stationType === StationType.Refinery ? '#f4a460' : '#2dd4bf';
        ctx.beginPath();
        ctx.arc(e.pos.x * scale, e.pos.y * scale, 3, 0, Math.PI*2);
        ctx.fill();
      } else if (e.type === EntityType.Asteroid) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(e.pos.x * scale, e.pos.y * scale, 1, 1);
      }
    });
  
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(this.player.pos.x * scale, this.player.pos.y * scale, 2, 0, Math.PI*2);
    ctx.fill();
  
    const visibleW = this.canvas.width / this.zoom;
    const visibleH = this.canvas.height / this.zoom;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      (this.player.pos.x - visibleW/2) * scale,
      (this.player.pos.y - visibleH/2) * scale,
      visibleW * scale,
      visibleH * scale
    );
  }

  start() {
    const loop = (timestamp: number) => {
      const dt = timestamp - this.lastTime;
      this.lastTime = timestamp;

      this.update(dt);
      this.draw();

      requestAnimationFrame(loop);
    };
    this.lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  // --- API ---

  buyUpgrade(type: 'cargo' | 'mining' | 'tractor' | 'engine', cost: number) {
    if (this.player.credits >= cost) {
      this.player.credits -= cost;
      if (type === 'cargo') this.player.maxCargo += 4;
      if (type === 'mining') this.player.miningPower *= 1.25;
      if (type === 'tractor') this.player.tractorRange *= 1.3;
      if (type === 'engine') this.player.enginePower *= 1.2;
      this.onStatsUpdate({ 
        credits: this.player.credits,
        maxCargo: this.player.maxCargo,
        miningPower: this.player.miningPower,
        tractorRange: this.player.tractorRange,
        enginePower: this.player.enginePower
      });
      return true;
    }
    return false;
  }

  sellRefinedMineral(type: MineralType, quantity: number, price: number) {
    const idx = this.player.cargo.findIndex(c => c.type === type && c.isRefined);
    if (idx !== -1 && this.player.cargo[idx].quantity >= quantity) {
      this.player.cargo[idx].quantity -= quantity;
      if (this.player.cargo[idx].quantity <= 0) {
        this.player.cargo.splice(idx, 1);
      }
      this.player.credits += quantity * price;
      this.onStatsUpdate({
        cargo: [...this.player.cargo],
        credits: this.player.credits
      });
    }
  }

  // Refinery API
  depositOre(type: MineralType, quantity: number) {
    const idx = this.player.cargo.findIndex(c => c.type === type && !c.isRefined);
    if (idx !== -1 && this.player.cargo[idx].quantity >= quantity) {
        this.player.cargo[idx].quantity -= quantity;
        if (this.player.cargo[idx].quantity <= 0) this.player.cargo.splice(idx, 1);
        
        const currentStored = this.player.refineryAccount.raw[type] || 0;
        this.player.refineryAccount.raw[type] = currentStored + quantity;
        
        this.onStatsUpdate({ cargo: [...this.player.cargo], refineryAccount: {...this.player.refineryAccount} });
    }
  }

  startRefiningJob(type: MineralType, quantity: number, tier: 'standard' | 'priority') {
    const cost = tier === 'standard' ? 100 : 250;
    const duration = tier === 'standard' ? 300000 : 60000; // 5 min vs 1 min

    if (this.player.credits >= cost) {
        const stored = this.player.refineryAccount.raw[type] || 0;
        if (stored >= quantity) {
            this.player.credits -= cost;
            this.player.refineryAccount.raw[type] = stored - quantity;
            
            const job: RefiningJob = {
                id: Math.random().toString(36),
                mineral: type,
                quantity,
                startTime: Date.now(),
                duration,
                cost,
                ready: false
            };
            this.player.refineryAccount.jobs.push(job);
            
            this.onStatsUpdate({ 
                credits: this.player.credits, 
                refineryAccount: {...this.player.refineryAccount} 
            });
            return true;
        }
    }
    return false;
  }

  withdrawRefined(type: MineralType, quantity: number) {
    // Check ship space
    const currentCargo = this.player.cargo.reduce((a,b) => a + b.quantity, 0);
    if (currentCargo + quantity > this.player.maxCargo) return false;

    const stored = this.player.refineryAccount.refined[type] || 0;
    if (stored >= quantity) {
        this.player.refineryAccount.refined[type] = stored - quantity;
        
        const existing = this.player.cargo.find(c => c.type === type && c.isRefined);
        if (existing) {
            existing.quantity += quantity;
        } else {
            this.player.cargo.push({ type, quantity, isRefined: true });
        }
        
        this.onStatsUpdate({ 
            cargo: [...this.player.cargo], 
            refineryAccount: {...this.player.refineryAccount} 
        });
        return true;
    }
    return false;
  }
}
