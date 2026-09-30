import { useState, useEffect } from 'react';
import rawMetaStats from '../data/metaroll_stats.json';
import { TYPE_COLORS } from '../utils/constants';
import { getPokemonImageUrl, getTypeIconUrl } from '../utils/helpers';

// --- Local Analytics Type Definitions ---
interface UsageItem { name: string; usage: string; type?: string; }
interface MatchupItem { rank: string; name: string; }
interface StatSpread { HP: string; Atk: string; Def: string; SpA: string; SpD: string; Spe: string; }
interface StatPointData { spread: StatSpread; usage: string; }

interface MetaPokemon {
  rank: string;
  pokemon: string;
  types: string[];
  moves: UsageItem[];
  items: UsageItem[];
  abilities: UsageItem[];
  natures: UsageItem[];
  stat_points: StatPointData[];
  teammates: MatchupItem[];
  beats: MatchupItem[];
  loses_to: MatchupItem[];
  won_with: UsageItem[];
  beaten_by: UsageItem[];
}

const getPokemonTypes = (name: string, metaStats: MetaPokemon[]) => {
  const mon = metaStats.find(m => m.pokemon === name);
  return mon ? mon.types : [];
};

const TypeBadge = ({ type, large = false }: { type: string, large?: boolean }) => (
  <div className="flex items-center gap-1.5 flex-shrink-0">
    <img 
      src={getTypeIconUrl(type)} 
      alt={type} 
      className={`${large ? 'w-6 h-6' : 'w-4 h-4'} object-contain drop-shadow-sm flex-shrink-0`}
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
    />
    <span className={`${large ? 'px-2.5 py-1 text-xs' : 'px-1.5 py-0.5 text-[9px]'} font-bold tracking-wider uppercase leading-none rounded text-white shadow-sm flex-shrink-0 ${TYPE_COLORS[type] || 'bg-slate-700'}`}>
      {type}
    </span>
  </div>
);

