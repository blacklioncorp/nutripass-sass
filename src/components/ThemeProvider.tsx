
'use client';

import React, { useEffect, useState, createContext, useContext } from 'react';
import { useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, query, collection, where, limit } from 'firebase/firestore';

interface ThemeProviderProps {
  children: React.ReactNode;
}

interface SchoolContextType {
  school: any | null;
  isLoading: boolean;
}

const SchoolContext = createContext<SchoolContextType>({ school: null, isLoading: true });

export const useSchool = () => useContext(SchoolContext);

/**
 * ThemeProvider dynamically detects school by subdomain and injects branding colors.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const db = useFirestore();
  const [school, setSchool] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const resolveSchool = async () => {
      // In production, we'd use window.location.hostname
      // For the prototype/dev, we can check for a 'tenant' query param or default to sch1
      const hostname = window.location.hostname;
      const subdomain = hostname.split('.')[0];
      
      // Filter out common local/base domains
      const isLocal = hostname === 'localhost' || hostname.includes('webcontainer') || hostname.includes('firebaseapp.com');
      
      try {
        if (!isLocal && subdomain && subdomain !== 'www') {
          // Fetch by subdomain logic (mocked for prototype visibility)
          // In a real scenario: query(collection(db, 'schools'), where('subdomain', '==', subdomain), limit(1))
          setSchool({ id: 'sch1', name: 'Escuela San Agustín', primaryColor: '#7CB9E8', secondaryColor: '#F4C430' });
        } else {
          // Fallback to a default school for development
          setSchool({ id: 'sch1', name: 'Escuela San Agustín', primaryColor: '#7CB9E8', secondaryColor: '#F4C430' });
        }
      } catch (error) {
        console.error("Error resolving school tenant:", error);
      } finally {
        setIsLoading(false);
      }
    };

    resolveSchool();
  }, [db]);

  useEffect(() => {
    if (school) {
      const root = document.documentElement;
      if (school.primaryColor) {
        root.style.setProperty('--brand-primary', school.primaryColor);
      }
      if (school.secondaryColor) {
        root.style.setProperty('--brand-secondary', school.secondaryColor);
      }
    }
  }, [school]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest">Identificando Institución...</h2>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-100 p-6 rounded-3xl mb-6">
          <svg className="h-16 w-16 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-2">Escuela No Encontrada</h1>
        <p className="text-slate-500 font-medium mb-8 max-w-md">La dirección a la que intentas acceder no está registrada en la red NutriPass.</p>
        <button onClick={() => window.location.href = '/'} className="bg-primary text-foreground font-black px-8 py-4 rounded-2xl shadow-xl">
          VOLVER AL INICIO
        </button>
      </div>
    );
  }

  return (
    <SchoolContext.Provider value={{ school, isLoading }}>
      {children}
    </SchoolContext.Provider>
  );
}
