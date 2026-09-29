import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import championsRawData from '../data/pokemon_championsdex_full.json';
import TeamDiscussion from './TeamDiscussion';
import { supabase } from '../utils/supabaseClient';

// --- Types & Data Mapping ---

interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

interface Ability {
  name: string;
  description: string;
}

interface Move {
  name: string;
  type: string;
  category: 'Physical' | 'Special' | 'Status';
  power: string;
  accuracy: string;
  pp: string;
  description: string;
}

interface TypeDefenseItem {
  type: string;
  multiplier: string;
}

interface ChampionsPokemon {
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

interface Nature {
  name: string;
  raises: keyof BaseStats | null;
  lowers: keyof BaseStats | null;
}

const NATURES: Nature[] = [
  { name: 'Adamant', raises: 'atk', lowers: 'spa' },
  { name: 'Bold', raises: 'def', lowers: 'atk' },
  { name: 'Brave', raises: 'atk', lowers: 'spe' },
  { name: 'Calm', raises: 'spd', lowers: 'atk' },
  { name: 'Careful', raises: 'spd', lowers: 'spa' },
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
  { name: 'Rash', raises: 'spa', lowers: 'spd' },
  { name: 'Relaxed', raises: 'def', lowers: 'spe' },
  { name: 'Sassy', raises: 'spd', lowers: 'spe' },
  { name: 'Serious', raises: null, lowers: null },
  { name: 'Timid', raises: 'spe', lowers: 'atk' }
].sort((a, b) => a.name.localeCompare(b.name));

const STAT_LABELS: { key: keyof BaseStats; label: string }[] = [
  { key: 'atk', label: 'Attack' },
  { key: 'def', label: 'Defense' },
  { key: 'spa', label: 'Sp. Atk' },
  { key: 'spd', label: 'Sp. Def' },
  { key: 'spe', label: 'Speed' }
];

const STAT_METADATA = {
  hp: { label: 'HP', colorBase: 'bg-emerald-400', colorAdded: 'bg-[#05df72]' },
  atk: { label: 'ATK', colorBase: 'bg-rose-500', colorAdded: 'bg-[#ff4d6d]' },
  def: { label: 'DEF', colorBase: 'bg-yellow-400', colorAdded: 'bg-yellow-300' },
  spa: { label: 'SP. ATK', colorBase: 'bg-sky-500', colorAdded: 'bg-[#38bdf8]' },
  spd: { label: 'SP. DEF', colorBase: 'bg-purple-400', colorAdded: 'bg-[#a78bfa]' },
  spe: { label: 'SPD', colorBase: 'bg-fuchsia-500', colorAdded: 'bg-[#f472b6]' }
};

const TYPE_COLORS: Record<string, string> = {
  Normal: 'bg-neutral-600',
  Fire: 'bg-orange-600',
  Water: 'bg-blue-600',
  Electric: 'bg-amber-500',
  Grass: 'bg-emerald-600',
  Ice: 'bg-cyan-500',
  Fighting: 'bg-red-700',
  Poison: 'bg-purple-600',
  Ground: 'bg-amber-700',
  Flying: 'bg-indigo-500',
  Psychic: 'bg-pink-600',
  Bug: 'bg-lime-600',
  Rock: 'bg-stone-600',
  Ghost: 'bg-violet-800',
  Dragon: 'bg-indigo-700',
  Dark: 'bg-neutral-800 border border-neutral-700',
  Steel: 'bg-slate-500',
  Fairy: 'bg-rose-400 text-slate-900'
};

const PARSED_CHAMPIONS_LIST: ChampionsPokemon[] = Object.values(championsRawData).map((raw: any) => ({
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

const getPokemonImageUrl = (name: string) => {
  return new URL(`../assets/pokemon/${name}.webp`, import.meta.url).href;
};

interface TeamSlot {
  pokemon: ChampionsPokemon | null;
  nature: Nature;
  sp: BaseStats;
  selectedAbility: string;
  selectedMoves: (string | null)[];
}

const DEFAULT_NATURE = NATURES.find((n) => n.name === 'Adamant')!;
const DEFAULT_SP: BaseStats = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
const INITIAL_TEAM: TeamSlot[] = Array(6).fill(null).map(() => ({
  pokemon: null,
  nature: DEFAULT_NATURE,
  sp: { ...DEFAULT_SP },
  selectedAbility: '',
  selectedMoves: [null, null, null, null]
}));

export default function TeamBuilder() {
  const { teamId } = useParams();
  const navigate = useNavigate();

  const [team, setTeam] = useState<TeamSlot[]>(INITIAL_TEAM);
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shareableLink, setShareableLink] = useState<string | null>(null);

  const [activeMoveSlotIndex, setActiveMoveSlotIndex] = useState<number | null>(null);
  const [moveSearchQuery, setMoveSearchQuery] = useState('');

  useEffect(() => {
    const fetchTeam = async () => {
      if (!teamId) {
        setTeam(INITIAL_TEAM);
        return;
      }

      setIsLoading(true);
      const { data, error } = await supabase
        .from('teams')
        .select('roster')
        .eq('short_id', teamId)
        .single();

      if (error || !data) {
        alert('Team not found. Redirecting to new builder.');
        navigate('/');
      } else if (data.roster) {
        setTeam(data.roster as TeamSlot[]);
        setShareableLink(`${window.location.origin}/team/${teamId}`);
      }
      setIsLoading(false);
    };

    fetchTeam();
  }, [teamId, navigate]);

  const SP_TOTAL_LIMIT = 66; 
  const SP_STAT_LIMIT = 32;  
  const METER_ABSOLUTE_MAX = 255;

  const activeSlot = team[activeIndex];
  const totalSpUsed = Object.values(activeSlot.sp).reduce((a, b) => a + b, 0);
  const spLeft = SP_TOTAL_LIMIT - totalSpUsed;

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const query = searchTerm.toLowerCase();
    return PARSED_CHAMPIONS_LIST.filter((mon) =>
      mon.name.toLowerCase().includes(query)
    ).slice(0, 8);
  }, [searchTerm]);

  const updateActiveSlot = (updates: Partial<TeamSlot>) => {
    setTeam((prev) => {
      const newTeam = [...prev];
      newTeam[activeIndex] = { ...newTeam[activeIndex], ...updates };
      return newTeam;
    });
    setShareableLink(null);
  };

  const handleSelectPokemon = (mon: ChampionsPokemon) => {
    updateActiveSlot({
      pokemon: mon,
      nature: DEFAULT_NATURE,
      sp: { ...DEFAULT_SP },
      selectedAbility: mon.abilities[0]?.name || '',
      selectedMoves: [null, null, null, null]
    });
    setSearchTerm('');
  };

  const handleSpChange = (stat: keyof BaseStats, val: number) => {
    const targetValue = Math.max(0, val);
    const currentTotalWithoutThisStat =
      Object.values(activeSlot.sp).reduce((a, b) => a + b, 0) - activeSlot.sp[stat];
    const availablePool = SP_TOTAL_LIMIT - currentTotalWithoutThisStat;
    const safelyClampedValue = Math.min(targetValue, SP_STAT_LIMIT, availablePool);

    updateActiveSlot({ sp: { ...activeSlot.sp, [stat]: safelyClampedValue } });
  };

  const handleNatureStatChange = (type: 'raises' | 'lowers', statKey: keyof BaseStats) => {
    const newRaises = type === 'raises' ? statKey : activeSlot.nature.raises;
    const newLowers = type === 'lowers' ? statKey : activeSlot.nature.lowers;

    if (newRaises === newLowers) {
      updateActiveSlot({ nature: NATURES.find((n) => n.raises === null)! });
      return;
    }
    const matchedNature = NATURES.find((n) => n.raises === newRaises && n.lowers === newLowers);
    if (matchedNature) updateActiveSlot({ nature: matchedNature });
  };

  const calculateLvl50Stat = (statName: keyof BaseStats, base: number, statPoints: number) => {
    const iv = 31; 
    const level = 50;
    const ev = statPoints === 0 ? 0 : 4 + (statPoints - 1) * 8; 

    if (statName === 'hp') {
      return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
    }

    const rawStat = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;

    if (activeSlot.nature.raises === statName) return Math.floor(rawStat * 1.1);
    if (activeSlot.nature.lowers === statName) return Math.floor(rawStat * 0.9);
    return rawStat;
  };

  const handleSelectMove = (moveName: string) => {
    if (activeMoveSlotIndex === null) return;
    const updatedMoves = [...activeSlot.selectedMoves];
    updatedMoves[activeMoveSlotIndex] = moveName;
    updateActiveSlot({ selectedMoves: updatedMoves });
    setActiveMoveSlotIndex(null);
    setMoveSearchQuery('');
  };

  const handleClearMove = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedMoves = [...activeSlot.selectedMoves];
    updatedMoves[index] = null;
    updateActiveSlot({ selectedMoves: updatedMoves });
  };

