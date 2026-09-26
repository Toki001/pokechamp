import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import pokemonData from '../data/pokemon.json';
import TypeCoverageMatrix from './TypeCoverageMatrix';
import { supabase } from '../utils/supabaseClient';

interface BaseStats { hp: number; atk: number; def: number; spa: number; spd: number; spe: number; }
interface Pokemon { id: number; name: string; types: string[]; baseStats: BaseStats; }
interface Nature { name: string; raises: keyof BaseStats | null; lowers: keyof BaseStats | null; }

const NATURES: Nature[] = [
  { name: 'Adamant', raises: 'atk', lowers: 'spa' }, { name: 'Bold', raises: 'def', lowers: 'atk' },
  { name: 'Brave', raises: 'atk', lowers: 'spe' }, { name: 'Calm', raises: 'spd', lowers: 'atk' },
  { name: 'Careful', raises: 'spd', lowers: 'spa' }, { name: 'Gentle', raises: 'spd', lowers: 'def' },
  { name: 'Hardy', raises: null, lowers: null }, { name: 'Hasty', raises: 'spe', lowers: 'def' },
  { name: 'Impish', raises: 'def', lowers: 'spa' }, { name: 'Jolly', raises: 'spe', lowers: 'spa' },
  { name: 'Lax', raises: 'def', lowers: 'spd' }, { name: 'Lonely', raises: 'atk', lowers: 'def' },
  { name: 'Mild', raises: 'spa', lowers: 'def' }, { name: 'Modest', raises: 'spa', lowers: 'atk' },
  { name: 'Naive', raises: 'spe', lowers: 'spd' }, { name: 'Naughty', raises: 'atk', lowers: 'spd' },
  { name: 'Quiet', raises: 'spa', lowers: 'spe' }, { name: 'Rash', raises: 'spa', lowers: 'spd' },
  { name: 'Relaxed', raises: 'def', lowers: 'spe' }, { name: 'Sassy', raises: 'spd', lowers: 'spe' },
  { name: 'Serious', raises: null, lowers: null }, { name: 'Timid', raises: 'spe', lowers: 'atk' }
].sort((a, b) => a.name.localeCompare(b.name));

