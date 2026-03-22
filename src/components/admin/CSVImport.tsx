'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface CSVImportProps {
  onImport: (data: any[]) => void;
}

export default function CSVImport({ onImport }: CSVImportProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleImport = () => {
    setIsProcessing(true);
    // Simulate parsing
    setTimeout(() => {
      onImport([]);
      setIsProcessing(false);
      setIsModalOpen(false);
      setFile(null);
    }, 2000);
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="font-black gap-2 border-2 border-primary/20 hover:border-primary">
          <Upload className="h-4 w-4" />
          IMPORTAR CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Importación Masiva</DialogTitle>
        </DialogHeader>
        <div className="py-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Sube un archivo .csv con el listado de alumnos o personal. Asegúrate de seguir la plantilla oficial.
          </p>
          <div className="border-2 border-dashed border-primary/20 rounded-xl p-8 flex flex-col items-center justify-center gap-4 bg-muted/20 relative">
            <input 
              type="file" 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              accept=".csv"
              onChange={handleFileChange}
            />
            <div className="bg-white p-4 rounded-full shadow-sm">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-bold text-sm">{file ? file.name : "Selecciona o arrastra el archivo"}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-black">Solo archivos .CSV (Max 10MB)</p>
            </div>
          </div>
          
          <div className="bg-primary/5 p-4 rounded-lg flex gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              <span className="font-bold block text-foreground">Estructura esperada:</span>
              nombre_completo, grado, grupo, email_tutor, saldo_inicial
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
          <Button 
            className="bg-primary text-foreground font-black" 
            disabled={!file || isProcessing}
            onClick={handleImport}
          >
            {isProcessing ? "PROCESANDO..." : "EMPEZAR IMPORTACIÓN"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
