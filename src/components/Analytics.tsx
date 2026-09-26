import { useState, useEffect } from 'react';
import realMetaData from '../data/live_meta.json';

interface MetaPokemon {
  rank: number;
  name: string;
  usage: number;
  items: string[];
  teammates: string[];
}

export default function Analytics() {
  const [metaStats, setMetaStats] = useState<MetaPokemon[]>([]);

  useEffect(() => {
    // The Python script formatted this perfectly, so we can inject it directly into state
    if (realMetaData && Array.isArray(realMetaData)) {
      setMetaStats(realMetaData as MetaPokemon[]);
    }
  }, []);

  return (
    <div className="w-full max-w-[1200px] mx-auto text-slate-200 font-sans pb-20">
      <div className="mb-10 text-center">
        <h2 className="text-4xl font-black text-white mb-4">Meta Analytics</h2>
        <p className="text-slate-400">Live competitive usage statistics aggregated from actual tournament data.</p>
      </div>

      <div className="bg-[#13141c] border border-[#2e3040] rounded-xl shadow-2xl overflow-hidden">
        {metaStats.length === 0 ? (
          <div className="text-center py-20 text-slate-500 font-bold">
            Data pipeline missing. Please ensure live_meta.json exists in your data folder.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1a1b26] border-b border-[#2e3040] text-slate-500 uppercase tracking-widest text-xs">
                  <th className="p-5 font-bold whitespace-nowrap">Rank</th>
                  <th className="p-5 font-bold">Pokémon</th>
                  <th className="p-5 font-bold min-w-[200px]">Usage Rate</th>
                  <th className="p-5 font-bold">Common Items</th>
                  <th className="p-5 font-bold">Top Teammates</th>
                </tr>
              </thead>
              <tbody>
                {metaStats.map((stat) => {
                  // Normalize usage for the progress bar (treating 0 as unknown/baseline)
                  const displayUsage = stat.usage > 0 ? `${stat.usage.toFixed(1)}%` : 'N/A';
                  const barWidth = stat.usage > 0 ? Math.min(stat.usage, 100) : 0;

                  return (
                    <tr key={stat.name} className="border-b border-[#2e3040]/50 hover:bg-[#1a1b26] transition-colors">
                      <td className="p-5 font-black text-sky-500">#{stat.rank}</td>
                      <td className="p-5 font-bold text-white text-lg">{stat.name}</td>
                      <td className="p-5">
                        {stat.usage > 0 ? (
                          <div className="flex items-center gap-3">
                            <div className="w-full bg-[#13141c] border border-[#2e3040] rounded-full h-2.5 max-w-[120px] overflow-hidden">
                              <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${barWidth}%` }}></div>
                            </div>
                            <span className="text-sm font-mono font-bold text-emerald-400">{displayUsage}</span>
                          </div>
                        ) : (
                          <span className="text-sm font-mono text-slate-500 italic">Data masking active</span>
                        )}
                      </td>
                      <td className="p-5 text-sm text-slate-400">
                        <div className="flex flex-wrap gap-1.5">
                          {stat.items.map((item, i) => (
                            <span key={i} className="bg-[#20222e] border border-[#323445] px-2 py-1 rounded text-xs">
                              {item}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-5 text-sm text-slate-400">
                        <div className="flex flex-wrap gap-1.5">
                          {stat.teammates.map((mate, i) => (
                            <span key={i} className="bg-sky-500/10 border border-sky-500/20 text-sky-300 px-2 py-1 rounded text-xs">
                              {mate}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}