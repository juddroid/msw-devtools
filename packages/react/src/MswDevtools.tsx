'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  createMswDevtools,
  type MockKey,
  type MswDevtoolsInstance,
  type MswDevtoolsOptions,
} from '@juddroid/msw-devtools-core';
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  if (!enabled) return <>{children}</>;

  return (
    <MswDevtoolsContext.Provider value={instance}>
      {children}
    </MswDevtoolsContext.Provider>
  );
}
