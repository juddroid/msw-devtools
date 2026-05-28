'use client';
import { createContext } from 'react';
import type { MswDevtoolsInstance } from '@juddroid_raccoon/msw-devtools-core';

export const MswDevtoolsContext = createContext<MswDevtoolsInstance | null>(null);
