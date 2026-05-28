'use client';
import { createContext } from 'react';
import type { MswDevtoolsInstance } from '@juddroid/msw-devtools-core';

export const MswDevtoolsContext = createContext<MswDevtoolsInstance | null>(null);
