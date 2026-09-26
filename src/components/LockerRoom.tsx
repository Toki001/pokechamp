import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

// Defining the expected structure from our JSONB roster column
interface BaseStats { hp: number; atk: number; def: number; spa: number; spd: number; spe: number; }
interface Pokemon { id: number; name: string; types: string[]; baseStats: BaseStats; }
interface TeamSlot { pokemon: Pokemon | null; sp: BaseStats; }

interface DatabaseTeam {
  short_id: string;
  team_name: string;
  created_at: string;
  roster: TeamSlot[];
}

export default function LockerRoom() {
  const [teams, setTeams] = useState<DatabaseTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecentTeams = async () => {
      setIsLoading(true);
      // Fetch the 21 most recently created teams
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(21);

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
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-[1200px] mx-auto text-center py-32 flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#2e3040] border-t-sky-500 rounded-full animate-spin"></div>
        <h2 className="text-xl font-bold text-slate-400 animate-pulse">Loading Community Teams...</h2>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto text-slate-200 font-sans pb-20">
      <div className="mb-10 text-center">
        <h2 className="text-4xl font-black text-white mb-4">Global Locker Room</h2>
        <p className="text-slate-400">Discover, analyze, and fork the latest Pokechamp teams built by the community.</p>
      </div>

      {teams.length === 0 ? (
        <div className="text-center py-20 bg-[#13141c] border border-[#2e3040] rounded-xl text-slate-500">
          No teams have been shared yet. Be the first to build and save a team!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => {
            // Count how many actual Pokemon are in this specific team's roster
            const activePokemon = team.roster.filter(slot => slot.pokemon !== null);
            
            return (
              <Link 
                key={team.short_id} 
                to={`/team/${team.short_id}`}
                className="bg-[#13141c] border border-[#2e3040] rounded-xl p-6 hover:border-sky-500 hover:shadow-[0_0_20px_rgba(14,165,233,0.15)] transition-all group block"
              >
                <div className="flex justify-between items-start mb-6 border-b border-[#2e3040] pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white group-hover:text-sky-400 transition-colors">
                      {team.team_name}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-1">{formatDate(team.created_at)}</p>
                  </div>
                  <span className="bg-[#1a1b26] border border-[#2e3040] text-xs font-bold px-3 py-1 rounded-full text-slate-400">
                    ID: {team.short_id}
                  </span>
                </div>

                {/* Mini Roster Display */}
                <div className="grid grid-cols-2 gap-3">
                  {activePokemon.length > 0 ? (
                    activePokemon.map((slot, idx) => (
                      <div key={idx} className="bg-[#1a1b26] border border-[#2e3040] p-2 rounded-lg flex flex-col items-center justify-center text-center">
                        <span className="text-sm font-bold text-slate-200 truncate w-full">{slot.pokemon!.name}</span>
                        <span className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">
                          {slot.pokemon!.types.join('/')}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-center text-sm text-slate-600 py-4 italic">
                      Empty Roster
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}