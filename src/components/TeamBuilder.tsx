import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TeamDiscussion from './TeamDiscussion';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

import type { TeamSlot, ChampionsPokemon, BaseStats, Nature } from '../types';
import { NATURES, STAT_LABELS, STAT_METADATA, TYPE_COLORS, ALL_TYPES, PARSED_CHAMPIONS_LIST, PARSED_ITEMS_LIST } from '../utils/constants';
import { getPokemonImageUrl, getTypeIconUrl, getItemImageUrl, getMoveCategoryUrl, calculateLvl50StatForSlot } from '../utils/helpers';

const CompactTypeBadge = ({ type }: { type: string }) => (
  <img 
    src={getTypeIconUrl(type)} 
    alt={type} 
    title={type}
    className="w-3.5 h-3.5 xl:w-5 xl:h-5 drop-shadow-sm object-contain" 
    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} 
  />
);

const DEFAULT_NATURE = NATURES.find((n) => n.name === 'Adamant')!;
const DEFAULT_SP: BaseStats = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
const INITIAL_TEAM: TeamSlot[] = Array(6).fill(null).map(() => ({
  pokemon: null,
  nature: DEFAULT_NATURE,
  sp: { ...DEFAULT_SP },
  selectedAbility: '',
  selectedMoves: [null, null, null, null],
  item: ''
}));

const getMultiplierData = (mon: ChampionsPokemon, attackType: string) => {
  const immune = mon.typeDefenses.immuneTo.find(t => t.type === attackType);
  if (immune) return { text: '0', val: 0 };

  const weak = mon.typeDefenses.weakTo.find(t => t.type === attackType);
  if (weak) return { text: `x${weak.multiplier.replace('x', '')}`, val: parseFloat(weak.multiplier.replace('x', '')) };

  const resist = mon.typeDefenses.resists.find(t => t.type === attackType);
  if (resist) {
    let val = 0.5;
    if (resist.multiplier === '1/4x') val = 0.25;
    return { text: resist.multiplier === '1/2x' ? 'x0.5' : 'x0.25', val };
  }

  return { text: 'x1', val: 1 };
};

