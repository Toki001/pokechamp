import type { BaseStats, TeamSlot } from '../types';

const pokemonImages = import.meta.glob<string>('../assets/pokemon/*.webp', { eager: true, query: '?url', import: 'default' });
const typeImages = import.meta.glob<string>('../assets/type-icons/*.svg', { eager: true, query: '?url', import: 'default' });
const itemImages = import.meta.glob<string>('../assets/items/*.png', { eager: true, query: '?url', import: 'default' });
const categoryImages = import.meta.glob<string>('../assets/move-category/*.png', { eager: true, query: '?url', import: 'default' });
const imageAliases: Record<string, string> = { 'Mr. Mime': 'Mr Mime', 'Mr. Mime-Galar': 'Mr Mime', 'Farfetch’d': 'Farfetchd', 'Sirfetch’d': 'Sirfetchd', 'King’s Rock': 'King’s Rock', "King's Rock": 'King’s Rock' };
export const getPokemonImageUrl = (name: string) => pokemonImages[`../assets/pokemon/${imageAliases[name] || name}.webp`] || '/favicon.svg';
export const getTypeIconUrl = (type: string) => typeImages[`../assets/type-icons/${type}.svg`] || '/favicon.svg';
export const getItemImageUrl = (name: string) => !name || name === 'None' ? '' : itemImages[`../assets/items/${imageAliases[name] || name}.png`] || '/favicon.svg';
export const getMoveCategoryUrl = (category: string) => categoryImages[`../assets/move-category/${category.toLowerCase()}.png`] || '/favicon.svg';

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
