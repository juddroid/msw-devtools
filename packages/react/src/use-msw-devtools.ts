'use client';
import type {
  DevtoolsState,
  MockKey,
  MswDevtoolsInstance,
} from '@juddroid_raccoon/msw-devtools-core';
import { useContext, useMemo, useSyncExternalStore } from 'react';
import { MswDevtoolsContext } from './provider';

const FALLBACK_STATE: DevtoolsState = {
  enabledKeys: [],
  presets: [],
  methodFilter: [],
  collapsedGroups: [],
  searchTerm: '',
  open: false,
};

const noopSubscribe = () => () => {};
const noop = () => {};

export interface UseMswDevtoolsResult {
  enabledKeys: MockKey[];
  isEnabled: (method: string, url: string) => boolean;
  enable: (key: MockKey) => void;
  disable: (key: MockKey) => void;
  toggle: (key: MockKey) => void;
  setEnabled: (keys: MockKey[]) => void;
  notifyUnhandledRequest: (input: { method: string; url: string }) => void;
}

export function useMswDevtools(): UseMswDevtoolsResult {
  const inst: MswDevtoolsInstance | null = useContext(MswDevtoolsContext);
  const state = useSyncExternalStore<DevtoolsState>(
    inst ? inst.subscribe : noopSubscribe,
    () => (inst ? inst.getState() : FALLBACK_STATE),
    () => FALLBACK_STATE,
  );

  return useMemo<UseMswDevtoolsResult>(
    () => ({
      enabledKeys: state.enabledKeys,
      isEnabled: inst ? inst.isEnabled : () => false,
      enable: inst ? inst.enable : noop,
      disable: inst ? inst.disable : noop,
      toggle: inst ? inst.toggle : noop,
      setEnabled: inst ? inst.setEnabled : noop,
      notifyUnhandledRequest: inst ? inst.notifyUnhandledRequest : noop,
    }),
    [inst, state],
  );
}
