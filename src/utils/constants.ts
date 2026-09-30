import championsRawData from '../data/pokemon_championsdex_full.json';
import itemsRawData from '../data/pokemon_items.json';
import type { Nature, BaseStats, ChampionsPokemon, ItemData, TypeDefenseItem } from '../types';

export const NATURES: Nature[] = [
  { name: 'Adamant', raises: 'atk', lowers: 'spa' },
  { name: 'Bashful', raises: null, lowers: null },
  { name: 'Bold', raises: 'def', lowers: 'atk' },
  { name: 'Brave', raises: 'atk', lowers: 'spe' },
  { name: 'Calm', raises: 'spd', lowers: 'atk' },
  { name: 'Careful', raises: 'spd', lowers: 'spa' },
  { name: 'Docile', raises: null, lowers: null },
  { name: 'Gentle', raises: 'spd', lowers: 'def' },
  { name: 'Hardy', raises: null, lowers: null },
  { name: 'Hasty', raises: 'spe', lowers: 'def' },
  { name: 'Impish', raises: 'def', lowers: 'spa' },
  { name: 'Jolly', raises: 'spe', lowers: 'spa' },
  { name: 'Lax', raises: 'def', lowers: 'spd' },
  { name: 'Lonely', raises: 'atk', lowers: 'def' },
  { name: 'Mild', raises: 'spa', lowers: 'def' },
  { name: 'Modest', raises: 'spa', lowers: 'atk' },
  { name: 'Naive', raises: 'spe', lowers: 'spd' },
  { name: 'Naughty', raises: 'atk', lowers: 'spd' },
  { name: 'Quiet', raises: 'spa', lowers: 'spe' },
  { name: 'Quirky', raises: null, lowers: null },
  { name: 'Rash', raises: 'spa', lowers: 'spd' },
  { name: 'Relaxed', raises: 'def', lowers: 'spe' },
  { name: 'Sassy', raises: 'spd', lowers: 'spe' },
  { name: 'Serious', raises: null, lowers: null },
  { name: 'Timid', raises: 'spe', lowers: 'atk' }
];

export const STAT_LABELS: { key: keyof BaseStats; label: string }[] = [
  { key: 'hp', label: 'HP' },
  { key: 'atk', label: 'Attack' },
  { key: 'def', label: 'Defense' },
  { key: 'spa', label: 'Sp. Atk' },
  { key: 'spd', label: 'Sp. Def' },
  { key: 'spe', label: 'Speed' }
];

export const STAT_METADATA = {
  hp: { label: 'HP', colorBase: 'bg-emerald-400', colorAdded: 'bg-[#05df72]' },
  atk: { label: 'ATK', colorBase: 'bg-rose-500', colorAdded: 'bg-[#ff4d6d]' },
  def: { label: 'DEF', colorBase: 'bg-yellow-400', colorAdded: 'bg-yellow-300' },
  spa: { label: 'SPA', colorBase: 'bg-sky-500', colorAdded: 'bg-[#38bdf8]' },
  spd: { label: 'SPD', colorBase: 'bg-purple-400', colorAdded: 'bg-[#a78bfa]' },
  spe: { label: 'SPE', colorBase: 'bg-fuchsia-500', colorAdded: 'bg-[#f472b6]' }
};

export const TYPE_COLORS: Record<string, string> = {
  Normal: 'bg-neutral-600', Fire: 'bg-orange-600', Water: 'bg-blue-600', Electric: 'bg-amber-500',
  Grass: 'bg-emerald-600', Ice: 'bg-cyan-500', Fighting: 'bg-red-700', Poison: 'bg-purple-600',
  Ground: 'bg-amber-700', Flying: 'bg-indigo-500', Psychic: 'bg-pink-600', Bug: 'bg-lime-600',
  Rock: 'bg-stone-600', Ghost: 'bg-violet-800', Dragon: 'bg-indigo-700', Dark: 'bg-neutral-800 border border-neutral-700',
  Steel: 'bg-slate-500', Fairy: 'bg-rose-400 text-slate-900'
};

export const ALL_TYPES = Object.keys(TYPE_COLORS);

export const PARSED_CHAMPIONS_LIST: ChampionsPokemon[] = Object.values(championsRawData).map((raw: any) => ({
  pokemon: raw.pokemon,
  name: raw.pokemon,
  types: raw.types || [],
  bst: Number(raw.base_stats?.BST || 0),
  baseStats: {
    hp: Number(raw.base_stats?.spread?.HP || 0),
    atk: Number(raw.base_stats?.spread?.Atk || 0),
    def: Number(raw.base_stats?.spread?.Def || 0),
    spa: Number(raw.base_stats?.spread?.SpA || 0),
    spd: Number(raw.base_stats?.spread?.SpD || 0),
    spe: Number(raw.base_stats?.spread?.Spe || 0)
  },
  abilities: raw.abilities || [],
  moves: raw.moves || [],
  typeDefenses: {
    weakTo: (raw.type_defenses?.['Weak to'] || []).filter((w: TypeDefenseItem) => w.type !== 'None'),
    resists: (raw.type_defenses?.Resists || []).filter((r: TypeDefenseItem) => r.type !== 'None'),
    immuneTo: (raw.type_defenses?.['Immune to'] || []).filter((i: TypeDefenseItem) => i.type !== 'None')
  }
}));

export const PARSED_ITEMS_LIST: ItemData[] = itemsRawData as ItemData[];