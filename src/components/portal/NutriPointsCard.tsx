'use client';

export default function NutriPointsCard({ points }: { points: number }) {
  // Gamification Tiers
  const getTier = (pts: number) => {
    if (pts >= 1000) return { name: 'Nivel Oro', color: 'bg-yellow-400', next: 2000, emoji: '🏆' };
    if (pts >= 500) return { name: 'Nivel Plata', color: 'bg-slate-300', next: 1000, emoji: '🥈' };
    if (pts >= 100) return { name: 'Nivel Bronce', color: 'bg-orange-400', next: 500, emoji: '🥉' };
    return { name: 'Menú Saludable', color: 'bg-green-400', next: 100, emoji: '🍏' };
  };

  const tier = getTier(points);
  const progressPercentage = Math.min(100, (points / tier.next) * 100);

  return (
    <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-slate-700">
      <div className="absolute -top-12 -right-12 h-32 w-32 bg-accent opacity-20 blur-3xl rounded-full"></div>
      
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div>
          <h3 className="text-xl font-black text-accent tracking-tight flex items-center gap-2">
            Nutri-Puntos ★
          </h3>
          <p className="text-slate-400 text-sm mt-1">Programa de recompensas saludables.</p>
        </div>
        <div className="text-right">
          <span className="text-4xl font-black">{points}</span>
          <span className="text-slate-400 text-sm ml-1">pts</span>
        </div>
      </div>

      <div className="relative z-10">
        <div className="flex justify-between items-end mb-2">
          <span className="font-bold text-sm flex items-center gap-1">{tier.emoji} {tier.name}</span>
          <span className="text-xs text-slate-400 font-bold">{tier.next} pts para subir</span>
        </div>
        
        {/* Progress Bar */}
        <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
          <div 
            className={`h-full ${tier.color} transition-all duration-1000 ease-out`}
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
