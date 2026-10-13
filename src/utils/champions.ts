import championsRawData from '../data/generated/champions.json';
import itemsRawData from '../data/pokemon_items.json';
import type { ChampionsPokemon, ItemData, TypeDefenseItem, Move } from '../types';

export const PARSED_CHAMPIONS_LIST: ChampionsPokemon[] = championsRawData.pokemon.map(raw => ({
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
  moves: raw.moves.map(id => championsRawData.moves[id] as Move),
  typeDefenses: {
    weakTo: (raw.type_defenses?.['Weak to'] || []).filter((w: TypeDefenseItem) => w.type !== 'None'),
    resists: (raw.type_defenses?.Resists || []).filter((r: TypeDefenseItem) => r.type !== 'None'),
    immuneTo: (raw.type_defenses?.['Immune to'] || []).filter((i: TypeDefenseItem) => i.type !== 'None')
  }
}));

export const PARSED_ITEMS_LIST: ItemData[] = itemsRawData as ItemData[];
