import { Vector2 } from '../types';

export const vecAdd = (v1: Vector2, v2: Vector2): Vector2 => ({ x: v1.x + v2.x, y: v1.y + v2.y });
export const vecSub = (v1: Vector2, v2: Vector2): Vector2 => ({ x: v1.x - v2.x, y: v1.y - v2.y });
export const vecMult = (v: Vector2, s: number): Vector2 => ({ x: v.x * s, y: v.y * s });
export const vecLen = (v: Vector2): number => Math.sqrt(v.x * v.x + v.y * v.y);
export const vecNorm = (v: Vector2): Vector2 => {
  const len = vecLen(v);
  return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
};
export const dist = (v1: Vector2, v2: Vector2): number => Math.sqrt(Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2));

export const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

export const generatePolygon = (radius: number, sides: number, irregularity: number): Vector2[] => {
  const points: Vector2[] = [];
  const angleStep = (Math.PI * 2) / sides;
  for (let i = 0; i < sides; i++) {
    const angle = i * angleStep;
    const r = radius + randomRange(-irregularity, irregularity);
    points.push({
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
    });
  }
  return points;
};
