'use client';

import { PomodoroProvider } from '@/lib/contexts/PomodoroContext';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PomodoroProvider>
      {children}
    </PomodoroProvider>
  );
}
