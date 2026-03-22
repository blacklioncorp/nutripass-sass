
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Zap, Trophy, Star, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NutriPointsCardProps {
  points: number;
  studentName: string;
}

export default function NutriPointsCard({ points, studentName }: NutriPointsCardProps) {
  // Levels logic
  const getLevelInfo = (pts: number) => {
    if (pts < 500) return { name: 'BRONCE', next: 500, icon: Star, color: 'text-amber-700', bg: 'bg-amber-50' };
    if (pts < 1500) return { name: 'PLATA', next: 1500, icon: Trophy, color: 'text-slate-400', bg: 'bg-slate-50' };
    return { name: 'ORO', next: 5000, icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-50' };
  };

  const level = getLevelInfo(points);
  const progress = (points / level.next) * 100;

  return (
    <Card className="border-4 border-secondary/20 rounded-[2rem] shadow-xl overflow-hidden relative group">
      <div className="absolute -right-4 -top-4 p-8 opacity-10 group-hover:scale-125 transition-transform duration-500">
        <level.icon className="h-32 w-32" />
      </div>
      
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("px-4 py-1 rounded-full text-[10px] font-black tracking-widest border-2", level.bg, level.color)}>
            NIVEL {level.name}
          </div>
          <Zap className="h-6 w-6 text-secondary animate-pulse fill-secondary" />
        </div>
        <CardTitle className="text-2xl font-black">Nutri-Puntos de {studentName}</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="flex items-end gap-2">
          <span className="text-5xl font-black tracking-tighter text-secondary">{points}</span>
          <span className="text-xs font-black uppercase text-muted-foreground mb-2">PTS</span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <span>Progreso hacia siguiente nivel</span>
            <span>{level.next} PTS</span>
          </div>
          <Progress value={progress} className="h-4 bg-secondary/10" />
        </div>

        <div className="bg-slate-900 rounded-2xl p-4 flex items-center gap-4 text-white">
          <div className="bg-secondary p-2 rounded-xl">
            <TrendingUp className="h-5 w-5 text-slate-900" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-secondary tracking-widest">Siguiente Recompensa</p>
            <p className="text-sm font-bold">¡Almuerzo gratis al llegar a {level.next} pts!</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
