'use client';
import { MswDevtools } from '@juddroid/msw-devtools-react';
import type { ReactNode } from 'react';
import { handlers } from '../mocks/handlers';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MswDevtools handlers={handlers} enabled={process.env.NODE_ENV !== 'production'}>
      {children}
    </MswDevtools>
  );
}
