
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Palette, Upload, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function SchoolBrandingSettings() {
  const db = useFirestore();
  const schoolId = 'sch1'; // Hardcoded for prototype
  const schoolRef = useMemoFirebase(() => doc(db, 'schools', schoolId), [db, schoolId]);
  const { data: school, isLoading } = useDoc(schoolRef);

  const [primaryColor, setPrimaryColor] = useState('#7CB9E8');
  const [secondaryColor, setSecondaryColor] = useState('#F4C430');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    if (school) {
      setPrimaryColor(school.primaryColor || '#7CB9E8');
      setSecondaryColor(school.secondaryColor || '#F4C430');
      setLogoUrl(school.logoUrl || '');
    }
  }, [school]);

  const handleSave = async () => {
    try {
      await updateDoc(schoolRef, {
        primaryColor,
        secondaryColor,
        logoUrl,
        updatedAt: new Date().toISOString()
      });
      toast({
        title: "Cambios guardados",
        description: "La identidad visual de la escuela ha sido actualizada.",
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron guardar los cambios.",
      });
    }
  };

  if (isLoading) return <div className="p-8 font-black animate-pulse">CARGANDO CONFIGURACIÓN...</div>;

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-black flex items-center gap-3">
          <Palette className="h-8 w-8 text-primary" />
          Personalización de Marca (White-Label)
        </h1>
        <p className="text-muted-foreground font-medium">Define los colores y el logo que verán los padres y el personal.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-2 border-primary/10 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-black">Colores Institucionales</CardTitle>
            <CardDescription>Selecciona los colores base para la plataforma.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Color Principal</Label>
              <div className="flex gap-4 items-center">
                <div 
                  className="h-12 w-12 rounded-xl border-2 shadow-inner" 
                  style={{ backgroundColor: primaryColor }}
                />
                <Input 
                  type="color" 
                  value={primaryColor} 
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-12 w-24 p-1 rounded-xl cursor-pointer"
                />
                <Input 
                  type="text" 
                  value={primaryColor} 
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="font-mono font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Color Secundario (Acento)</Label>
              <div className="flex gap-4 items-center">
                <div 
                  className="h-12 w-12 rounded-xl border-2 shadow-inner" 
                  style={{ backgroundColor: secondaryColor }}
                />
                <Input 
                  type="color" 
                  value={secondaryColor} 
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="h-12 w-24 p-1 rounded-xl cursor-pointer"
                />
                <Input 
                  type="text" 
                  value={secondaryColor} 
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="font-mono font-bold"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-primary/10 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-black">Escudo / Logotipo</CardTitle>
            <CardDescription>Sube la imagen oficial de la institución.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-primary/20 rounded-2xl p-8 bg-muted/20">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo preview" className="h-32 w-32 object-contain mb-4 rounded-lg bg-white p-2 shadow-sm" />
              ) : (
                <ImageIcon className="h-16 w-16 text-muted-foreground mb-4" />
              )}
              <Label className="cursor-pointer bg-primary text-foreground px-6 py-2 rounded-xl font-black text-sm flex items-center gap-2 hover:opacity-90 transition-opacity">
                <Upload className="h-4 w-4" />
                CAMBIAR LOGO
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => {
                    // En producción esto subiría a Firebase Storage
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setLogoUrl(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </Label>
              <p className="text-[10px] text-muted-foreground font-bold mt-4 uppercase tracking-widest">Recomendado: PNG Transparente 512x512px</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tarjeta de Previsualización */}
      <Card className="border-2 border-secondary shadow-2xl bg-white overflow-hidden">
        <CardHeader className="bg-muted/30">
          <CardTitle className="text-sm font-black uppercase text-muted-foreground">Previsualización en tiempo real</CardTitle>
        </CardHeader>
        <CardContent className="p-12 flex flex-col items-center gap-6">
          <div className="flex items-center gap-4">
            {logoUrl && <img src={logoUrl} alt="Logo preview" className="h-12 w-12 object-contain" />}
            <h2 className="text-3xl font-black text-foreground">NutriPass <span style={{ color: primaryColor }}>{school?.name || 'Escuela'}</span></h2>
          </div>
          <div className="flex gap-4">
            <Button style={{ backgroundColor: primaryColor, color: 'white' }} className="rounded-xl h-12 px-8 font-black shadow-lg">
              BOTÓN PRIMARIO
            </Button>
            <Button style={{ backgroundColor: secondaryColor, color: '#004B87' }} className="rounded-xl h-12 px-8 font-black shadow-lg">
              BOTÓN SECUNDARIO
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-8">
        <Button 
          size="lg" 
          onClick={handleSave}
          className="bg-slate-900 text-white font-black h-16 px-12 rounded-2xl shadow-2xl flex gap-3 text-lg hover:bg-slate-800"
        >
          <CheckCircle className="h-6 w-6" />
          GUARDAR IDENTIDAD VISUAL
        </Button>
      </div>
    </div>
  );
}
