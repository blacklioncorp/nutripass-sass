
'use client';

import React, { useEffect } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

interface ThemeProviderProps {
  children: React.ReactNode;
  schoolId?: string;
}

/**
 * ThemeProvider dynamically injects school branding colors into CSS variables.
 */
export function ThemeProvider({ children, schoolId = 'sch1' }: ThemeProviderProps) {
  const db = useFirestore();
  const schoolRef = useMemoFirebase(() => doc(db, 'schools', schoolId), [db, schoolId]);
  const { data: school } = useDoc(schoolRef);

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

  return <>{children}</>;
}
