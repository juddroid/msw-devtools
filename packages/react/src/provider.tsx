'use client';
import type { MswDevtoolsInstance } from '@juddroid_raccoon/msw-devtools-core';
import { createContext } from 'react';

export const MswDevtoolsContext = createContext<MswDevtoolsInstance | null>(null);