export default function TeamBuilder() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { user, setAuthModalOpen } = useAuth();

  const [teamName, setTeamName] = useState('My Team');
  const [team, setTeam] = useState<TeamSlot[]>(INITIAL_TEAM);
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statView, setStatView] = useState<'lvl50' | 'base'>('lvl50');
  const [draggedSlotIndex, setDraggedSlotIndex] = useState<number | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shareableLink, setShareableLink] = useState<string | null>(null);

  const [activeMoveSlotIndex, setActiveMoveSlotIndex] = useState<number | null>(null);
  const [moveSearchQuery, setMoveSearchQuery] = useState('');
  
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState('');

  const [isNatureDropdownOpen, setIsNatureDropdownOpen] = useState(false);
  const natureDropdownRef = useRef<HTMLDivElement>(null);

  // Import Modal State updated for Hybrid Input
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importInput, setImportInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (natureDropdownRef.current && !natureDropdownRef.current.contains(event.target as Node)) {
        setIsNatureDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchTeam = async () => {
      if (!teamId) {
        setTeam(INITIAL_TEAM);
        return;
      }

      setIsLoading(true);
      const { data, error } = await supabase
        .from('teams')
        .select('roster, team_name')
        .eq('short_id', teamId)
        .single();

      if (error || !data) {
        alert('Team not found. Redirecting to new builder.');
        navigate('/');
      } else if (data.roster) {
        setTeam(data.roster as TeamSlot[]);
        setTeamName(data.team_name || 'Imported Team');
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
  const activeTeamMembers = useMemo(() => team.filter(t => t.pokemon !== null), [team]);
  const totalSpUsed = Object.values(activeSlot.sp).reduce((a, b) => a + b, 0);
  const spLeft = SP_TOTAL_LIMIT - totalSpUsed;

  const matrixData = useMemo(() => {
    return ALL_TYPES.map(type => {
      const row = activeTeamMembers.map(slot => getMultiplierData(slot.pokemon!, type));
      const weakCount = row.filter(r => r.val > 1).length;
      const resistCount = row.filter(r => r.val < 1).length; 
      const net = resistCount - weakCount;
      return { type, row, weakCount, resistCount, net };
    });
  }, [activeTeamMembers]);

  const sharedWeaknesses = matrixData.filter(d => d.weakCount >= 2);
  const unresisted = matrixData.filter(d => d.resistCount === 0);

  const searchResults = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    const selectedNames = team.map(slot => slot.pokemon?.name).filter(Boolean);
    let results = PARSED_CHAMPIONS_LIST.filter(mon => !selectedNames.includes(mon.name));

    if (query) {
      results = results.filter((mon) => mon.name.toLowerCase().includes(query));
    }
    return results;
  }, [searchTerm, team]);

  const filteredItems = useMemo(() => {
    if (!itemSearchQuery.trim()) return PARSED_ITEMS_LIST;
    const q = itemSearchQuery.toLowerCase();
    return PARSED_ITEMS_LIST.filter(i => 
      i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)
    );
  }, [itemSearchQuery]);

  const filteredMoves = useMemo(() => {
    if (!activeSlot || !activeSlot.pokemon || !Array.isArray(activeSlot.pokemon.moves)) return [];
    
    const selectedMovesSet = new Set(activeSlot.selectedMoves.filter(Boolean));
    const availableMoves = activeSlot.pokemon.moves.filter(m => !selectedMovesSet.has(m.name));

    if (!moveSearchQuery.trim()) return availableMoves;
    const q = moveSearchQuery.toLowerCase();
    return availableMoves.filter(
      (m) =>
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.type && m.type.toLowerCase().includes(q)) ||
        (m.category && m.category.toLowerCase().includes(q))
    );
  }, [activeSlot, moveSearchQuery]);

  const updateSpecificSlot = (idx: number, updates: Partial<TeamSlot>) => {
    setTeam((prev) => {
      const newTeam = [...prev];
      newTeam[idx] = { ...newTeam[idx], ...updates };
      return newTeam;
    });
    setShareableLink(null);
  };

  const updateActiveSlot = (updates: Partial<TeamSlot>) => {
    updateSpecificSlot(activeIndex, updates);
  };

  const handleSelectPokemon = (mon: ChampionsPokemon) => {
    updateActiveSlot({
      pokemon: mon,
      nature: DEFAULT_NATURE,
      sp: { ...DEFAULT_SP },
      selectedAbility: mon.abilities[0]?.name || '',
      selectedMoves: [null, null, null, null],
      item: ''
    });
    setSearchTerm('');
  };

  const handleSpChange = (stat: keyof BaseStats, val: number) => {
    if (isNaN(val)) val = 0;
    const targetValue = Math.max(0, val);
    const currentTotalWithoutThisStat =
      Object.values(activeSlot.sp).reduce((a, b) => a + b, 0) - activeSlot.sp[stat];
    const availablePool = SP_TOTAL_LIMIT - currentTotalWithoutThisStat;
    const safelyClampedValue = Math.min(targetValue, SP_STAT_LIMIT, availablePool);

    updateActiveSlot({ sp: { ...activeSlot.sp, [stat]: safelyClampedValue } });
  };

  const getListStat = (base: number, statKey: keyof BaseStats) => {
    if (statView === 'base') return base;
    return statKey === 'hp' ? base + 75 : base + 20;
  };

  const getNatureDisplayString = (n: Nature) => {
    if (!n.raises) return `${n.name} Neutral`;
    return `${n.name}`;
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

  const handleExportPokepaste = () => {
    if (team.every((slot) => slot.pokemon === null)) {
      alert('Cannot export an empty team!');
      return;
    }

    const statKeys = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };
    let pasteText = '';

    team.forEach(slot => {
      if (!slot.pokemon) return;
      pasteText += `${slot.pokemon.name}${slot.item ? ` @ ${slot.item}` : ''}\n`;
      if (slot.selectedAbility) pasteText += `Ability: ${slot.selectedAbility}\n`;
      pasteText += `Level: 50\n`; 

      const evs: string[] = [];
      (Object.keys(slot.sp) as (keyof BaseStats)[]).forEach(k => {
        if (slot.sp[k] > 0) evs.push(`${slot.sp[k]} ${statKeys[k]}`);
      });
      if (evs.length > 0) pasteText += `EVs: ${evs.join(' / ')}\n`;

      pasteText += `${slot.nature.name} Nature\n`;

      slot.selectedMoves.forEach(m => {
        if (m) pasteText += `- ${m}\n`;
      });
      pasteText += '\n';
    });

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://pokepast.es/create';
    form.target = '_blank';

    const pasteInput = document.createElement('input');
    pasteInput.type = 'hidden';
    pasteInput.name = 'paste';
    pasteInput.value = pasteText.trim();
    form.appendChild(pasteInput);

    const titleInput = document.createElement('input');
    titleInput.type = 'hidden';
    titleInput.name = 'title';
    titleInput.value = teamName || 'Pokechamp Export';
    form.appendChild(titleInput);

    const authorInput = document.createElement('input');
    authorInput.type = 'hidden';
    authorInput.name = 'author';
    authorInput.value = user ? (user.email?.split('@')[0] || 'Trainer') : 'Guest';
    form.appendChild(authorInput);

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  const handleImport = async () => {
    if (!importInput.trim()) return;
    setIsImporting(true);

    let rawText = '';
    let extractedTitle = 'Imported Team';

    // Step 1: Detect if the user pasted a Pokepaste URL instead of raw text
    if (importInput.includes('pokepast.es')) {
      const match = importInput.match(/pokepast\.es\/([a-zA-Z0-9]+)/);
      if (match) {
        const pasteId = match[1];
        const pasteUrl = `https://pokepast.es/${pasteId}`;
        try {
          const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(pasteUrl)}`);
          if (response.ok) {
            const data = await response.json();
            if (data.contents) {
              const parser = new DOMParser();
              const doc = parser.parseFromString(data.contents, 'text/html');
              extractedTitle = doc.querySelector('aside h1')?.textContent?.trim() || 'Imported Team';
              
              const pres = Array.from(doc.querySelectorAll('article pre'));
              rawText = pres.map(pre => pre.textContent || '').join('\n\n');
            }
          }
        } catch (e) {
          console.warn("Proxy connection refused. Pokepaste is blocking automated requests.");
        }
      }

      // Fallback if the proxy gets blocked by Cloudflare (522 / 403 errors)
      if (!rawText) {
        setIsImporting(false);
        alert("Poképaste's security blocked the connection.\n\nPlease open the Poképaste link, copy the text itself, and paste it directly into this box instead!");
        return;
      }
    } else {
      // Step 2: The user correctly pasted the raw Showdown text directly
      rawText = importInput;
    }

    // Step 3: Robust Parsing Engine for Raw Showdown Text
    try {
      // Split by double newlines to isolate each Pokemon block
      const blocks = rawText.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
      const newTeam = [...INITIAL_TEAM];

      blocks.forEach((block, idx) => {
        if (idx >= 6) return; 
        
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) return;

        const firstLine = lines[0];
        let pokemonName = firstLine.split('@')[0].trim();
        let item = firstLine.split('@')[1]?.trim() || '';

        // Handle Nicknames (e.g. "Nickname (RealName)")
        if (pokemonName.includes('(') && pokemonName.includes(')')) {
          const match = pokemonName.match(/\((.*?)\)/);
          if (match) pokemonName = match[1].trim();
        }
        
        // Strip genders
        pokemonName = pokemonName.replace(/\(M\)|\(F\)/g, '').trim();

        // Exact Match Search
        let mon = PARSED_CHAMPIONS_LIST.find(p => p.name.toLowerCase() === pokemonName.toLowerCase());
        
        // Smart Fallback Match (Strips suffixes like -White, -Mega-Z to grab the base Pokémon)
        if (!mon && pokemonName.includes('-')) {
          const baseName = pokemonName.split('-')[0];
          mon = PARSED_CHAMPIONS_LIST.find(p => p.name.toLowerCase() === baseName.toLowerCase());
        }

        if (!mon) {
          console.warn(`Could not find a match for Pokemon: ${pokemonName}. Skipping slot.`);
          return; 
        }

        const slot: TeamSlot = {
          pokemon: mon,
          nature: DEFAULT_NATURE,
          sp: { ...DEFAULT_SP },
          selectedAbility: '',
          selectedMoves: [null, null, null, null],
          item: item
        };

        let moveIdx = 0;

        lines.slice(1).forEach(line => {
          if (line.startsWith('Ability:')) {
            slot.selectedAbility = line.replace('Ability:', '').trim();
          } else if (line.startsWith('EVs:')) {
            const evParts = line.replace('EVs:', '').split('/');
            evParts.forEach(part => {
              const [val, stat] = part.trim().split(' ');
              const num = parseInt(val);
              if (isNaN(num)) return;
              const s = stat.toLowerCase();
              if (s.includes('hp')) slot.sp.hp = num;
              if (s.includes('atk')) slot.sp.atk = num;
              if (s.includes('def')) slot.sp.def = num;
              if (s.includes('spa')) slot.sp.spa = num;
              if (s.includes('spd')) slot.sp.spd = num;
              if (s.includes('spe')) slot.sp.spe = num;
            });
          } else if (line.includes(' Nature')) {
            const natureName = line.replace('Nature', '').trim();
            const nature = NATURES.find(n => n.name.toLowerCase() === natureName.toLowerCase());
            if (nature) slot.nature = nature;
          } else if (line.startsWith('-')) {
            if (moveIdx < 4) {
              slot.selectedMoves[moveIdx] = line.replace(/^-/, '').trim();
              moveIdx++;
            }
          }
        });

        newTeam[idx] = slot;
      });

      setTeam(newTeam);
      if (extractedTitle !== 'Imported Team') setTeamName(extractedTitle);
      setIsImportModalOpen(false);
      setImportInput('');

    } catch (err: any) {
      console.error(err);
      alert('Failed to parse the team format. Ensure you pasted valid Showdown text.');
    } finally {
      setIsImporting(false);
    }
  };

  const saveTeamToCloud = async () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    if (team.every((slot) => slot.pokemon === null)) {
      alert('Cannot save an empty team!');
      return;
    }

    setIsSaving(true);
    const shortId = Math.random().toString(36).substring(2, 8);

    const { error } = await supabase.from('teams').insert([
      {
        short_id: shortId,
        team_name: teamName || 'My Team',
        roster: team,
        user_id: user.id
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

  if (isLoading) {
    return (
      <div className="w-full max-w-[1000px] mx-auto text-center py-32 flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-slate-700 border-t-sky-500 rounded-full animate-spin"></div>
        <h2 className="text-xl font-bold text-slate-300 animate-pulse">Hydrating Cloud Roster...</h2>
      </div>
    );
  }

  let totalRawStats = 0;
  let totalCalcStats = 0;

  return (
    <div className="w-full max-w-[1400px] mx-auto text-slate-200 font-sans pb-20">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-[#13141c] border border-[#2e3040] p-4 sm:p-6 rounded-2xl shadow-lg">
        <div className="w-full md:w-1/2 flex items-center gap-3">
          <svg className="w-6 h-6 text-slate-500 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Name your team..."
            className="w-full bg-transparent border-b-2 border-transparent hover:border-[#2e3040] focus:border-sky-500 text-2xl sm:text-3xl font-black text-white tracking-tight outline-none pb-1 transition-colors px-1"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex-1 md:flex-none px-4 sm:px-6 py-2.5 bg-[#1a1b26] hover:bg-[#20222e] border border-[#2e3040] text-slate-300 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
            Import
          </button>
          <button
            onClick={handleExportPokepaste}
            className="flex-1 md:flex-none px-4 sm:px-6 py-2.5 bg-[#1a1b26] hover:bg-[#20222e] border border-[#2e3040] text-slate-300 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Export
          </button>
          <button
            onClick={saveTeamToCloud}
            disabled={isSaving}
            className="w-full md:w-auto px-6 sm:px-8 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-black rounded-xl shadow-[0_0_20px_rgba(14,165,233,0.4)] transition-all flex items-center justify-center tracking-wider disabled:opacity-50 text-sm mt-2 md:mt-0"
          >
            {isSaving ? 'SAVING...' : 'SAVE TEAM'}
          </button>
        </div>
      </div>

      {shareableLink && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-emerald-400">
          <span className="font-bold text-sm">Team synchronized! Share this link:</span>
          <a href={shareableLink} className="font-mono underline text-white text-sm break-all" target="_blank" rel="noreferrer">
            {shareableLink}
          </a>
        </div>
      )}

      {/* Main Split Layout Container */}
      <div className="flex flex-col lg:flex-row gap-4 xl:gap-6 items-start">

        {/* LEFT COLUMN: Roster Grid + Active Editor */}
        <div className="flex-1 w-full min-w-0 flex flex-col gap-6">
          
          {/* Grid of 6 Draggable Roster Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 xl:gap-6">
            {team.map((slot, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={() => setDraggedSlotIndex(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedSlotIndex === null || draggedSlotIndex === idx) return;
                  const newTeam = [...team];
                  const temp = newTeam[draggedSlotIndex];
                  newTeam[draggedSlotIndex] = newTeam[idx];
                  newTeam[idx] = temp;
                  setTeam(newTeam);
                  if (activeIndex === draggedSlotIndex) setActiveIndex(idx);
                  else if (activeIndex === idx) setActiveIndex(draggedSlotIndex);
                  setDraggedSlotIndex(null);
                }}
                onClick={() => setActiveIndex(idx)}
                className={`relative px-2 sm:px-4 xl:px-5 pt-5 sm:pt-6 xl:pt-8 pb-3 sm:pb-4 xl:pb-5 min-h-[220px] sm:min-h-[250px] xl:min-h-[380px] rounded-2xl border-2 transition-all cursor-pointer shadow-lg overflow-hidden flex flex-col ${
                  activeIndex === idx
                    ? 'border-sky-500 bg-[#1a1b26] shadow-[0_0_20px_rgba(14,165,233,0.15)]'
                    : 'border-[#2e3040] bg-[#13141c] hover:border-slate-500'
                } ${draggedSlotIndex === idx ? 'opacity-40 border-dashed' : 'opacity-100'}`}
              >
                {slot.pokemon && (
                  <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none ${TYPE_COLORS[slot.pokemon.types[0]] || 'bg-slate-500'}`}></div>
                )}

                {/* Drag Handle (Top Right) */}
                <div className="absolute top-2 xl:top-4 right-2 xl:right-4 text-slate-500 hover:text-white cursor-grab active:cursor-grabbing z-10" title="Drag to reorder slot">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>
                </div>

                {/* Delete Slot X (Top Left) */}
                {slot.pokemon && (
                  <button
                    className="absolute top-2 xl:top-3 left-2 xl:left-3 text-rose-500 hover:text-rose-400 p-1 bg-rose-500/10 rounded-lg z-10 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateSpecificSlot(idx, { pokemon: null, sp: { ...DEFAULT_SP }, nature: DEFAULT_NATURE, selectedAbility: '', selectedMoves: [null, null, null, null], item: '' });
                    }}
                    title="Clear Slot"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                )}

                {slot.pokemon ? (
                  <div className="flex flex-col h-full relative z-0">
                    
                    {/* Header: Name & Type Icons */}
                    <div className="flex flex-col xl:flex-row items-center justify-center gap-1 xl:gap-2 mb-2 px-2 xl:px-6">
                      <span className="font-black text-white text-xs sm:text-sm lg:text-base xl:text-xl truncate max-w-full">{slot.pokemon.name}</span>
                      <div className="flex gap-1 flex-shrink-0">
                        {slot.pokemon.types.map(t => <CompactTypeBadge key={t} type={t} />)}
                      </div>
                    </div>

                    {/* Sprite with Item Overlay */}
                    <div className="flex justify-center mb-3 sm:mb-4 xl:mb-6 relative">
                      <img src={getPokemonImageUrl(slot.pokemon.name)} className="h-14 sm:h-16 lg:h-20 xl:h-32 object-contain drop-shadow-2xl relative z-10 transition-all" alt={slot.pokemon.name} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      {slot.item && (
                        <div className="absolute -bottom-2 z-20 bg-[#20222e] rounded-full px-2 xl:px-3 py-0.5 xl:py-1 border border-[#323445] shadow-lg flex items-center gap-1.5 max-w-[95%]">
                          <img src={getItemImageUrl(slot.item)} className="w-3 h-3 xl:w-4 xl:h-4 object-contain" alt={slot.item} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                          <span className="text-[9px] xl:text-xs font-black text-white truncate hidden sm:block">{slot.item}</span>
                        </div>
                      )}
                    </div>

                    {/* Ability */}
                    <div className="text-center text-[10px] sm:text-[11px] xl:text-sm font-black text-white mb-2 sm:mb-3 xl:mb-4 tracking-wide truncate px-1">
                      {slot.selectedAbility || 'No Ability'}
                    </div>

                    {/* Moves List */}
                    <div className="space-y-1 xl:space-y-2.5 mb-3 sm:mb-4 xl:mb-6">
                      {slot.selectedMoves.map((m, i) => {
                        const moveDetails = m ? slot.pokemon!.moves.find(x => x.name === m) : null;
                        return (
                          <div key={i} className="flex items-center gap-1.5 xl:gap-3">
                            {moveDetails ? (
                              <>
                                <img src={getTypeIconUrl(moveDetails.type)} className="w-3.5 h-3.5 xl:w-5 xl:h-5 drop-shadow-sm flex-shrink-0 object-contain" alt={moveDetails.type} title={moveDetails.type} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                                <span className="text-[9px] sm:text-[10px] xl:text-sm font-bold text-slate-200 truncate">{m}</span>
                              </>
                            ) : (
                              <>
                                <div className="w-3.5 h-3.5 xl:w-5 xl:h-5 rounded-full border border-dashed border-slate-600 flex-shrink-0"></div>
                                <span className="text-[9px] sm:text-[10px] xl:text-sm font-semibold text-slate-600 italic truncate">Select Move...</span>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Mini Stat Summary - Perfectly Aligned inline */}
                    <div className="space-y-1 sm:space-y-1.5 xl:space-y-2 mt-auto bg-[#13141c] -mx-1 sm:-mx-2 xl:-mx-3 -mb-1 sm:-mb-2 xl:-mb-3 p-1.5 sm:p-2 xl:p-4 rounded-xl border border-[#2e3040]">
                      {STAT_LABELS.map(s => {
                        const baseVal = slot.pokemon!.baseStats[s.key];
                        const spVal = slot.sp[s.key];
                        const total = calculateLvl50StatForSlot(slot, s.key);
                        const isRaises = slot.nature.raises === s.key;
                        const isLowers = slot.nature.lowers === s.key;
                        const meta = STAT_METADATA[s.key];
                        
                        const baseW = Math.min((baseVal / METER_ABSOLUTE_MAX) * 100, 100);
                        const spW = Math.min((spVal / METER_ABSOLUTE_MAX) * 100, 100 - baseW);

                        return (
                          <div key={s.key} className="flex items-center gap-1 sm:gap-1.5 xl:gap-2">
                            <div className="w-8 sm:w-10 xl:w-12 flex items-center font-black text-slate-400 text-[8px] sm:text-[9px] xl:text-[11px] tracking-wider flex-shrink-0">
                              <div className="w-2 sm:w-3 flex justify-start">
                                {isRaises ? <span className="text-rose-400">↑</span> : isLowers ? <span className="text-sky-400">↓</span> : ''}
                              </div>
                              <span className="text-right flex-1">{s.label.replace('Sp. ', 'SP').substring(0,3).toUpperCase()}</span>
                            </div>
                            
                            <div className="flex-1 h-1 sm:h-1.5 bg-[#20222e] rounded-full overflow-hidden flex shadow-inner min-w-[15px]">
                              <div className={`${meta.colorBase} h-full`} style={{ width: `${baseW}%` }}></div>
                              <div className={`${meta.colorAdded} h-full`} style={{ width: `${spW}%` }}></div>
                            </div>
                            
                            <div className="flex items-center justify-end gap-0.5 sm:gap-1.5 w-[30px] sm:w-[40px] xl:w-[55px] flex-shrink-0">
                              <div className="flex-1 flex justify-end items-center">
                                {spVal > 0 ? (
                                  <span className="text-yellow-400 text-[7px] sm:text-[9px] xl:text-[10px] font-black leading-none">+{spVal}</span>
                                ) : (
                                  <span className="text-[7px] sm:text-[9px] xl:text-[10px] leading-none text-transparent select-none">0</span>
                                )}
                              </div>
                              <div className="w-4 sm:w-6 xl:w-8 flex justify-end items-center">
                                <span className="font-bold text-white text-[9px] sm:text-[11px] xl:text-[13px] font-mono leading-none">{total}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500/50 pt-4 xl:pt-8 pb-2 xl:pb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 xl:w-20 xl:h-20 rounded-full border-2 border-dashed border-slate-500/50 flex items-center justify-center mb-3 xl:mb-6">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 xl:w-8 xl:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </div>
                    <div className="text-[9px] sm:text-[10px] xl:text-base font-bold tracking-widest uppercase text-slate-400 text-center w-full px-1 truncate">Empty Slot {idx + 1}</div>
                    <div className="text-[8px] sm:text-[9px] xl:text-xs mt-1 xl:mt-2 font-semibold">Click to select</div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Active Editor Workspace */}
          <div className="bg-[#13141c] border border-[#2e3040] rounded-2xl p-4 sm:p-8 shadow-2xl relative">
            <div className="absolute top-0 right-4 sm:right-8 px-4 py-1 bg-sky-500 text-slate-900 font-black text-xs rounded-b-lg shadow-md">
              EDITING SLOT {activeIndex + 1}
            </div>

            {!activeSlot.pokemon ? (
              <div className="pt-8 sm:pt-4 flex flex-col h-[700px]">
                {/* Search Box and Level Toggle - Mobile Stacked */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </span>
                    <input
                      type="text"
                      className="w-full p-3.5 pl-12 bg-[#1a1b26] border border-[#2e3040] rounded-xl focus:border-sky-500 outline-none transition-all text-white font-medium shadow-inner placeholder:text-slate-500 text-base"
                      placeholder="Search Champions Pokémon..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex bg-[#1a1b26] rounded-xl border border-[#2e3040] p-1 shadow-inner h-[54px] flex-shrink-0">
                    <button
                      onClick={() => setStatView('lvl50')}
                      className={`flex-1 sm:flex-none px-6 py-2 rounded-lg font-black text-sm transition-colors ${statView === 'lvl50' ? 'bg-[#323445] text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Lvl 50
                    </button>
                    <button
                      onClick={() => setStatView('base')}
                      className={`flex-1 sm:flex-none px-6 py-2 rounded-lg font-black text-sm transition-colors ${statView === 'base' ? 'bg-[#323445] text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Base
                    </button>
                  </div>
                </div>
                
                {/* Table Structure List - Mobile Horizontal Scroll wrapper */}
                <div className="flex flex-col flex-1 bg-[#1a1b26] border border-[#2e3040] rounded-xl overflow-hidden shadow-inner overflow-x-auto">
                  <div className="min-w-[650px] flex flex-col h-full">
                    {/* Header */}
                    <div className="grid grid-cols-[minmax(180px,_1fr)_repeat(6,_minmax(40px,_60px))] gap-2 sm:gap-6 items-center px-6 py-4 border-b border-[#2e3040] bg-[#13141c]">
                      <div className="font-black text-white uppercase tracking-wider text-sm">Pokemon</div>
                      <div className="text-center font-black text-white text-xs tracking-wider">HP</div>
                      <div className="text-center font-black text-white text-xs tracking-wider">ATK</div>
                      <div className="text-center font-black text-white text-xs tracking-wider">DEF</div>
                      <div className="text-center font-black text-white text-xs tracking-wider">SPA</div>
                      <div className="text-center font-black text-white text-xs tracking-wider">SPD</div>
                      <div className="text-center font-black text-white text-xs tracking-wider">SPE</div>
                    </div>

                    {/* Scrolling Content */}
                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                      {searchResults.length > 0 ? (
                        searchResults.map((mon) => (
                          <div
                            key={mon.name}
                            onClick={() => handleSelectPokemon(mon)}
                            className="grid grid-cols-[minmax(180px,_1fr)_repeat(6,_minmax(40px,_60px))] gap-2 sm:gap-6 items-center px-6 py-3 border-b border-[#2e3040]/50 hover:bg-[#20222e] cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <img
                                src={getPokemonImageUrl(mon.name)}
                                alt={mon.name}
                                className="w-10 h-10 object-contain drop-shadow-md flex-shrink-0"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                              />
                              <div className="flex flex-col truncate">
                                <span className="font-black text-white text-sm truncate">{mon.name}</span>
                                <div className="flex gap-1.5 mt-1">
                                  {mon.types.map((t) => <CompactTypeBadge key={t} type={t} />)}
                                </div>
                              </div>
                            </div>

                            <div className="text-center font-black font-mono text-emerald-400">{getListStat(mon.baseStats.hp, 'hp')}</div>
                            <div className="text-center font-black font-mono text-rose-500">{getListStat(mon.baseStats.atk, 'atk')}</div>
                            <div className="text-center font-black font-mono text-yellow-400">{getListStat(mon.baseStats.def, 'def')}</div>
                            <div className="text-center font-black font-mono text-sky-500">{getListStat(mon.baseStats.spa, 'spa')}</div>
                            <div className="text-center font-black font-mono text-purple-400">{getListStat(mon.baseStats.spd, 'spd')}</div>
                            <div className="text-center font-black font-mono text-fuchsia-500">{getListStat(mon.baseStats.spe, 'spe')}</div>
                          </div>
                        ))
                      ) : (
                        <div className="py-16 text-center text-slate-500 font-bold text-lg">
                          No Pokémon matched your search.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="pt-6 sm:pt-2">
                
                {/* Header: Change Pokémon Button - Mobile Stacked */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8 border-b border-[#2e3040] pb-6">
                  <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                    <img src={getPokemonImageUrl(activeSlot.pokemon.name)} className="w-10 h-10 sm:w-12 sm:h-12 object-contain drop-shadow-md" alt="" />
                    <span className="truncate">{activeSlot.pokemon.name} Setup</span>
                  </h2>
                  <button
                    onClick={() => updateActiveSlot({ pokemon: null, sp: { ...DEFAULT_SP }, nature: DEFAULT_NATURE, selectedAbility: '', selectedMoves: [null, null, null, null], item: '' })}
                    className="w-full sm:w-auto px-5 py-2.5 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white font-bold transition-colors text-sm border border-rose-500/30 flex items-center justify-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    Change Pokémon
                  </button>
                </div>

                {/* Left: Nature/Item, Right: Ability List */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8 border-b border-[#2e3040] pb-8">
                  
                  <div className="flex flex-col gap-6">
                    
                    {/* Custom Nature Selector */}
                    <div className="relative" ref={natureDropdownRef}>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nature</h3>
                      <div 
                        onClick={() => setIsNatureDropdownOpen(!isNatureDropdownOpen)}
                        className="w-full bg-[#13141c] border border-[#2e3040] rounded-lg p-3 text-white hover:border-sky-500 font-bold cursor-pointer shadow-inner flex justify-between items-center mb-3"
                      >
                        <span>{getNatureDisplayString(activeSlot.nature)}</span>
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                      {isNatureDropdownOpen && (
                        <div className="absolute top-[70px] left-0 w-full mt-2 bg-[#1a1b26] border border-[#2e3040] rounded-xl shadow-2xl z-30 max-h-72 overflow-y-auto custom-scrollbar">
                          {NATURES.map((n) => (
                            <div 
                              key={n.name}
                              onClick={() => {
                                updateActiveSlot({ nature: n });
                                setIsNatureDropdownOpen(false);
                              }}
                              className={`p-3 border-b border-[#2e3040]/50 hover:bg-[#20222e] cursor-pointer flex items-center justify-between transition-colors ${activeSlot.nature.name === n.name ? 'bg-[#20222e] text-white' : 'text-slate-300'}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${activeSlot.nature.name === n.name ? 'border-sky-500' : 'border-slate-600'}`}>
                                  {activeSlot.nature.name === n.name && <div className="w-2 h-2 rounded-full bg-sky-500"></div>}
                                </div>
                                <span className="font-bold">{n.name}</span>
                              </div>
                              <span className="text-xs text-slate-400">
                                {n.raises ? `+${STAT_METADATA[n.raises].label} / -${STAT_METADATA[n.lowers!].label}` : 'Neutral'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex gap-3 items-center mt-1">
                        <div className="flex items-center justify-between flex-1 bg-[#13141c] border border-[#2e3040] rounded-lg p-3 shadow-inner">
                          <span className="text-white font-bold text-sm">
                            {activeSlot.nature.raises ? STAT_METADATA[activeSlot.nature.raises].label : '—'}
                          </span>
                          <span className="text-rose-500 font-bold text-xs">+10%</span>
                        </div>
                        
                        <div className="flex items-center justify-between flex-1 bg-[#13141c] border border-[#2e3040] rounded-lg p-3 shadow-inner">
                          <span className="text-white font-bold text-sm">
                            {activeSlot.nature.lowers ? STAT_METADATA[activeSlot.nature.lowers].label : '—'}
                          </span>
                          <span className="text-sky-500 font-bold text-xs">-10%</span>
                        </div>
                      </div>
                    </div>

                    {/* Held Item Selector */}
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Held Item</h3>
                      <div 
                        onClick={() => setIsItemModalOpen(true)}
                        className="flex flex-col gap-2 bg-[#13141c] border border-[#2e3040] hover:border-yellow-500 rounded-lg p-3 cursor-pointer transition-all shadow-inner group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-[#20222e] flex items-center justify-center flex-shrink-0 group-hover:bg-[#2a2d3d] transition-colors border border-[#323445]">
                            {activeSlot.item ? (
                              <img src={getItemImageUrl(activeSlot.item)} alt={activeSlot.item} className="w-7 h-7 object-contain drop-shadow-sm" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                            ) : (
                              <span className="text-slate-500 font-bold text-lg">+</span>
                            )}
                          </div>
                          <span className={`font-bold text-base truncate ${activeSlot.item ? 'text-yellow-400' : 'text-slate-500'}`}>
                            {activeSlot.item || 'Select Held Item...'}
                          </span>
                        </div>
                        {activeSlot.item && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2 pr-2">
                            {PARSED_ITEMS_LIST.find(i => i.name === activeSlot.item)?.description}
                          </p>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Ability Custom Radio List */}
                  <div className="flex flex-col">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ability</h3>
                    <div className="flex flex-col gap-3">
                      {activeSlot.pokemon.abilities.map((ab) => {
                        const isSelected = activeSlot.selectedAbility === ab.name;
                        return (
                          <div 
                            key={ab.name}
                            onClick={() => updateActiveSlot({ selectedAbility: ab.name })}
                            className={`p-4 rounded-xl border transition-all cursor-pointer ${isSelected ? 'bg-[#13141c] border-emerald-500' : 'bg-[#1a1b26] border-[#2e3040] hover:border-slate-500'}`}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-emerald-500' : 'border-slate-600'}`}>
                                {isSelected && <div className="w-2 h-2 rounded-full bg-emerald-500"></div>}
                              </div>
                              <span className={`font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>{ab.name}</span>
                            </div>
                            <p className={`text-xs pl-7 leading-relaxed ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                              {ab.description !== 'Description not found.' ? ab.description : 'No description available.'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Stat Points Engine - Mobile Sizing Applied */}
                <div className="space-y-3 sm:space-y-4">
                  {STAT_LABELS.map((s) => {
                    const key = s.key;
                    const baseValue = activeSlot.pokemon!.baseStats[key];
                    const meta = STAT_METADATA[key];
                    const currentSp = activeSlot.sp[key];

                    const rawStat = baseValue + currentSp;
                    const statAtZeroSp = calculateLvl50StatForSlot(activeSlot, key); 
                    const mockSlotForZero = { ...activeSlot, sp: { ...activeSlot.sp, [key]: 0 } };
                    const baseStatCalcAtZero = calculateLvl50StatForSlot(mockSlotForZero, key);
                    
                    totalRawStats += rawStat;
                    totalCalcStats += statAtZeroSp;

                    const baseWidth = Math.min((baseValue / METER_ABSOLUTE_MAX) * 100, 100);
                    const addedWidth = Math.min((currentSp / METER_ABSOLUTE_MAX) * 100, 100 - baseWidth);

                    const isRaises = activeSlot.nature.raises === key;
                    const isLowers = activeSlot.nature.lowers === key;

                    return (
                      <div key={key} className="flex items-center gap-1.5 sm:gap-3 bg-[#13141c] p-1.5 sm:p-2.5 rounded-xl border border-[#2e3040] shadow-sm">
                        <div className="w-14 sm:w-16 text-[10px] sm:text-xs font-black text-slate-200 tracking-wider flex items-center justify-between flex-shrink-0">
                          <div className="w-3 flex justify-start">
                            {isRaises ? <span className="text-rose-400 font-bold">↑</span> : isLowers ? <span className="text-sky-400 font-bold">↓</span> : ''}
                          </div>
                          <span className="text-right w-full">{meta.label}</span>
                        </div>

                        <div className="flex-grow flex items-center gap-2 sm:gap-4 min-w-[20px]">
                          <div className="flex flex-col justify-center w-full max-w-[200px] flex-shrink-0">
                            <div className="h-2 sm:h-3 bg-[#20222e] rounded-full flex overflow-hidden w-full shadow-inner">
                              <div className={`${meta.colorBase} h-full transition-all duration-300`} style={{ width: `${baseWidth}%` }}></div>
                              <div className={`${meta.colorAdded} h-full transition-all duration-300`} style={{ width: `${addedWidth}%` }}></div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-0.5 sm:gap-1.5 flex-shrink-0 bg-[#1a1b26] p-1 sm:p-1.5 rounded-lg border border-[#2e3040]">
                          <button
                            onClick={() => handleSpChange(key, 0)}
                            className="w-7 sm:w-9 h-6 sm:h-7 rounded bg-[#20222e] hover:bg-[#2a2d3d] flex items-center justify-center text-[7px] sm:text-[8px] font-black text-slate-300 transition-colors"
                          >
                            MIN
                          </button>
                          <button
                            onClick={() => handleSpChange(key, currentSp - 1)}
                            className="w-6 sm:w-7 h-6 sm:h-7 rounded bg-[#20222e] hover:bg-[#2a2d3d] flex items-center justify-center font-black text-slate-400 transition-colors text-xs"
                          >
                            —
                          </button>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={currentSp}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              handleSpChange(key, isNaN(val) ? 0 : val);
                            }}
                            className="w-8 sm:w-10 h-6 sm:h-7 text-center text-[10px] sm:text-xs font-black text-white font-mono bg-[#13141c] rounded border border-[#2e3040] shadow-inner outline-none focus:border-sky-500"
                          />
                          <button
                            onClick={() => handleSpChange(key, currentSp + 1)}
                            disabled={totalSpUsed >= SP_TOTAL_LIMIT || currentSp >= SP_STAT_LIMIT}
                            className="w-6 sm:w-7 h-6 sm:h-7 rounded bg-[#20222e] hover:bg-[#2a2d3d] flex items-center justify-center font-black text-emerald-400 disabled:opacity-30 transition-colors text-xs"
                          >
                            +
                          </button>
                          <button
                            onClick={() => handleSpChange(key, SP_STAT_LIMIT)}
                            disabled={totalSpUsed >= SP_TOTAL_LIMIT || currentSp >= SP_STAT_LIMIT}
                            className="w-7 sm:w-9 h-6 sm:h-7 rounded bg-[#20222e] hover:bg-[#2a2d3d] flex items-center justify-center text-[7px] sm:text-[8px] font-black text-slate-300 disabled:opacity-30 tracking-widest transition-colors ml-0.5"
                          >
                            MAX
                          </button>
                        </div>

                        <div className="w-16 sm:w-24 text-right flex flex-col justify-center flex-shrink-0 bg-[#1a1b26] p-1.5 sm:p-2.5 rounded-lg border border-[#2e3040]">
                          <div className="font-black text-xs sm:text-sm font-mono text-white flex justify-end gap-1">
                            <span className="text-slate-500 hidden sm:inline">{baseValue} / </span>
                            <span className={currentSp > 0 ? 'text-yellow-400' : 'text-white'}>{statAtZeroSp}</span>
                          </div>
                          <span className="text-[6px] sm:text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-0.5 hidden sm:block">Base / Lvl 50</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center mt-8 pt-6 border-t border-[#2e3040] gap-6">
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="32" cy="32" r="28" stroke="#2e3040" strokeWidth="6" fill="none" />
                        <circle 
                          cx="32" cy="32" r="28" 
                          stroke="#0ea5e9" strokeWidth="6" fill="none" 
                          strokeDasharray={175.93} 
                          strokeDashoffset={175.93 - (spLeft / 66) * 175.93} 
                          className="transition-all duration-500 ease-out" 
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute font-black text-white text-lg">{spLeft}</span>
                    </div>
                    <div>
                      <div className="text-lg font-black text-white">
                        {totalSpUsed} <span className="text-slate-500 font-bold text-sm uppercase">/ {SP_TOTAL_LIMIT} SP Used</span>
                      </div>
                      <div className="text-xs text-sky-400 font-bold uppercase tracking-widest mt-1">Remaining Points</div>
                    </div>
                  </div>
                  <div className="text-center sm:text-right">
                    <div className="text-2xl font-black text-white font-mono">{totalCalcStats}</div>
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Total Lvl 50 Stats</div>
                  </div>
                </div>

                {/* Editor Move Selector */}
                <div className="mt-10 pt-8 border-t border-[#2e3040]">
                  <h3 className="text-lg font-black text-white mb-6 uppercase tracking-wider">Configured Moves (Pick 4)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeSlot.selectedMoves.map((moveName, mIdx) => {
                      const moveDetails = moveName ? activeSlot.pokemon?.moves.find((m) => m.name === moveName) : null;

                      return (
                        <div
                          key={mIdx}
                          onClick={() => setActiveMoveSlotIndex(mIdx)}
                          className="bg-[#13141c] border border-[#2e3040] hover:border-sky-500 rounded-xl p-4 cursor-pointer transition-all flex items-center justify-between shadow-md group"
                        >
                          {moveDetails ? (
                            <div className="flex-1 pr-4">
                              <div className="flex items-center gap-3 mb-2">
                                <img src={getTypeIconUrl(moveDetails.type)} alt={moveDetails.type} title={moveDetails.type} className="w-5 h-5 drop-shadow-sm flex-shrink-0 object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                                <img src={getMoveCategoryUrl(moveDetails.category)} alt={moveDetails.category} title={moveDetails.category} className="h-4 drop-shadow-sm object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                              </div>
                              <span className="font-black text-xl text-white group-hover:text-sky-400 transition-colors">{moveDetails.name}</span>
                              
                              <div className="text-xs font-bold text-slate-500 font-mono flex gap-4 mt-2">
                                <span>PWR: {moveDetails.power}</span>
                                <span>ACC: {moveDetails.accuracy}</span>
                                <span>PP: {moveDetails.pp}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-4 py-3">
                              <div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center">
                                <span className="text-slate-500 font-bold text-xl">+</span>
                              </div>
                              <span className="text-sm text-slate-400 font-bold tracking-wider uppercase">
                                Configure Slot {mIdx + 1}
                              </span>
                            </div>
                          )}

                          {moveDetails && (
                            <button
                              onClick={(e) => handleClearMove(mIdx, e)}
                              className="w-10 h-10 rounded-lg bg-[#20222e] text-rose-500 hover:bg-rose-500 hover:text-white border border-[#383a4c] flex items-center justify-center transition-colors shadow-sm"
                              title="Remove Move"
                            >
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Defensive Coverage Sidebar */}
        <div className="w-full lg:w-[280px] xl:w-[350px] flex-shrink-0 sticky top-6 mt-6 lg:mt-0">
          <div className="bg-[#13141c] border border-[#2e3040] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="p-4 xl:p-5 border-b border-[#2e3040] bg-[#1a1b26]">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Team Defense</h3>
              
              <div className="mb-4 xl:mb-5">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  Shared Weaknesses
                  <span className="w-4 h-4 bg-[#20222e] rounded flex items-center justify-center text-[9px] text-slate-400 border border-[#2e3040]">≥2</span>
                </h4>
                <div className="flex flex-wrap gap-2 xl:gap-3 min-h-[28px]">
                  {sharedWeaknesses.length > 0 ? sharedWeaknesses.map(d => (
                    <div key={d.type} className="flex items-center gap-2 bg-rose-500/10 text-rose-400 px-2 xl:px-3 py-1.5 rounded border border-rose-500/30">
                      <img src={getTypeIconUrl(d.type)} alt={d.type} title={d.type} className="w-4 h-4 xl:w-5 xl:h-5 opacity-90 drop-shadow-sm object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      <span className="text-[11px] font-black">{d.weakCount}</span>
                    </div>
                  )) : <span className="text-xs text-slate-600 font-bold italic py-1">None</span>}
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  Unresisted
                  <span className="w-4 h-4 bg-[#20222e] rounded flex items-center justify-center text-[9px] text-slate-400 border border-[#2e3040]">0</span>
                </h4>
                <div className="flex flex-wrap gap-2 xl:gap-3 min-h-[24px]">
                  {unresisted.length > 0 ? unresisted.map(d => (
                    <img key={d.type} src={getTypeIconUrl(d.type)} alt={d.type} title={d.type} className="w-5 h-5 xl:w-6 xl:h-6 drop-shadow-sm object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  )) : <span className="text-xs text-slate-600 font-bold italic py-1">None</span>}
                </div>
              </div>
            </div>

            {/* Matrix Grid */}
            <div className="overflow-x-auto p-3 xl:p-4 custom-scrollbar bg-[#13141c]">
              {activeTeamMembers.length > 0 ? (
                <div className="min-w-max">
                  {/* Header Row */}
                  <div className="flex items-end justify-between mb-3 border-b border-[#2e3040] pb-2 px-1">
                    <div className="flex items-center">
                      <div className="w-6 xl:w-8 flex-shrink-0"></div>
                      {activeTeamMembers.map((slot, i) => (
                        <div key={i} className="w-7 xl:w-9 flex justify-center flex-shrink-0 relative group">
                          <img 
                            src={getPokemonImageUrl(slot.pokemon!.name)} 
                            alt={slot.pokemon!.name} 
                            className="w-6 h-6 xl:w-7 xl:h-7 object-contain drop-shadow-md z-10 hover:scale-125 transition-transform origin-bottom" 
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} 
                          />
                          <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-sky-500/20 to-transparent blur-sm rounded-full z-0"></div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 ml-2 xl:ml-4">
                      <div className="w-6 xl:w-8 flex justify-center text-rose-500 font-black text-sm flex-shrink-0">↓</div>
                      <div className="w-6 xl:w-8 flex justify-center text-emerald-400 font-black text-sm flex-shrink-0">↑</div>
                      <div className="w-6 xl:w-8 flex justify-center text-sky-400 font-black text-sm flex-shrink-0">=</div>
                    </div>
                  </div>

                  {/* Body Rows */}
                  {matrixData.map((d) => (
                    <div key={d.type} className="flex items-center justify-between py-1.5 border-b border-[#2e3040]/40 hover:bg-[#1a1b26] rounded-md px-1 -mx-1 transition-colors">
                      <div className="flex items-center">
                        <div className="w-6 xl:w-8 flex justify-center flex-shrink-0">
                          <img src={getTypeIconUrl(d.type)} alt={d.type} title={d.type} className="w-5 h-5 xl:w-6 xl:h-6 drop-shadow-sm object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                        
                        {d.row.map((r, i) => {
                          let colorClass = "text-slate-600 font-normal";
                          let bgClass = "bg-transparent";
                          if (r.val > 1) { colorClass = "text-rose-400 font-black"; bgClass = "bg-rose-500/10"; }
                          if (r.val < 1) { colorClass = "text-emerald-400 font-black"; bgClass = "bg-emerald-500/10"; }
                          
                          return (
                            <div key={i} className="w-7 xl:w-9 flex justify-center flex-shrink-0 p-0.5">
                              <span className={`text-[10px] w-full text-center rounded py-1 ${colorClass} ${bgClass}`}>{r.text}</span>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="flex items-center gap-1 ml-2 xl:ml-4">
                        <div className={`w-6 xl:w-8 flex justify-center text-[11px] font-black flex-shrink-0 rounded p-1 ${d.weakCount > 0 ? 'text-rose-400 bg-rose-500/10' : 'text-slate-600'}`}>{d.weakCount}</div>
                        <div className={`w-6 xl:w-8 flex justify-center text-[11px] font-black flex-shrink-0 rounded p-1 ${d.resistCount > 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-600'}`}>{d.resistCount}</div>
                        <div className={`w-6 xl:w-8 flex justify-center text-[11px] font-black flex-shrink-0 rounded p-1 ${d.net > 0 ? 'text-emerald-400 bg-emerald-500/10' : d.net < 0 ? 'text-rose-400 bg-rose-500/10' : 'text-slate-600'}`}>
                          {d.net > 0 ? `+${d.net}` : d.net}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-slate-500 text-sm font-bold border-2 border-dashed border-[#2e3040] rounded-xl flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#1a1b26] flex items-center justify-center border border-[#2e3040]">
                    <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                  </div>
                  Add Pokémon to build team coverage.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13141c] border border-[#2e3040] rounded-2xl max-w-md w-full p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
            <button 
              onClick={() => {
                setIsImportModalOpen(false);
                setImportInput('');
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#1a1b26] text-slate-400 hover:text-white hover:bg-rose-500 transition-colors flex items-center justify-center border border-[#2e3040]"
            >
              ✕
            </button>
            <h3 className="text-2xl font-black text-white mb-2 text-center">Import Team</h3>
            <p className="text-slate-400 text-sm text-center mb-6">Paste a Poképaste URL, or paste your raw Showdown text directly below.</p>
            
            <textarea
              placeholder="https://pokepast.es/... OR paste raw Showdown text here"
              value={importInput}
              onChange={(e) => setImportInput(e.target.value)}
              rows={6}
              className="w-full bg-[#1a1b26] border border-[#2e3040] rounded-xl p-4 text-white text-sm outline-none focus:border-sky-500 transition-colors shadow-inner mb-4 resize-none custom-scrollbar"
            />
            
            <button
              onClick={handleImport}
              disabled={isImporting || !importInput.trim()}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black py-4 rounded-xl transition-colors disabled:opacity-50"
            >
              {isImporting ? 'EXTRACTING DATA...' : 'IMPORT ROSTER'}
            </button>
          </div>
        </div>
      )}

      {/* Move Selection Modal Overlay */}
      {activeMoveSlotIndex !== null && activeSlot.pokemon && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1b26] border border-[#2e3040] rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-[#2e3040] bg-[#13141c] flex justify-between items-center shadow-md z-10">
              <div>
                <h3 className="text-xl font-black text-white">Select Move</h3>
                <p className="text-sm text-sky-400 font-bold mt-1">Slot {activeMoveSlotIndex + 1}</p>
              </div>
              <button
                onClick={() => {
                  setActiveMoveSlotIndex(null);
                  setMoveSearchQuery('');
                }}
                className="w-10 h-10 rounded-full bg-[#20222e] text-slate-400 hover:text-white hover:bg-rose-500 transition-colors flex items-center justify-center border border-[#383a4c]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div className="p-4 sm:p-6 border-b border-[#2e3040] bg-[#13141c]">
              <input
                type="text"
                placeholder="Filter learnset by move name, type, or category..."
                value={moveSearchQuery}
                onChange={(e) => setMoveSearchQuery(e.target.value)}
                className="w-full bg-[#1a1b26] border border-[#2e3040] rounded-xl p-4 text-white font-bold outline-none focus:border-sky-500 shadow-inner"
              />
            </div>

            <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4 custom-scrollbar">
              {filteredMoves.map((m) => (
                <div
                  key={m.name}
                  onClick={() => handleSelectMove(m.name)}
                  className="p-4 sm:p-5 bg-[#13141c] border border-[#2e3040] hover:border-sky-500 rounded-xl cursor-pointer transition-all hover:bg-[#1e1f2b] shadow-sm group flex flex-col gap-3"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img src={getTypeIconUrl(m.type)} alt={m.type} title={m.type} className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow-sm flex-shrink-0 object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      <img src={getMoveCategoryUrl(m.category)} alt={m.category} title={m.category} className="h-4 sm:h-5 drop-shadow-sm object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      <span className="font-black text-lg sm:text-xl text-white ml-2 group-hover:text-sky-400 transition-colors">{m.name}</span>
                    </div>
                    
                    <div className="text-xs font-bold text-slate-500 font-mono flex gap-4 sm:gap-6 bg-[#1a1b26] p-2.5 sm:p-3 rounded-lg border border-[#2e3040] shadow-sm w-full sm:w-auto justify-between sm:justify-start">
                      <span className="flex flex-col items-center"><span className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">PWR</span><span className="text-slate-200 text-sm sm:text-base font-black">{m.power}</span></span>
                      <span className="flex flex-col items-center"><span className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">ACC</span><span className="text-slate-200 text-sm sm:text-base font-black">{m.accuracy}</span></span>
                      <span className="flex flex-col items-center"><span className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">PP</span><span className="text-slate-200 text-sm sm:text-base font-black">{m.pp}</span></span>
                    </div>
                  </div>
                  {m.description && (
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-medium pl-3 border-l-2 border-slate-700 ml-1">{m.description}</p>
                  )}
                </div>
              ))}
              {filteredMoves.length === 0 && (
                <div className="text-center text-slate-500 py-10 font-bold">No matching moves found in learnset.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}