const STAT_LABELS: { key: keyof BaseStats; label: string }[] = [
  { key: 'atk', label: 'Attack' }, { key: 'def', label: 'Defense' },
  { key: 'spa', label: 'Sp. Atk' }, { key: 'spd', label: 'Sp. Def' },
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

interface TeamSlot {
  pokemon: Pokemon | null;
  nature: Nature;
  sp: BaseStats;
}

const DEFAULT_NATURE = NATURES.find(n => n.name === 'Adamant')!;
const DEFAULT_SP = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
const INITIAL_TEAM: TeamSlot[] = Array(6).fill({ pokemon: null, nature: DEFAULT_NATURE, sp: DEFAULT_SP });

export default function TeamBuilder() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  
  const [team, setTeam] = useState<TeamSlot[]>(INITIAL_TEAM);
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shareableLink, setShareableLink] = useState<string | null>(null);

  // Hydrate from Supabase on mount if URL contains a teamId
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
        console.error("Error fetching team:", error);
        alert("Team not found. Redirecting to new builder.");
        navigate('/');
      } else if (data.roster) {
        setTeam(data.roster as TeamSlot[]);
        // Generate the link immediately so the user can easily copy it again
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
    if (!searchTerm) return [];
    return pokemonData.filter(mon => mon.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 5);
  }, [searchTerm]);

  const updateActiveSlot = (updates: Partial<TeamSlot>) => {
    setTeam(prev => {
      const newTeam = [...prev];
      newTeam[activeIndex] = { ...newTeam[activeIndex], ...updates };
      return newTeam;
    });
    // Clear any share link if they modify the loaded team, since it's now a new variant
    setShareableLink(null);
  };

  const handleSpChange = (stat: keyof BaseStats, val: number) => {
    const targetValue = Math.max(0, val);
    const currentTotalWithoutThisStat = Object.values(activeSlot.sp).reduce((a, b) => a + b, 0) - activeSlot.sp[stat];
    const availablePool = SP_TOTAL_LIMIT - currentTotalWithoutThisStat;
    const safelyClampedValue = Math.min(targetValue, SP_STAT_LIMIT, availablePool);
    
    updateActiveSlot({ sp: { ...activeSlot.sp, [stat]: safelyClampedValue } });
  };

  const handleNatureStatChange = (type: 'raises' | 'lowers', statKey: keyof BaseStats) => {
    const newRaises = type === 'raises' ? statKey : activeSlot.nature.raises;
    const newLowers = type === 'lowers' ? statKey : activeSlot.nature.lowers;
    
    if (newRaises === newLowers) {
      updateActiveSlot({ nature: NATURES.find(n => n.raises === null)! });
      return;
    }
    const matchedNature = NATURES.find(n => n.raises === newRaises && n.lowers === newLowers);
    if (matchedNature) updateActiveSlot({ nature: matchedNature });
  };

  const calculateLvl50Stat = (statName: keyof BaseStats, base: number, statPoints: number) => {
    const iv = 31; 
    const level = 50;
    const ev = statPoints === 0 ? 0 : 4 + (statPoints - 1) * 8; 
    
    if (statName === 'hp') return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
    
    const rawStat = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
    
    if (activeSlot.nature.raises === statName) return Math.floor(rawStat * 1.1);
    if (activeSlot.nature.lowers === statName) return Math.floor(rawStat * 0.9);
    return rawStat;
  };

  const saveTeamToCloud = async () => {
    if (team.every(slot => slot.pokemon === null)) {
      alert("Cannot save an empty team!");
      return;
    }

    setIsSaving(true);
    const shortId = Math.random().toString(36).substring(2, 8);
    
    const { error } = await supabase
      .from('teams')
      .insert([
        { 
          short_id: shortId, 
          team_name: `${activeSlot.pokemon?.name || 'Unknown'}'s Team`,
          roster: team 
        }
      ]);

    setIsSaving(false);

    if (error) {
      console.error("Error saving team:", error);
      alert("Failed to save team. Check console.");
    } else {
      // Navigate to the newly generated URL to lock it in state
      navigate(`/team/${shortId}`);
    }
  };

  let totalRawStats = 0;
  let totalCalcStats = 0;

  if (isLoading) {
    return (
      <div className="w-full max-w-[800px] mx-auto text-center py-32 flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-slate-700 border-t-sky-500 rounded-full animate-spin"></div>
        <h2 className="text-xl font-bold text-slate-300 animate-pulse">Hydrating Cloud Roster...</h2>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[800px] mx-auto text-slate-200 font-sans pb-20">
      
      {/* Top Header & Roster Navigation */}
      <div className="flex justify-between items-end mb-6 gap-4">
        <div className="flex gap-2 flex-grow">
          {team.map((slot, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`flex-1 h-14 rounded-xl border flex items-center justify-center font-bold text-sm transition-all ${
                activeIndex === idx 
                  ? 'bg-[#1a1b26] border-sky-500 text-white shadow-[0_0_15px_rgba(14,165,233,0.3)]' 
                  : 'bg-[#13141c] border-[#2e3040] text-slate-500 hover:bg-[#1a1b26]'
              }`}
            >
              {slot.pokemon ? slot.pokemon.name : `Slot ${idx + 1}`}
            </button>
          ))}
        </div>
        
        <button 
          onClick={saveTeamToCloud}
          disabled={isSaving}
          className="h-14 px-6 bg-sky-500 hover:bg-sky-400 text-white font-black rounded-xl shadow-[0_0_20px_rgba(14,165,233,0.4)] transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? 'SAVING...' : 'SAVE & SHARE'}
        </button>
      </div>

      {/* Shareable Link Display */}
      {shareableLink && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex justify-between items-center text-emerald-400">
          <span className="font-bold">Team synchronized! Share this link:</span>
          <a href={shareableLink} className="font-mono underline text-white" target="_blank" rel="noreferrer">{shareableLink}</a>
        </div>
      )}

      <div className="bg-[#13141c] border border-[#2e3040] rounded-xl p-8 shadow-2xl">
        <div className="mb-6 relative">
          <input 
            type="text" 
            className="w-full p-3.5 bg-[#1a1b26] border border-[#2e3040] rounded-lg focus:border-sky-500 outline-none transition-colors text-white font-medium shadow-inner"
            placeholder="Search Pokémon to add to this slot..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchResults.length > 0 && !activeSlot.pokemon && (
            <ul className="absolute z-10 w-full mt-2 bg-[#1e1f2b] border border-[#2e3040] rounded-lg shadow-xl overflow-hidden">
              {searchResults.map((mon) => (
                <li 
                  key={mon.id} 
                  className="p-4 hover:bg-[#2a2b36] cursor-pointer flex justify-between items-center transition-colors"
                  onClick={() => { 
                    updateActiveSlot({ pokemon: mon as Pokemon, sp: DEFAULT_SP, nature: DEFAULT_NATURE }); 
                    setSearchTerm(''); 
                  }}
                >
                  <span className="font-bold text-white">{mon.name}</span>
                  <span className="text-xs text-slate-400 uppercase tracking-widest">{mon.types.join(' / ')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {activeSlot.pokemon && (
          <div className="bg-[#1a1b26] border border-[#2e3040] rounded-xl p-8">
            <div className="flex justify-between items-center mb-8 border-b border-[#2e3040] pb-4">
               <h2 className="text-3xl font-black text-white">{activeSlot.pokemon.name}</h2>
               <button 
                  onClick={() => updateActiveSlot({ pokemon: null, sp: DEFAULT_SP, nature: DEFAULT_NATURE })}
                  className="px-4 py-2 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500/20 font-bold transition-colors text-sm border border-rose-500/30"
               >
                  Clear Slot
               </button>
            </div>

            <div className="mb-8 border-b border-[#2e3040] pb-8">
              <h3 className="text-lg font-bold text-white mb-3">Nature</h3>
              <select 
                className="w-full bg-[#1e1f2b] border border-[#323445] rounded-lg p-3 text-white outline-none focus:border-sky-500 font-semibold appearance-none mb-4"
                value={activeSlot.nature.name}
                onChange={(e) => updateActiveSlot({ nature: NATURES.find(n => n.name === e.target.value)! })}
              >
                {NATURES.map(n => <option key={n.name} value={n.name}>{n.name}</option>)}
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
                    {STAT_LABELS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
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
                    {STAT_LABELS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
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
                const percentIncrease = statAtZeroSp === 0 ? 0 : (((statAtCurrentSp - statAtZeroSp) / statAtZeroSp) * 100).toFixed(1);

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
                              <span className={`text-${meta.colorAdded.replace('bg-', '')}`}>{`+${currentSp}`}</span>
                              <span className="text-slate-300 underline underline-offset-2">{`${percentIncrease}%`}</span>
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
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => handleSpChange(key, currentSp - 1)} className="w-10 h-10 rounded-lg bg-[#1e1f29] hover:bg-[#252735] flex items-center justify-center font-bold text-slate-400 border border-[#323444] transition-colors">—</button>
                      <div className="w-14 h-10 bg-[#161720] border border-[#323444] rounded-lg flex items-center justify-center text-sm font-bold text-white">{currentSp}</div>
                      <button onClick={() => handleSpChange(key, currentSp + 1)} disabled={totalSpUsed >= SP_TOTAL_LIMIT || currentSp >= SP_STAT_LIMIT} className="w-10 h-10 rounded-lg bg-[#1e1f29] hover:bg-[#252735] flex items-center justify-center font-bold text-green-500 border border-[#323444] disabled:opacity-30 transition-colors">+</button>
                      <button onClick={() => handleSpChange(key, SP_STAT_LIMIT)} disabled={totalSpUsed >= SP_TOTAL_LIMIT || currentSp >= SP_STAT_LIMIT} className="w-12 h-10 rounded-lg bg-[#1e1f29] hover:bg-[#252735] flex items-center justify-center text-[10px] font-black text-slate-300 border border-[#323444] disabled:opacity-30 tracking-widest transition-colors">MAX</button>
                    </div>

                    <div className="w-24 text-right flex flex-col flex-shrink-0">
                      <div className="font-bold text-[15px]">
                        <span className={currentSp > 0 ? "text-sky-300" : "text-white"}>{rawStat}</span>
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
                  {totalSpUsed}/{SP_TOTAL_LIMIT} used <span className="text-slate-400 font-normal">({spLeft} left)</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">Stat Points</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-white">{totalRawStats} / {totalCalcStats}</div>
                <div className="text-xs text-slate-500 mt-1">Raw / Lvl 50 Total</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {activeSlot.pokemon && <TypeCoverageMatrix types={activeSlot.pokemon.types} />}
    </div>
  );
}