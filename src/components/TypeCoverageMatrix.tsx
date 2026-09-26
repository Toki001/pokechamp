import { TYPES, calculateDefensiveMultiplier } from '../utils/typeChart';

interface TypeCoverageMatrixProps {
  types: string[];
}

export default function TypeCoverageMatrix({ types }: TypeCoverageMatrixProps) {
  // Calculate multipliers for all 18 attacking types against this specific Pokemon
  const matchups = TYPES.map(attackingType => ({
    type: attackingType,
    multiplier: calculateDefensiveMultiplier(types, attackingType)
  }));

  const weaknesses = matchups.filter(m => m.multiplier > 1);
  const resistances = matchups.filter(m => m.multiplier < 1 && m.multiplier > 0);
  const immunities = matchups.filter(m => m.multiplier === 0);

  const Badge = ({ type, multiplier }: { type: string, multiplier: number }) => {
    let bgColor = "bg-slate-700";
    if (multiplier > 1) bgColor = "bg-rose-500/20 text-rose-400 border-rose-500/50";
    if (multiplier < 1) bgColor = "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
    if (multiplier === 0) bgColor = "bg-slate-800 text-slate-500 border-slate-700";

    return (
      <div className={`px-2 py-1 rounded text-xs font-bold border ${bgColor} flex justify-between items-center w-full`}>
        <span className="uppercase tracking-wider">{type}</span>
        <span>{multiplier}x</span>
      </div>
    );
  };

  if (types.length === 0) return null;

  return (
    <div className="w-full bg-[#1a1b26] border border-[#2e3040] rounded-xl p-6 mt-6">
      <h3 className="text-lg font-bold text-white mb-4">Defensive Coverage</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h4 className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-3 border-b border-[#2e3040] pb-2">Weaknesses</h4>
          <div className="flex flex-col gap-2">
            {weaknesses.length > 0 ? weaknesses.map(w => <Badge key={w.type} {...w} />) : <span className="text-sm text-slate-500">None</span>}
          </div>
        </div>
        
        <div>
          <h4 className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-3 border-b border-[#2e3040] pb-2">Resistances</h4>
          <div className="flex flex-col gap-2">
            {resistances.length > 0 ? resistances.map(r => <Badge key={r.type} {...r} />) : <span className="text-sm text-slate-500">None</span>}
          </div>
        </div>
        
        <div>
          <h4 className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-3 border-b border-[#2e3040] pb-2">Immunities</h4>
          <div className="flex flex-col gap-2">
            {immunities.length > 0 ? immunities.map(i => <Badge key={i.type} {...i} />) : <span className="text-sm text-slate-500">None</span>}
          </div>
        </div>
      </div>
    </div>
  );
}