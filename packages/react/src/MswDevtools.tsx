'use client';
import {
  type MockKey,
  type MswDevtoolsInstance,
  type MswDevtoolsOptions,
  createMswDevtools,
} from '@juddroid_raccoon/msw-devtools-core';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { MswDevtoolsContext } from './provider';

export interface MswDevtoolsProps extends MswDevtoolsOptions {
  children?: ReactNode;
  enabled?: boolean;
  onMockChange?: (keys: MockKey[]) => void;
  onReset?: () => void;
  onReady?: () => void;
}

export function MswDevtools(props: MswDevtoolsProps) {
  const { enabled = true, children, onMockChange, onReset, onReady, ...coreOpts } = props;
  const [instance, setInstance] = useState<MswDevtoolsInstance | null>(null);
  const optsRef = useRef(coreOpts);
  optsRef.current = coreOpts;

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — options tracked via ref to avoid re-creating instance on every render
  useEffect(() => {
    if (!enabled) return;
    const inst = createMswDevtools(optsRef.current);
    const offs: Array<() => void> = [];
    if (onMockChange) offs.push(inst.on('mock-change', onMockChange));
    if (onReset) offs.push(inst.on('reset', onReset));
    if (onReady) offs.push(inst.on('ready', onReady));
    void inst.mount();
    setInstance(inst);
    return () => {
      for (const off of offs) off();
      void inst.dispose();
      setInstance(null);
    };
    // mount happens once per enabled-cycle; option deps tracked via ref intentionally
  }, [enabled]);

  if (!enabled) return <>{children}</>;

  return <MswDevtoolsContext.Provider value={instance}>{children}</MswDevtoolsContext.Provider>;
}