export default function Analytics() {
  const [metaStats, setMetaStats] = useState<MetaPokemon[]>([]);
  const [activeMon, setActiveMon] = useState<MetaPokemon | null>(null);

  useEffect(() => {
    if (rawMetaStats && Array.isArray(rawMetaStats)) {
      const parsedStats = rawMetaStats as MetaPokemon[];
      setMetaStats(parsedStats);
      if (parsedStats.length > 0) setActiveMon(parsedStats[0]);
    }
  }, []);

  const MiniSprite = ({ name }: { name: string }) => (
    <img 
      src={getPokemonImageUrl(name)} 
      alt={name} 
      className="w-10 h-10 object-contain drop-shadow-md flex-shrink-0"
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
    />
  );

  const UsageBar = ({ label, usage, type, rank }: { label: string; usage: string; type?: string; rank?: number }) => {
    const percentage = parseFloat(usage);
    return (
      <div className="flex items-center gap-3 text-sm py-2 border-b border-[#2e3040]/50 last:border-0 hover:bg-[#20222e]/40 transition-colors px-2 -mx-2">
        {rank !== undefined && (
          <span className="text-slate-500 font-black font-mono w-5 text-right flex-shrink-0">{rank}.</span>
        )}
        {type && (
          <div className="w-[100px] flex-shrink-0 flex">
            <TypeBadge type={type} />
          </div>
        )}
        <span className="text-slate-200 font-bold truncate flex-grow">{label}</span>
        <div className="hidden sm:block w-20 md:w-28 h-1.5 bg-[#13141c] border border-[#2e3040] rounded-full overflow-hidden flex-shrink-0 shadow-inner">
          <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${percentage}%` }}></div>
        </div>
        <span className="text-emerald-400 font-mono text-xs font-bold w-12 text-right flex-shrink-0">{usage}</span>
      </div>
    );
  };

  const MatchupList = ({ title, data, titleColor }: { title: string; data: MatchupItem[]; titleColor: string }) => (
    <div className="bg-[#1a1b26] border border-[#2e3040] rounded-xl p-4">
      <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 border-b border-[#2e3040] pb-2 ${titleColor}`}>{title}</h4>
      <div className="flex flex-col gap-1.5">
        {data.map((item, idx) => {
          const types = getPokemonTypes(item.name, metaStats);
          return (
            <div 
              key={idx} 
              className="flex items-center gap-3 bg-[#13141c] border border-[#2e3040] p-1.5 rounded-lg hover:border-sky-500 transition-colors cursor-pointer"
              onClick={() => {
                const targetMon = metaStats.find(m => m.pokemon === item.name);
                if (targetMon) setActiveMon(targetMon);
              }}
            >
              <span className="text-[10px] font-black text-slate-500 w-4 text-center">{item.rank}</span>
              <MiniSprite name={item.name} />
              <div className="flex flex-col flex-1 truncate">
                <span className="text-sm font-bold text-slate-200 truncate">{item.name}</span>
                {types.length > 0 && (
                  <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1">
                    {types.map(t => <TypeBadge key={t} type={t} />)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (metaStats.length === 0 || !activeMon) {
    return (
      <div className="w-full max-w-[1400px] mx-auto text-center py-32 flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-slate-700 border-t-sky-500 rounded-full animate-spin"></div>
        <h2 className="text-xl font-bold text-slate-300 animate-pulse">Processing Meta Data...</h2>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto text-slate-200 font-sans pb-6 flex gap-6 h-[calc(100vh-120px)]">
      
      {/* LEFT SIDEBAR: Thinner Master Leaderboard List to remove dead space */}
      <div className="w-[320px] bg-[#13141c] border border-[#2e3040] rounded-xl shadow-2xl flex flex-col overflow-hidden flex-shrink-0">
        <div className="p-4 border-b border-[#2e3040] bg-[#1a1b26] z-10 shadow-md">
          <h2 className="text-xl font-black text-white">Championship Meta</h2>
          <p className="text-xs text-slate-400 mt-1">Live competitive usage statistics</p>
        </div>
        
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {metaStats.map((mon) => (
            <button
              key={mon.pokemon}
              onClick={() => setActiveMon(mon)}
              onMouseEnter={() => setActiveMon(mon)}
              className={`w-full flex items-center justify-between p-3 border-b border-[#2e3040] transition-all text-left ${
                activeMon.pokemon === mon.pokemon 
                  ? 'bg-sky-500/10 border-l-4 border-l-sky-500' 
                  : 'hover:bg-[#1a1b26] border-l-4 border-l-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`text-sm font-black w-6 text-center ${activeMon.pokemon === mon.pokemon ? 'text-sky-400' : 'text-slate-500'}`}>
                  {mon.rank}
                </span>
                <img 
                  src={getPokemonImageUrl(mon.pokemon)} 
                  alt={mon.pokemon} 
                  className="w-10 h-10 object-contain drop-shadow-lg"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-white text-sm">{mon.pokemon}</span>
                  <div className="flex gap-2">
                    {mon.types.map(t => <TypeBadge key={t} type={t} />)}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL: min-w-0 and overflow-x-hidden strictly prevent horizontal scrolling */}
      <div className="flex-1 min-w-0 bg-[#13141c] border border-[#2e3040] rounded-xl shadow-2xl overflow-y-auto overflow-x-hidden custom-scrollbar relative">
        
        {/* Detail Header */}
        <div className="sticky top-0 z-20 bg-[#13141c]/95 backdrop-blur border-b border-[#2e3040] p-6 flex items-center gap-6 shadow-md">
          <div className="relative flex-shrink-0">
            <div className="absolute -inset-4 bg-sky-500/20 rounded-full blur-xl z-0"></div>
            <img 
              src={getPokemonImageUrl(activeMon.pokemon)} 
              alt={activeMon.pokemon} 
              className="w-24 h-24 object-contain relative z-10 drop-shadow-2xl"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          <div>
            <div className="flex items-center gap-4 mb-2">
              <span className="bg-sky-500 text-slate-950 font-black text-sm px-3 py-1 rounded-full">
                Rank {activeMon.rank}
              </span>
              <h1 className="text-4xl font-black text-white tracking-tight">{activeMon.pokemon}</h1>
            </div>
            <div className="flex gap-4 mt-3">
              {activeMon.types.map(t => <TypeBadge key={t} type={t} large={true} />)}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-[#1a1b26] border border-[#2e3040] rounded-xl p-5">
              <h3 className="text-lg font-bold text-white mb-3">Most Common Moves</h3>
              <div className="flex flex-col gap-0.5">
                {activeMon.moves.map((move, i) => (
                  <UsageBar key={i} rank={i + 1} label={move.name} usage={move.usage} type={move.type} />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="bg-[#1a1b26] border border-[#2e3040] rounded-xl p-5">
                <h3 className="text-sm font-bold text-white mb-2 border-b border-[#2e3040] pb-2">Top Items</h3>
                <div className="flex flex-col">
                  {activeMon.items.slice(0, 5).map((item, i) => <UsageBar key={i} rank={i + 1} label={item.name} usage={item.usage} />)}
                </div>
              </div>
              <div className="bg-[#1a1b26] border border-[#2e3040] rounded-xl p-5 flex-1">
                <h3 className="text-sm font-bold text-white mb-2 border-b border-[#2e3040] pb-2">Top Abilities</h3>
                <div className="flex flex-col">
                  {activeMon.abilities.map((ability, i) => <UsageBar key={i} rank={i + 1} label={ability.name} usage={ability.usage} />)}
                </div>
                <h3 className="text-sm font-bold text-white mt-5 mb-2 border-b border-[#2e3040] pb-2">Top Natures</h3>
                <div className="flex flex-col">
                  {activeMon.natures.slice(0, 4).map((nature, i) => <UsageBar key={i} rank={i + 1} label={nature.name} usage={nature.usage} />)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#1a1b26] border border-[#2e3040] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#2e3040]">
              <h3 className="text-base font-bold text-white">Popular Stat Point (SP) Spreads</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-[#13141c] text-slate-500 text-[11px] uppercase tracking-widest font-black">
                    <th className="p-3 border-r border-[#2e3040]">Usage %</th>
                    <th className="p-3 text-emerald-400 text-center">HP</th>
                    <th className="p-3 text-rose-500 text-center">Atk</th>
                    <th className="p-3 text-yellow-400 text-center">Def</th>
                    <th className="p-3 text-sky-500 text-center">SpA</th>
                    <th className="p-3 text-purple-400 text-center">SpD</th>
                    <th className="p-3 text-fuchsia-500 text-center">Spe</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-sm text-slate-200 divide-y divide-[#2e3040]">
                  {activeMon.stat_points.slice(0, 8).map((sp, idx) => (
                    <tr key={idx} className="hover:bg-[#20222e] transition-colors text-center">
                      <td className="p-3 border-r border-[#2e3040] text-emerald-400 text-left font-black">{sp.usage}</td>
                      <td className={`p-3 ${sp.spread.HP !== '0' ? 'text-emerald-400 font-black drop-shadow-md' : 'text-slate-600'}`}>{sp.spread.HP}</td>
                      <td className={`p-3 ${sp.spread.Atk !== '0' ? 'text-rose-500 font-black drop-shadow-md' : 'text-slate-600'}`}>{sp.spread.Atk}</td>
                      <td className={`p-3 ${sp.spread.Def !== '0' ? 'text-yellow-400 font-black drop-shadow-md' : 'text-slate-600'}`}>{sp.spread.Def}</td>
                      <td className={`p-3 ${sp.spread.SpA !== '0' ? 'text-sky-500 font-black drop-shadow-md' : 'text-slate-600'}`}>{sp.spread.SpA}</td>
                      <td className={`p-3 ${sp.spread.SpD !== '0' ? 'text-purple-400 font-black drop-shadow-md' : 'text-slate-600'}`}>{sp.spread.SpD}</td>
                      <td className={`p-3 ${sp.spread.Spe !== '0' ? 'text-fuchsia-500 font-black drop-shadow-md' : 'text-slate-600'}`}>{sp.spread.Spe}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <MatchupList title="Common Teammates" data={activeMon.teammates.slice(0, 6)} titleColor="text-sky-400" />
            <MatchupList title="Consistently Beats" data={activeMon.beats.slice(0, 6)} titleColor="text-emerald-400" />
            <MatchupList title="Often Loses To" data={activeMon.loses_to.slice(0, 6)} titleColor="text-rose-500" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-[#1a1b26] border border-[#2e3040] rounded-xl p-5">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 border-b border-[#2e3040] pb-2">Winning Blows (Moves that secure KOs)</h3>
              <div className="flex flex-col gap-0.5">
                {activeMon.won_with.map((move, i) => (
                  <UsageBar key={i} rank={i + 1} label={move.name} usage={move.usage} type={move.type} />
                ))}
              </div>
            </div>
            
            <div className="bg-[#1a1b26] border border-[#2e3040] rounded-xl p-5">
              <h3 className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-3 border-b border-[#2e3040] pb-2">Fatal Flaws (Moves that cause KOs against it)</h3>
              <div className="flex flex-col gap-0.5">
                {activeMon.beaten_by.map((move, i) => (
                  <UsageBar key={i} rank={i + 1} label={move.name} usage={move.usage} type={move.type} />
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}