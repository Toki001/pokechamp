import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import type { TeamSlot, BaseStats } from '../types';
import { getPokemonImageUrl, getItemImageUrl, getTypeIconUrl, calculateLvl50StatForSlot } from '../utils/helpers';
import { STAT_METADATA } from '../utils/constants';
import TeamDiscussion from './TeamDiscussion';

interface DatabaseTeam {
  short_id: string;
  team_name: string;
  created_at: string;
  roster: TeamSlot[];
  upvotes: number;
  comments?: { id: string }[];
}

type SortOption = 'date-desc' | 'date-asc' | 'hearts-desc' | 'comments-desc';

export default function TeamShowcase() {
  const [teams, setTeams] = useState<DatabaseTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<DatabaseTeam | null>(null);
  const [votedTeams, setVotedTeams] = useState<Record<string, boolean>>({});

  // Filtering and Sorting State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');

  useEffect(() => {
    const fetchRecentTeams = async () => {
      setIsLoading(true);
      // Fetch teams and their associated comment IDs to calculate total comments
      const { data, error } = await supabase
        .from('teams')
        .select('*, comments(id)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error fetching teams:", error);
      } else if (data) {
        setTeams(data as DatabaseTeam[]);
      }
      setIsLoading(false);
    };

    fetchRecentTeams();
  }, []);

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const handleHeart = async (id: string) => {
    const teamIndex = teams.findIndex(t => t.short_id === id);
    if (teamIndex === -1) return;

    const team = teams[teamIndex];
    const isHearted = votedTeams[id];
    const newUp = isHearted ? Math.max(0, (team.upvotes || 0) - 1) : (team.upvotes || 0) + 1;

    // Optimistic UI Update
    setTeams(prev => prev.map(t => t.short_id === id ? { ...t, upvotes: newUp } : t));
    if (selectedTeam?.short_id === id) {
      setSelectedTeam({ ...selectedTeam, upvotes: newUp });
    }
    
    setVotedTeams(prev => {
      const next = { ...prev };
      if (isHearted) delete next[id];
      else next[id] = true;
      return next;
    });

    // Persist to Supabase database
    const { error } = await supabase
      .from('teams')
      .update({ upvotes: newUp })
      .eq('short_id', id);

    if (error) {
      console.error("Failed to save heart to database:", error);
    }
  };

  // Dynamically filter and sort the teams based on user selection
  const displayedTeams = useMemo(() => {
    let filtered = [...teams];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(team => 
        (team.team_name && team.team_name.toLowerCase().includes(query)) ||
        team.roster.some(slot => slot.pokemon?.name.toLowerCase().includes(query))
      );
    }

    filtered.sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'date-asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'hearts-desc') return (b.upvotes || 0) - (a.upvotes || 0);
      if (sortBy === 'comments-desc') return (b.comments?.length || 0) - (a.comments?.length || 0);
      return 0;
    });

    return filtered;
  }, [teams, searchQuery, sortBy]);

  if (isLoading) {
    return (
      <div className="w-full max-w-[1400px] mx-auto text-center py-32 flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#2e3040] border-t-sky-500 rounded-full animate-spin"></div>
        <h2 className="text-xl font-bold text-slate-400 animate-pulse">Loading Team Showcase...</h2>
      </div>
    );
  }

  const METER_ABSOLUTE_MAX = 255;

  return (
    <div className="w-full max-w-[1400px] mx-auto text-slate-200 font-sans pb-20">
      <div className="mb-8 text-center">
        <h2 className="text-4xl font-black text-white mb-4">Team Showcase</h2>
        <p className="text-slate-400">Discover, analyze, and discuss the latest Pokechamp teams built by the community.</p>
      </div>

      {/* Filtering and Sorting Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 bg-[#13141c] p-4 rounded-2xl border border-[#2e3040] shadow-lg">
        <div className="relative w-full sm:w-80 lg:w-[400px]">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input 
            type="text" 
            placeholder="Search by Team Name or Pokémon..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1a1b26] border border-[#2e3040] rounded-xl p-3 pl-10 text-white text-sm outline-none focus:border-sky-500 transition-colors shadow-inner"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-sm font-bold text-slate-500 uppercase tracking-widest hidden sm:block">Sort By:</span>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="w-full sm:w-48 bg-[#1a1b26] border border-[#2e3040] rounded-xl p-3 text-white text-sm font-bold outline-none focus:border-sky-500 transition-colors shadow-inner cursor-pointer"
          >
            <option value="date-desc">Newest First</option>
            <option value="hearts-desc">Most Hearts</option>
            <option value="comments-desc">Most Discussed</option>
            <option value="date-asc">Oldest First</option>
          </select>
        </div>
      </div>

      {displayedTeams.length === 0 ? (
        <div className="text-center py-20 bg-[#13141c] border border-[#2e3040] rounded-xl text-slate-500">
          {teams.length === 0 ? "No teams have been shared yet. Be the first to build and save a team!" : "No teams match your search filter."}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {displayedTeams.map((team) => {
            const activePokemon = team.roster.filter(slot => slot.pokemon !== null);
            if (activePokemon.length === 0) return null;

            return (
              <div 
                key={team.short_id} 
                onClick={() => setSelectedTeam(team)}
                className="bg-[#13141c] border border-[#2e3040] rounded-xl p-4 sm:p-6 hover:border-sky-500 hover:shadow-[0_0_20px_rgba(14,165,233,0.1)] transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex justify-between items-start sm:items-center mb-6 border-b border-[#2e3040]/50 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-sky-400 transition-colors truncate max-w-[200px] sm:max-w-[250px]">
                      {team.team_name}
                    </h3>
                    <span className="text-xs sm:text-sm text-slate-500 font-medium whitespace-nowrap">{formatDate(team.created_at)}</span>
                  </div>
                  
                  {/* Hearts and Comments Display */}
                  <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm font-bold text-slate-500">
                    <span className="flex items-center gap-1.5 text-rose-400">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                      {team.upvotes || 0}
                    </span>
                    <span className="flex items-center gap-1.5 text-sky-400">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                      {team.comments?.length || 0}
                    </span>
                    <span className="whitespace-nowrap hidden sm:inline border-l border-[#2e3040] pl-3 ml-1">ID: {team.short_id}</span>
                  </div>
                </div>

                {/* Horizontal Roster Strip - Centered perfectly */}
                <div className="flex items-start justify-center gap-2 sm:gap-4 xl:gap-6 w-full">
                  {activePokemon.map((slot, idx) => (
                    <div key={idx} className="flex flex-col items-center flex-1 sm:flex-none sm:w-16 xl:w-20 text-center gap-2">
                      <div className="relative w-12 h-12 sm:w-14 sm:h-14 xl:w-16 xl:h-16 flex items-center justify-center bg-[#1a1b26] rounded-full border border-[#2e3040] group-hover:border-slate-500 transition-colors flex-shrink-0">
                        <img 
                          src={getPokemonImageUrl(slot.pokemon!.name)} 
                          alt={slot.pokemon!.name} 
                          className="w-8 h-8 sm:w-10 sm:h-10 xl:w-12 xl:h-12 object-contain drop-shadow-md"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                        {slot.item && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 xl:w-6 xl:h-6 bg-[#20222e] rounded-full border border-[#2e3040] flex items-center justify-center shadow-lg">
                            <img src={getItemImageUrl(slot.item)} alt="Item" className="w-2.5 h-2.5 sm:w-3 sm:h-3 xl:w-4 xl:h-4 object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col w-full px-0.5">
                        <span className="text-[10px] sm:text-[11px] xl:text-xs font-bold text-white truncate leading-tight w-full">{slot.pokemon!.name}</span>
                        <span className="text-[8px] sm:text-[9px] xl:text-[10px] font-medium text-slate-500 truncate w-full">{slot.item || 'No Item'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Modal View */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0b0c10] border border-[#2e3040] rounded-2xl max-w-[1200px] w-full my-auto flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden max-h-[95vh]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-[#2e3040] bg-[#13141c] flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4 sticky top-0 z-20 shadow-md">
              <div className="flex flex-col gap-1">
                <h3 className="text-2xl font-black text-white">{selectedTeam.team_name}</h3>
                <div className="flex gap-3 text-sm text-slate-400">
                  <span>ID: <span className="text-sky-400 font-mono">{selectedTeam.short_id}</span></span>
                  <span>•</span>
                  <span>{formatDate(selectedTeam.created_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                
                {/* Heart Control */}
                <button 
                  onClick={() => handleHeart(selectedTeam.short_id)}
                  className={`flex items-center gap-2 px-5 py-2 font-black transition-colors rounded-xl border shadow-inner ${votedTeams[selectedTeam.short_id] ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-[#1a1b26] text-slate-400 border-[#2e3040] hover:bg-[#20222e] hover:text-rose-400'}`}
                >
                  <svg className="w-5 h-5" fill={votedTeams[selectedTeam.short_id] ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                  {selectedTeam.upvotes || 0}
                </button>

                <button
                  onClick={() => setSelectedTeam(null)}
                  className="w-10 h-10 rounded-full bg-[#20222e] text-slate-400 hover:text-white hover:bg-rose-500 transition-colors flex items-center justify-center border border-[#383a4c]"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-4 sm:p-6 custom-scrollbar space-y-6">
              
              {/* Detailed Pokemon Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {selectedTeam.roster.filter(s => s.pokemon).map((slot, idx) => (
                  <div key={idx} className="bg-[#1a1b26] border border-[#2e3040] rounded-xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden">
                    
                    <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                      {/* Left Info */}
                      <div className="flex-1 flex flex-col justify-start">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-black text-white text-lg tracking-tight">{slot.pokemon!.name}</span>
                          <div className="flex gap-1">
                            {slot.pokemon!.types.map(t => (
                              <img key={t} src={getTypeIconUrl(t)} alt={t} title={t} className="w-4 h-4 drop-shadow-sm object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                            ))}
                          </div>
                        </div>

                        <div className="text-sm font-medium text-slate-400 mb-1 border-b border-[#2e3040]/50 pb-1 max-w-[80%] truncate">
                          {slot.selectedAbility || 'No Ability'}
                        </div>

                        <div className="text-xs font-bold text-slate-400 mb-3">
                          {slot.nature.name}
                          {slot.nature.raises && <span className={`ml-1 text-${STAT_METADATA[slot.nature.raises].colorAdded.replace('bg-', '')}`}>+{STAT_METADATA[slot.nature.raises].label}</span>}
                          {slot.nature.lowers && <span className={`ml-1 text-${STAT_METADATA[slot.nature.lowers].colorBase.replace('bg-', '')}`}>-{STAT_METADATA[slot.nature.lowers].label}</span>}
                        </div>

                        <div className="flex items-center gap-2 mt-auto">
                          {slot.item ? (
                            <>
                              <img src={getItemImageUrl(slot.item)} className="w-5 h-5 object-contain" alt={slot.item} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                              <span className="text-sm font-bold text-yellow-400 truncate max-w-[100px]">{slot.item}</span>
                            </>
                          ) : (
                            <span className="text-sm font-bold text-slate-500 italic">No Item</span>
                          )}
                        </div>
                      </div>

                      {/* Middle Sprite */}
                      <div className="w-full sm:w-24 h-24 flex items-center justify-center flex-shrink-0">
                        <img 
                          src={getPokemonImageUrl(slot.pokemon!.name)} 
                          className="w-20 h-20 object-contain drop-shadow-xl" 
                          alt={slot.pokemon!.name} 
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} 
                        />
                      </div>

                      {/* Right Moves */}
                      <div className="w-full sm:w-[140px] flex flex-col gap-1.5 flex-shrink-0 justify-center sm:pl-2 border-t sm:border-t-0 sm:border-l border-[#2e3040] pt-3 sm:pt-0 mt-2 sm:mt-0">
                        {slot.selectedMoves.map((m, i) => {
                          const moveObj = m && slot.pokemon && Array.isArray(slot.pokemon.moves) ? slot.pokemon.moves.find(x => x.name === m) : null;
                          return (
                            <div key={i} className="flex items-center gap-2">
                              {moveObj ? (
                                <>
                                  <img src={getTypeIconUrl(moveObj.type)} className="w-3.5 h-3.5 drop-shadow-sm object-contain flex-shrink-0" alt={moveObj.type} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                                  <span className="text-xs font-bold text-white truncate">{m}</span>
                                </>
                              ) : (
                                <span className="text-xs font-semibold text-slate-600 italic">-</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bottom Stat Investments */}
                    <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-[#2e3040]/50 justify-center">
                      {slot.sp && Object.entries(slot.sp).filter(([_, val]) => val > 0).length > 0 ? (
                        Object.entries(slot.sp).map(([statKey, val]) => {
                          if (val === 0) return null;
                          const key = statKey as keyof BaseStats;
                          const meta = STAT_METADATA[key];
                          if (!meta) return null;
                          return (
                            <div key={key} className="flex items-center gap-1.5 border border-[#2e3040] bg-[#13141c] px-2.5 py-1 rounded-md shadow-inner">
                              <span className={`text-[10px] font-black ${meta.colorBase.replace('bg-', 'text-')}`}>{meta.label}</span>
                              <span className="text-[11px] font-mono text-white font-bold">+{val}</span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-xs text-slate-600 font-bold italic py-1">No SP Investments</div>
                      )}
                    </div>

                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-2">
                <Link 
                  to={`/team/${selectedTeam.short_id}`}
                  className="flex-1 bg-sky-500 hover:bg-sky-400 text-white font-black py-3.5 rounded-xl shadow-lg transition-colors text-center text-sm tracking-wider flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                  OPEN IN TEAM BUILDER
                </Link>
              </div>

              {/* Discussion Section injected into Modal */}
              <TeamDiscussion teamId={selectedTeam.short_id} />
              
            </div>
          </div>
        </div>
      )}
    </div>
  );
}