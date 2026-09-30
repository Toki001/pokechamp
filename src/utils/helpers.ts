import type { BaseStats, TeamSlot } from '../types';

export const getPokemonImageUrl = (name: string) => {
  const cleanName = name.replace('-Hisui', '-Hisuian').replace('-Eternal', ''); 
  return new URL(`../assets/pokemon/${cleanName}.webp`, import.meta.url).href;
};

export const getTypeIconUrl = (type: string) => {
  return new URL(`../assets/type-icons/${type}.svg`, import.meta.url).href;
};

export const getItemImageUrl = (name: string) => {
  if (!name || name === 'None') return '';
  return new URL(`../assets/items/${name}.png`, import.meta.url).href;
};

export const calculateLvl50StatForSlot = (slot: TeamSlot, statName: keyof BaseStats) => {
  if (!slot.pokemon) return 0;
  const base = slot.pokemon.baseStats[statName];
  const statPoints = slot.sp[statName];
  const iv = 31; 
  const level = 50;
  const ev = statPoints === 0 ? 0 : 4 + (statPoints - 1) * 8; 

  if (statName === 'hp') {
    return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
  }

  const rawStat = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;

  if (slot.nature.raises === statName) return Math.floor(rawStat * 1.1);
  if (slot.nature.lowers === statName) return Math.floor(rawStat * 0.9);
  return rawStat;
};