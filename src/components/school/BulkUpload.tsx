'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import { 
  FileSpreadsheet, 
  Upload as UploadIcon, 
  Settings2, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { importConsumersAction } from '@/app/(dashboard)/school/actions';
import { useRouter } from 'next/navigation';

// --- Types & Constants ---

type ImportStep = 'UPLOAD' | 'MAPPING' | 'PROGRESS' | 'REPORT';

interface MappingState {
  first_name: string;
  last_name: string;
  identifier: string;
  type: string;
  grade: string;
  parent_email: string;
  parent_phone: string;
}

const TARGET_FIELDS = [
  { id: 'first_name', label: 'Nombre(s)', required: true, aliases: ['nombre', 'firstname', 'nom', 'first', 'estudiante', 'student'] },
  { id: 'last_name', label: 'Apellidos', required: true, aliases: ['apellido', 'lastname', 'surname', 'paterno', 'last'] },
  { id: 'identifier', label: 'Matrícula / ID', required: false, aliases: ['matricula', 'id', 'student_id', 'code', 'codigo', 'enrollment'] },
  { id: 'grade', label: 'Grado / Grupo', required: false, aliases: ['grado', 'grade', 'curso', 'class', 'grupo'] },
  { id: 'type', label: 'Tipo (student/staff)', required: false, aliases: ['tipo', 'type', 'role', 'categoria'] },
  { id: 'parent_email', label: 'Email Padre', required: false, aliases: ['email_padre', 'parent_email', 'correo', 'mail', 'contacto', 'email'] },
  { id: 'parent_phone', label: 'Teléfono Padre', required: false, aliases: ['telefono_padre', 'parent_phone', 'celular', 'phone', 'whatsapp', 'tel'] },
];

