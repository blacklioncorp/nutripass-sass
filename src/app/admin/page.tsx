
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, UserRound, Utensils, CreditCard, TrendingUp, AlertCircle, Send } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { useFirestore } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';

const data = [
  { name: 'Lun', sales: 4000 },
  { name: 'Mar', sales: 3000 },
  { name: 'Mie', sales: 2000 },
  { name: 'Jue', sales: 2780 },
  { name: 'Vie', sales: 1890 },
];

const stats = [
  { title: 'Estudiantes', value: '842', icon: Users, color: 'text-primary' },
  { title: 'Personal', value: '64', icon: UserRound, color: 'text-secondary' },
  { title: 'Ventas Hoy', value: '$8,420', icon: CreditCard, color: 'text-emerald-500' },
  { title: 'Menús Servidos', value: '412', icon: Utensils, color: 'text-amber-500' },
];

export default function AdminDashboard() {
  const db = useFirestore();

  const simulateWeeklyReminder = async () => {
    try {
      // Simulate sending to parent1
      const parentId = "parent1";
      await addDoc(collection(db, 'profiles', parentId, 'notifications'), {
        userId: parentId,
        title: "¡Planifica la semana!",
        message: "Ya está disponible el menú de la próxima semana. Reserva con tiempo para asegurar tus platillos favoritos.",
        type: "reminder",
        isRead: false,
        createdAt: new Date().toISOString()
      });
      toast({
        title: "Recordatorios enviados",
        description: "Se han enviado notificaciones a todos los padres activos.",
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron enviar los recordatorios.",
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black">Dashboard de Escuela</h1>
        <Button 
          onClick={simulateWeeklyReminder}
          className="bg-secondary text-foreground font-black gap-2 shadow-lg hover:scale-105 transition-transform"
        >
          <Send className="h-4 w-4" />
          ENVIAR RECORDATORIO MATA-MERMAS
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-2 border-primary/10 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-black uppercase text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black tracking-tight">{stat.value}</div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" /> +12% desde ayer
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-2 border-primary/5">
          <CardHeader>
            <CardTitle className="text-xl font-black">Consumo Semanal</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7CB9E8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#7CB9E8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="sales" stroke="#7CB9E8" fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-2 border-primary/5">
          <CardHeader>
            <CardTitle className="text-xl font-black flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Alertas de Nutrición
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'Juan Pérez', msg: 'Alergia detectada en POS', time: '10:15 AM' },
                { name: 'María García', msg: 'Saldo insuficiente', time: '12:30 PM' },
                { name: 'Sistema', msg: 'Menu del día actualizado', time: '08:00 AM' },
              ].map((alert, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted/30 border border-muted transition-all hover:bg-muted/50">
                  <div className="h-2 w-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold">{alert.name}</p>
                    <p className="text-xs text-muted-foreground">{alert.msg}</p>
                    <p className="text-[10px] font-black text-muted-foreground uppercase mt-1">{alert.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
