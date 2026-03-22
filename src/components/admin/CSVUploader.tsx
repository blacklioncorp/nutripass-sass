
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Upload, FileText, CheckCircle2, Loader2 } from 'lucide-react';

interface CSVUploaderProps {
  onImport: (data: any[]) => void;
}

export default function CSVUploader({ onImport }: CSVUploaderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const processCSV = () => {
    if (!file) return;
    setIsProcessing(true);

    // Frontend CSV Processing Simulation (would use PapaParse in production)
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      console.log('Parsing CSV content:', text);
      
      // Simulate network delay for insertion
      setTimeout(() => {
        onImport([]); // Send parsed objects here
        setIsProcessing(false);
        setIsModalOpen(false);
        setFile(null);
      }, 2500);
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="font-black gap-2 border-2 border-primary/20 hover:border-primary">
          <Upload className="h-4 w-4" />
          CARGA MASIVA (CSV)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase tracking-tight">Importar Usuarios</DialogTitle>
        </DialogHeader>
        <div className="py-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Sube un listado masivo de alumnos y personal. El sistema creará sus perfiles y billeteras automáticamente.
          </p>
          <div className="border-2 border-dashed border-primary/20 rounded-xl p-8 flex flex-col items-center justify-center gap-4 bg-muted/20 relative group hover:border-primary/50 transition-colors">
            <input 
              type="file" 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              accept=".csv"
              onChange={handleFileChange}
              disabled={isProcessing}
            />
            <div className="bg-white p-4 rounded-full shadow-sm group-hover:scale-110 transition-transform">
              {isProcessing ? <Loader2 className="h-8 w-8 text-primary animate-spin" /> : <FileText className="h-8 w-8 text-primary" />}
            </div>
            <div className="text-center">
              <p className="font-bold text-sm">{file ? file.name : "Arrastra tu archivo .csv aquí"}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-black">Formato requerido: UTF-8</p>
            </div>
          </div>
          
          <div className="bg-secondary/10 p-4 rounded-lg flex gap-3 border border-secondary/20">
            <CheckCircle2 className="h-5 w-5 text-secondary shrink-0" />
            <div className="text-xs text-muted-foreground">
              <span className="font-bold block text-foreground uppercase mb-1">Estructura del CSV:</span>
              nombre, apellido, identificador, tipo (student/staff), grado
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
          <Button 
            className="bg-primary text-foreground font-black min-w-[140px]" 
            disabled={!file || isProcessing}
            onClick={processCSV}
          >
            {isProcessing ? "INSERTANDO..." : "IMPORTAR AHORA"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