export default function BulkUpload() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<ImportStep>('UPLOAD');
  const [file, setFile] = useState<File | null>(null);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Partial<MappingState>>({});
  const [importProgress, setImportProgress] = useState(0);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const router = useRouter();

  // --- Handlers ---

  const resetState = () => {
    setStep('UPLOAD');
    setFile(null);
    setRawHeaders([]);
    setRawData([]);
    setMapping({});
    setImportProgress(0);
    setReport(null);
    setError(null);
  };

  const processInitialData = (headers: string[], rows: any[]) => {
    setRawHeaders(headers);
    setRawData(rows);

    // Smart Guesser (ES/EN logic)
    const initialMapping: any = {};
    TARGET_FIELDS.forEach(field => {
      const match = headers.find(h => {
        const normalizedH = h.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
        return field.aliases.some(alias => normalizedH.includes(alias));
      });
      if (match) initialMapping[field.id] = match;
    });

    setMapping(initialMapping);
    setStep('MAPPING');
    setIsUploading(false);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsUploading(true);
    setError(null);

    try {
      if (selectedFile.name.endsWith('.csv')) {
        Papa.parse(selectedFile, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            processInitialData(results.meta.fields || [], results.data);
          },
          error: (err) => {
            setError(`Error parsing CSV: ${err.message}`);
            setIsUploading(false);
          }
        });
      } else {
        const workbook = new ExcelJS.Workbook();
        const arrayBuffer = await selectedFile.arrayBuffer();
        await workbook.xlsx.load(arrayBuffer);
        const worksheet = workbook.getWorksheet(1);
        
        if (!worksheet) throw new Error('No se encontró una hoja en el archivo Excel.');

        const headers: string[] = [];
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell) => {
          headers.push(cell.text.trim());
        });

        const rows: any[] = [];
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const rowData: any = {};
          row.eachCell((cell, colNumber) => {
            rowData[headers[colNumber - 1]] = cell.text.trim();
          });
          rows.push(rowData);
        });

        processInitialData(headers, rows);
      }
    } catch (err: any) {
      setError(err.message);
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: false
  });

  const handleStartImport = async () => {
    const missing = TARGET_FIELDS.filter(f => f.required && !mapping[f.id as keyof MappingState]);
    if (missing.length > 0) {
      setError(`Campos obligatorios faltantes: ${missing.map(m => m.label).join(', ')}`);
      return;
    }

    setStep('PROGRESS');
    setImportProgress(10);

    try {
      const formattedData = rawData.map(row => {
        const payload: any = {};
        Object.entries(mapping).forEach(([internalKey, csvHeader]) => {
          payload[internalKey] = row[csvHeader as string];
        });
        return payload;
      });

      // Progress simulation for better UX
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + (Math.random() * 5), 90));
      }, 300);

      const result = await importConsumersAction(formattedData);
      
      clearInterval(progressInterval);
      setImportProgress(100);

      if (result.success) {
        setReport(result.summary);
        setStep('REPORT');
        router.refresh();
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      setError(err.message);
      setStep('MAPPING');
    }
  };

  return (
    <>
      <Button 
        onClick={() => { resetState(); setIsOpen(true); }}
        className="bg-[#1a3a5c] hover:bg-[#0d1f3c] text-white font-black px-6 py-6 rounded-2xl shadow-xl shadow-blue-900/10 flex items-center gap-2 group transition-all"
      >
        <UploadIcon className="h-5 w-5 group-hover:-translate-y-1 transition-transform" />
        CARGA MASIVA PREMIUM
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[700px] bg-slate-50 border-none p-0 overflow-hidden rounded-[2.5rem] shadow-2xl">
          <div className="bg-[#1a3a5c] p-10 text-white relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
            <DialogHeader>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center">
                   {step === 'UPLOAD' && <UploadIcon className="h-6 w-6" />}
                   {step === 'MAPPING' && <Settings2 className="h-6 w-6" />}
                   {step === 'PROGRESS' && <Loader2 className="h-6 w-6 animate-spin" />}
                   {step === 'REPORT' && <CheckCircle2 className="h-6 w-6" />}
                </div>
                <div>
                  <DialogTitle className="text-3xl font-black italic uppercase">
                    {step === 'UPLOAD' && 'Importar Alumnos'}
                    {step === 'MAPPING' && 'Configurar Columnas'}
                    {step === 'PROGRESS' && 'Procesando Datos'}
                    {step === 'REPORT' && 'Reporte de Operación'}
                  </DialogTitle>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="p-10">
            {step === 'UPLOAD' && (
              <div className="space-y-6">
                <div 
                  {...getRootProps()} 
                  className={`
                    border-4 border-dashed rounded-[3rem] p-16 transition-all duration-300 flex flex-col items-center justify-center text-center group
                    ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'}
                  `}
                >
                  <input {...getInputProps()} />
                  <div className="h-24 w-24 bg-blue-50 group-hover:bg-blue-100 rounded-full flex items-center justify-center mb-6">
                    <FileSpreadsheet className="h-12 w-12 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-black text-[#1a3a5c] mb-2">Arrastra tu archivo aquí</h3>
                  <p className="text-[#8aa8cc] font-medium text-sm">Soporta .XLSX y .CSV</p>
                </div>
                {error && <p className="text-red-500 text-sm font-bold bg-red-50 p-4 rounded-xl">{error}</p>}
              </div>
            )}

            {step === 'MAPPING' && (
              <div className="space-y-8">
                <div className="grid gap-4 max-h-[350px] overflow-y-auto pr-2">
                  {TARGET_FIELDS.map((field) => (
                    <div key={field.id} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-black text-[#1a3a5c] text-sm">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </p>
                        <p className="text-[#8aa8cc] text-[10px] uppercase font-bold tracking-widest">Cruzar con columna del archivo</p>
                      </div>
                      <Select 
                        value={(mapping as any)[field.id] || ''} 
                        onValueChange={(val) => setMapping(prev => ({ ...prev, [field.id]: val }))}
                      >
                        <SelectTrigger className="w-[220px] bg-slate-50 border-none rounded-xl font-bold">
                          <SelectValue placeholder="Seleccionar columna..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {rawHeaders.map((h) => (
                            <SelectItem key={h} value={h} className="font-bold">{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                <Button onClick={handleStartImport} className="w-full bg-[#1a3a5c] h-16 rounded-[1.5rem] text-lg font-black tracking-tight">
                  <ArrowRight className="mr-2" /> INICIAR IMPORTACIÓN DE {rawData.length} FILAS
                </Button>
              </div>
            )}

            {step === 'PROGRESS' && (
              <div className="py-20 flex flex-col items-center text-center">
                <Loader2 className="h-16 w-16 text-blue-600 animate-spin mb-8" />
                <h3 className="text-3xl font-black text-[#1a3a5c] mb-4">Sincronizando con Supabase...</h3>
                <div className="w-full max-w-sm space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase">
                    <span>Progreso del servidor</span>
                    <span>{Math.round(importProgress)}%</span>
                  </div>
                  <Progress value={importProgress} className="h-4 bg-slate-100 rounded-full" />
                </div>
              </div>
            )}

            {step === 'REPORT' && report && (
              <div className="space-y-8">
                <div className="bg-emerald-50 p-10 rounded-[3rem] border border-emerald-100 text-center flex flex-col items-center">
                   <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-6" />
                   <h3 className="text-3xl font-black text-[#1a3a5c] mb-2">¡Importación Exitosa!</h3>
                   <div className="grid grid-cols-2 gap-4 w-full mt-8">
                      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                        <p className="text-2xl font-black text-[#1a3a5c]">{report.newStudents}</p>
                        <p className="text-[10px] font-black uppercase text-[#8aa8cc]">Alumnos</p>
                      </div>
                      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                        <p className="text-2xl font-black text-[#1a3a5c]">{report.linkedParents}</p>
                        <p className="text-[10px] font-black uppercase text-[#8aa8cc]">Padres Vinculados</p>
                      </div>
                      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                        <p className="text-2xl font-black text-[#1a3a5c]">{report.preLinkedParents}</p>
                        <p className="text-[10px] font-black uppercase text-[#8aa8cc]">Pre-Vínculos</p>
                      </div>
                      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                        <p className="text-2xl font-black text-[#1a3a5c]">{report.whatsappCandidates}</p>
                        <p className="text-[10px] font-black uppercase text-[#8aa8cc]">Envios WhatsApp</p>
                      </div>
                   </div>
                   {report.whatsappCandidates > 0 && (
                     <div className="mt-6 flex items-center gap-2 bg-blue-50 p-3 rounded-xl border border-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-tighter">
                        <ShieldCheck className="h-4 w-4" /> n8n Webhook disparado correctamente (source: bulk_upload_safelunch)
                     </div>
                   )}
                </div>
                <Button onClick={() => setIsOpen(false)} className="w-full bg-[#1a3a5c] h-16 rounded-[1.5rem] font-black">
                  ENTENDIDO
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
