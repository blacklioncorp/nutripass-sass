"use client";

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useTenant } from '@/components/providers/TenantProvider';

export default function BrandSettingsForm() {
  const { tenant } = useTenant();
  const [primaryColor, setPrimaryColor] = useState(tenant?.primary_color || '#7CB9E8');
  const [secondaryColor, setSecondaryColor] = useState(tenant?.secondary_color || '#004B87');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(tenant?.logo_url || null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const supabase = createClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    
    setIsSaving(true);
    setMessage('Guardando configuración...');
    
    try {
      let finalLogoUrl = tenant.logo_url;

      // 1. Upload Logo if changed
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${tenant.id}-${Date.now()}.${fileExt}`;
        const filePath = `logos/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('school_assets')
          .upload(filePath, logoFile);
          
        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage
          .from('school_assets')
          .getPublicUrl(filePath);
          
        finalLogoUrl = publicData.publicUrl;
      }

      // 2. Update DB
      const { error: updateError } = await supabase
        .from('schools')
        .update({
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          logo_url: finalLogoUrl
        })
        .eq('id', tenant.id);

      if (updateError) throw updateError;
      
      // Update global CSS variables immediately for preview
      document.documentElement.style.setProperty('--brand-primary', primaryColor);
      document.documentElement.style.setProperty('--brand-secondary', secondaryColor);

      setMessage('¡Marca actualizada con éxito! Refresca para ver todos los cambios.');
    } catch (error: any) {
      console.error(error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
      {/* Form Area */}
      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Escudo / Logotipo de la Escuela</label>
          <div className="flex items-center gap-4">
            <div className="h-24 w-24 bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-300">
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="Logo Preview" className="h-full w-full object-contain p-2" />
              ) : (
                <span className="text-3xl">🛡️</span>
              )}
            </div>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange}
              className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Color Principal</label>
            <div className="flex items-center gap-2">
              <input 
                type="color" 
                value={primaryColor} 
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-10 p-1 rounded border border-slate-200 cursor-pointer"
              />
              <span className="text-slate-500 text-sm font-code">{primaryColor.toUpperCase()}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Color Secundario</label>
            <div className="flex items-center gap-2">
              <input 
                type="color" 
                value={secondaryColor} 
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="h-10 w-10 p-1 rounded border border-slate-200 cursor-pointer"
              />
              <span className="text-slate-500 text-sm font-code">{secondaryColor.toUpperCase()}</span>
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isSaving}
          className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 disabled:opacity-50 transition"
        >
          {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </button>

        {message && <p className="text-sm font-medium text-blue-600 mt-2">{message}</p>}
      </form>

      {/* Live Preview Area */}
      <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 flex flex-col items-center justify-center">
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-4">Previsualización en Vivo</p>
        
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden" style={{ borderColor: secondaryColor, borderWidth: '0 0 4px 0' }}>
          <div className="p-4 flex justify-center border-b border-slate-100" style={{ backgroundColor: primaryColor + '10' }}>
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreview} alt="Logo" className="h-12 object-contain" />
            ) : (
              <div className="h-12 w-12 rounded-full" style={{ backgroundColor: primaryColor }}></div>
            )}
          </div>
          <div className="p-6">
            <h3 className="font-bold text-lg mb-2" style={{ color: secondaryColor }}>Bienvenido al Portal</h3>
            <p className="text-sm text-slate-500 mb-6">Esta es una vista previa de cómo se mostrarán los colores de tu colegio en los botones y encabezados de la aplicación.</p>
            <button className="w-full font-bold py-3 rounded-xl text-white transition-opacity hover:opacity-90" style={{ backgroundColor: primaryColor }}>
              Pagar Orden $45.00
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
