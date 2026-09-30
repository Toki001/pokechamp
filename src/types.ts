export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface Ability {
  name: string;
  description: string;
}

export interface Move {
  name: string;
  type: string;
  category: 'Physical' | 'Special' | 'Status';
  power: string;
  accuracy: string;
  pp: string;
  description: string;
}

export interface TypeDefenseItem {
  type: string;
  multiplier: string;
}

export interface ChampionsPokemon {
  pokemon: string;
  name: string;
  types: string[];
  bst: number;
  baseStats: BaseStats;
  abilities: Ability[];
  moves: Move[];
  typeDefenses: {
    weakTo: TypeDefenseItem[];
    resists: TypeDefenseItem[];
    immuneTo: TypeDefenseItem[];
  };
}

export interface ItemData {
  name: string;
  description: string;
}

export interface Nature {
  name: string;
  raises: keyof BaseStats | null;
  lowers: keyof BaseStats | null;
}

export interface TeamSlot {
  pokemon: ChampionsPokemon | null;
  nature: Nature;
  sp: BaseStats;
  selectedAbility: string;
  selectedMoves: (string | null)[];
  item: string;
}