  const filteredMoves = useMemo(() => {
    if (!activeSlot.pokemon) return [];
    if (!moveSearchQuery.trim()) return activeSlot.pokemon.moves;
    const q = moveSearchQuery.toLowerCase();
    return activeSlot.pokemon.moves.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.type.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
    );
  }, [activeSlot.pokemon, moveSearchQuery]);

  const saveTeamToCloud = async () => {
    if (team.every((slot) => slot.pokemon === null)) {
      alert('Cannot save an empty team!');
      return;
    }

    setIsSaving(true);
    const shortId = Math.random().toString(36).substring(2, 8);

    const { error } = await supabase.from('teams').insert([
      {
        short_id: shortId,
        team_name: `${activeSlot.pokemon?.name || 'Championship'}'s Team`,
        roster: team
      }
    ]);

    setIsSaving(false);

    if (error) {
      console.error('Error saving team:', error);
      alert('Failed to save team. Check console.');
    } else {
      navigate(`/team/${shortId}`);
    }
  };

  let totalRawStats = 0;
  let totalCalcStats = 0;

  if (isLoading) {
    return (
      <div className="w-full max-w-[850px] mx-auto text-center py-32 flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-slate-700 border-t-sky-500 rounded-full animate-spin"></div>
        <h2 className="text-xl font-bold text-slate-300 animate-pulse">Hydrating Cloud Roster...</h2>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[850px] mx-auto text-slate-200 font-sans pb-20">
      
      <div className="flex justify-between items-end mb-6 gap-3">
        <div className="grid grid-cols-6 gap-2 flex-grow">
          {team.map((slot, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`h-16 rounded-xl border flex flex-col items-center justify-center p-1 transition-all relative overflow-hidden ${
                activeIndex === idx
                  ? 'bg-[#1a1b26] border-sky-500 text-white shadow-[0_0_15px_rgba(14,165,233,0.35)]'
                  : 'bg-[#13141c] border-[#2e3040] text-slate-500 hover:bg-[#1a1b26]'
              }`}
            >
              {slot.pokemon ? (
                <>
                  <img
                    src={getPokemonImageUrl(slot.pokemon.name)}
                    alt={slot.pokemon.name}
                    className="w-8 h-8 object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span className="text-[11px] font-bold truncate max-w-full text-slate-200">
                    {slot.pokemon.name}
                  </span>
                </>
              ) : (
                <span className="text-xs font-bold">Slot {idx + 1}</span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={saveTeamToCloud}
          disabled={isSaving}
          className="h-16 px-6 bg-sky-500 hover:bg-sky-400 text-white font-black rounded-xl shadow-[0_0_20px_rgba(14,165,233,0.4)] transition-all flex items-center justify-center text-xs tracking-wider disabled:opacity-50 flex-shrink-0"
        >
          {isSaving ? 'SAVING...' : 'SAVE & SHARE'}
        </button>
      </div>

      {shareableLink && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex justify-between items-center text-emerald-400">
          <span className="font-bold text-sm">Team synchronized! Share this link:</span>
          <a href={shareableLink} className="font-mono underline text-white text-sm" target="_blank" rel="noreferrer">
            {shareableLink}
          </a>
        </div>
      )}

      <div className="bg-[#13141c] border border-[#2e3040] rounded-xl p-8 shadow-2xl mb-6">
        <div className="relative">
          <input
            type="text"
            className="w-full p-4 bg-[#1a1b26] border border-[#2e3040] rounded-lg focus:border-sky-500 outline-none transition-colors text-white font-medium shadow-inner"
            placeholder="Search Champions Pokémon (e.g. Rillaboom, Sneasler, Incineroar, Kingambit)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchResults.length > 0 && (
            <ul className="absolute z-30 w-full mt-2 bg-[#1e1f2b] border border-[#2e3040] rounded-lg shadow-2xl overflow-hidden divide-y divide-[#2a2b38]">
              {searchResults.map((mon) => (
                <li
                  key={mon.name}
                  className="p-3.5 hover:bg-[#2a2b3a] cursor-pointer flex justify-between items-center transition-colors"
                  onClick={() => handleSelectPokemon(mon)}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={getPokemonImageUrl(mon.name)}
                      alt={mon.name}
                      className="w-10 h-10 object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div>
                      <span className="font-bold text-white block">{mon.name}</span>
                      <span className="text-[11px] text-slate-400">BST: {mon.bst}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {mon.types.map((t) => (
                      <span
                        key={t}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${TYPE_COLORS[t] || 'bg-slate-700'}`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {activeSlot.pokemon && (
          <div className="mt-8 bg-[#1a1b26] border border-[#2e3040] rounded-xl p-6">
            
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#2e3040]">
              <div className="flex items-center gap-4">
                <img
                  src={getPokemonImageUrl(activeSlot.pokemon.name)}
                  alt={activeSlot.pokemon.name}
                  className="w-20 h-20 object-contain bg-[#13141c] border border-[#2e3040] rounded-xl p-1"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-black text-white">{activeSlot.pokemon.name}</h2>
                    <span className="bg-[#13141c] text-sky-400 text-xs font-mono font-bold px-2.5 py-1 rounded border border-[#2e3040]">
                      BST {activeSlot.pokemon.bst}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {activeSlot.pokemon.types.map((t) => (
                      <span
                        key={t}
                        className={`text-xs font-bold px-2.5 py-0.5 rounded text-white ${TYPE_COLORS[t] || 'bg-slate-700'}`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() =>
                  updateActiveSlot({
                    pokemon: null,
                    sp: { ...DEFAULT_SP },
                    nature: DEFAULT_NATURE,
                    selectedAbility: '',
                    selectedMoves: [null, null, null, null]
                  })
                }
                className="px-4 py-2 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500/20 font-bold transition-colors text-sm border border-rose-500/30"
              >
                Clear Slot
              </button>
            </div>

            <div className="my-6 p-4 bg-[#13141c] border border-[#2e3040] rounded-lg">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Ability
              </label>
              <select
                className="w-full bg-[#1a1b26] border border-[#323445] rounded-lg p-3 text-white font-semibold outline-none focus:border-sky-500 text-sm"
                value={activeSlot.selectedAbility}
                onChange={(e) => updateActiveSlot({ selectedAbility: e.target.value })}
              >
                {activeSlot.pokemon.abilities.map((ab) => (
                  <option key={ab.name} value={ab.name}>
                    {ab.name}
                  </option>
                ))}
              </select>
              {(() => {
                const currentAbility = activeSlot.pokemon.abilities.find(
                  (a) => a.name === activeSlot.selectedAbility
                );
                return currentAbility && currentAbility.description !== 'Description not found.' ? (
                  <p className="text-xs text-slate-400 mt-2 italic">{currentAbility.description}</p>
                ) : null;
              })()}
            </div>

            <div className="mb-8 border-b border-[#2e3040] pb-8">
              <h3 className="text-lg font-bold text-white mb-3">Nature</h3>
              <select
                className="w-full bg-[#1e1f2b] border border-[#323445] rounded-lg p-3 text-white outline-none focus:border-sky-500 font-semibold appearance-none mb-4"
                value={activeSlot.nature.name}
                onChange={(e) => updateActiveSlot({ nature: NATURES.find((n) => n.name === e.target.value)! })}
              >
                {NATURES.map((n) => (
                  <option key={n.name} value={n.name}>
                    {n.name}
                  </option>
                ))}
              </select>

              <div className="flex gap-6 items-center">
                <div className="flex items-center gap-3 flex-1">
                  <span className="font-bold text-rose-500 w-12 text-sm">+10%</span>
                  <select
                    className="flex-1 bg-[#1e1f2b] border border-[#323445] rounded-lg p-2.5 text-white outline-none focus:border-sky-500 font-semibold text-sm appearance-none"
                    value={activeSlot.nature.raises || ''}
                    onChange={(e) => handleNatureStatChange('raises', e.target.value as keyof BaseStats)}
                  >
                    <option value="" disabled>-</option>
                    {STAT_LABELS.map((s) => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3 flex-1">
                  <span className="font-bold text-sky-400 w-12 text-sm">-10%</span>
                  <select
                    className="flex-1 bg-[#1e1f2b] border border-[#323445] rounded-lg p-2.5 text-white outline-none focus:border-sky-500 font-semibold text-sm appearance-none"
                    value={activeSlot.nature.lowers || ''}
                    onChange={(e) => handleNatureStatChange('lowers', e.target.value as keyof BaseStats)}
                  >
                    <option value="" disabled>-</option>
                    {STAT_LABELS.map((s) => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              {Object.entries(activeSlot.pokemon.baseStats).map(([statName, baseValue]) => {
                const key = statName as keyof BaseStats;
                const meta = STAT_METADATA[key];
                const currentSp = activeSlot.sp[key];

                const rawStat = baseValue + currentSp;
                const statAtZeroSp = calculateLvl50Stat(key, baseValue, 0);
                const statAtCurrentSp = calculateLvl50Stat(key, baseValue, currentSp);

                totalRawStats += rawStat;
                totalCalcStats += statAtCurrentSp;

                const baseWidth = Math.min((baseValue / METER_ABSOLUTE_MAX) * 100, 100);
                const addedWidth = Math.min((currentSp / METER_ABSOLUTE_MAX) * 100, 100 - baseWidth);
                const percentIncrease =
                  statAtZeroSp === 0
                    ? 0
                    : (((statAtCurrentSp - statAtZeroSp) / statAtZeroSp) * 100).toFixed(1);

                return (
                  <div key={key} className="flex items-center gap-3">
                    <div className="w-16 text-sm font-bold text-slate-100">{meta.label}</div>

                    <div className="flex-grow flex items-center gap-2">
                      <div className="flex flex-col justify-center w-40 flex-shrink-0">
                        <div className="h-[14px] bg-[#333647] rounded-full flex overflow-hidden w-full relative">
                          <div className={`${meta.colorBase} h-full transition-all duration-200`} style={{ width: `${baseWidth}%` }}></div>
                          <div className={`${meta.colorAdded} h-full transition-all duration-200`} style={{ width: `${addedWidth}%` }}></div>
                        </div>
                        <div className="text-[10px] font-bold h-3 mt-1.5 flex gap-1.5">
                          {currentSp > 0 ? (
                            <>
                              <span className={`text-${meta.colorAdded.replace('bg-', '')}`}>+{currentSp}</span>
                              <span className="text-slate-300 underline underline-offset-2">{percentIncrease}%</span>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <div className="w-9 h-9 flex items-center justify-center">
                        {currentSp > 0 && (
                          <button
                            onClick={() => handleSpChange(key, 0)}
                            className="w-full h-full rounded-lg bg-[#20222e] text-rose-500 hover:bg-rose-500/20 border border-[#383a4c] flex items-center justify-center font-bold transition-colors"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleSpChange(key, currentSp - 1)}
                        className="w-10 h-10 rounded-lg bg-[#1e1f29] hover:bg-[#252735] flex items-center justify-center font-bold text-slate-400 border border-[#323444] transition-colors"
                      >
                        —
                      </button>
                      <div className="w-14 h-10 bg-[#161720] border border-[#323444] rounded-lg flex items-center justify-center text-sm font-bold text-white font-mono">
                        {currentSp}
                      </div>
                      <button
                        onClick={() => handleSpChange(key, currentSp + 1)}
                        disabled={totalSpUsed >= SP_TOTAL_LIMIT || currentSp >= SP_STAT_LIMIT}
                        className="w-10 h-10 rounded-lg bg-[#1e1f29] hover:bg-[#252735] flex items-center justify-center font-bold text-green-500 border border-[#323444] disabled:opacity-30 transition-colors"
                      >
                        +
                      </button>
                      <button
                        onClick={() => handleSpChange(key, SP_STAT_LIMIT)}
                        disabled={totalSpUsed >= SP_TOTAL_LIMIT || currentSp >= SP_STAT_LIMIT}
                        className="w-12 h-10 rounded-lg bg-[#1e1f29] hover:bg-[#252735] flex items-center justify-center text-[10px] font-black text-slate-300 border border-[#323444] disabled:opacity-30 tracking-widest transition-colors"
                      >
                        MAX
                      </button>
                    </div>

                    <div className="w-24 text-right flex flex-col flex-shrink-0">
                      <div className="font-bold text-[15px]">
                        <span className={currentSp > 0 ? 'text-sky-300' : 'text-white'}>{rawStat}</span>
                        <span className="text-slate-300"> / {statAtCurrentSp}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 uppercase font-medium mt-0.5">Raw / Lvl 50</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center mt-10 pt-6 border-t border-[#2e3040]">
              <div>
                <div className="text-lg font-bold text-white">
                  {totalSpUsed}/{SP_TOTAL_LIMIT} used{' '}
                  <span className="text-slate-400 font-normal">({spLeft} left)</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">Stat Points</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-white">
                  {totalRawStats} / {totalCalcStats}
                </div>
                <div className="text-xs text-slate-500 mt-1">Raw / Lvl 50 Total</div>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-[#2e3040]">
              <h3 className="text-lg font-bold text-white mb-4">Moves (Pick 4)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeSlot.selectedMoves.map((moveName, mIdx) => {
                  const moveDetails = moveName
                    ? activeSlot.pokemon?.moves.find((m) => m.name === moveName)
                    : null;

                  return (
                    <div
                      key={mIdx}
                      onClick={() => setActiveMoveSlotIndex(mIdx)}
                      className="bg-[#13141c] border border-[#2e3040] hover:border-sky-500 rounded-lg p-3 cursor-pointer transition-all flex items-center justify-between"
                    >
                      {moveDetails ? (
                        <div className="flex-1 pr-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded text-white ${TYPE_COLORS[moveDetails.type] || 'bg-slate-700'}`}
                            >
                              {moveDetails.type}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">
                              {moveDetails.category}
                            </span>
                            <span className="font-bold text-sm text-white">{moveDetails.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex gap-3">
                            <span>Pwr: {moveDetails.power}</span>
                            <span>Acc: {moveDetails.accuracy}</span>
                            <span>PP: {moveDetails.pp}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 font-bold tracking-wider">
                          + Select Move {mIdx + 1}
                        </span>
                      )}

                      {moveDetails && (
                        <button
                          onClick={(e) => handleClearMove(mIdx, e)}
                          className="w-7 h-7 rounded bg-[#20222e] text-rose-400 hover:bg-rose-500/20 border border-[#383a4c] flex items-center justify-center text-xs font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-[#2e3040]">
              <h3 className="text-lg font-bold text-white mb-4">Defensive Type Matchups</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="text-xs text-rose-400 font-bold uppercase tracking-wider mb-2">Weak to</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {activeSlot.pokemon.typeDefenses.weakTo.length > 0 ? (
                      activeSlot.pokemon.typeDefenses.weakTo.map((item) => (
                        <span
                          key={item.type}
                          className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs px-2.5 py-1 rounded flex items-center gap-1.5"
                        >
                          <span className="font-bold">{item.type}</span>
                          <span className="text-[10px] font-mono text-rose-400 font-black">{item.multiplier}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">None</span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-2">Resists</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {activeSlot.pokemon.typeDefenses.resists.length > 0 ? (
                      activeSlot.pokemon.typeDefenses.resists.map((item) => (
                        <span
                          key={item.type}
                          className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs px-2.5 py-1 rounded flex items-center gap-1.5"
                        >
                          <span className="font-bold">{item.type}</span>
                          <span className="text-[10px] font-mono text-emerald-400 font-black">{item.multiplier}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">None</span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Immune to</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {activeSlot.pokemon.typeDefenses.immuneTo.length > 0 ? (
                      activeSlot.pokemon.typeDefenses.immuneTo.map((item) => (
                        <span
                          key={item.type}
                          className="bg-slate-800 border border-slate-700 text-slate-300 text-xs px-2.5 py-1 rounded flex items-center gap-1.5"
                        >
                          <span className="font-bold">{item.type}</span>
                          <span className="text-[10px] font-mono text-slate-400 font-black">0x</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">None</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {activeMoveSlotIndex !== null && activeSlot.pokemon && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#1a1b26] border border-[#2e3040] rounded-xl max-w-xl w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[#2e3040] flex justify-between items-center">
              <h3 className="text-base font-bold text-white">
                Select Move for Slot {activeMoveSlotIndex + 1}
              </h3>
              <button
                onClick={() => {
                  setActiveMoveSlotIndex(null);
                  setMoveSearchQuery('');
                }}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 border-b border-[#2e3040]">
              <input
                type="text"
                placeholder="Filter by move name, type, or category..."
                value={moveSearchQuery}
                onChange={(e) => setMoveSearchQuery(e.target.value)}
                className="w-full bg-[#13141c] border border-[#2e3040] rounded-lg p-2.5 text-white text-sm outline-none focus:border-sky-500"
              />
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-[#2a2b38] p-2">
              {filteredMoves.map((m) => (
                <div
                  key={m.name}
                  onClick={() => handleSelectMove(m.name)}
                  className="p-3 hover:bg-[#232534] rounded-lg cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded text-white ${TYPE_COLORS[m.type] || 'bg-slate-700'}`}
                      >
                        {m.type}
                      </span>
                      <span className="text-xs text-slate-400">{m.category}</span>
                      <span className="font-bold text-sm text-white">{m.name}</span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono flex gap-2">
                      <span>Pwr: {m.power}</span>
                      <span>Acc: {m.accuracy}</span>
                      <span>PP: {m.pp}</span>
                    </div>
                  </div>
                  {m.description && (
                    <p className="text-xs text-slate-400 leading-tight">{m.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {teamId && <TeamDiscussion teamId={teamId} />}
    </div>
  );
}