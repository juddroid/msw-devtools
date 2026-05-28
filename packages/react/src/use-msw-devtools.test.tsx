import type { MswDevtoolsInstance } from '@juddroid_raccoon/msw-devtools-core';
import { act, render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { MswDevtoolsContext } from './provider';
import { useMswDevtools } from './use-msw-devtools';

function makeFakeInstance(): MswDevtoolsInstance {
  const listeners = new Set<(s: any) => void>();
  let state: any = {
    enabledKeys: [],
    presets: [],
    methodFilter: [],
    collapsedGroups: [],
    searchTerm: '',
    open: false,
  };
  return {
    mount: vi.fn(),
    unmount: vi.fn(),
    dispose: vi.fn(async () => {}),
    getEnabledKeys: () => [...state.enabledKeys],
    isEnabled: () => false,
    findMatching: () => null,
    getState: () => state,
    enable: vi.fn(),
    disable: vi.fn(),
    toggle: vi.fn((k: string) => {
      state = { ...state, enabledKeys: [...state.enabledKeys, k] };
      for (const l of listeners) l(state);
    }),
    setEnabled: vi.fn(),
    notifyUnhandledRequest: vi.fn(),
    on: vi.fn(() => () => {}),
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    version: '0.0.0-test',
  };
}

function Probe() {
  const { enabledKeys } = useMswDevtools();
  return <div data-testid="enabled">{enabledKeys.join(',')}</div>;
}

describe('useMswDevtools', () => {
  it('returns default keys when no provider is mounted', () => {
    render(<Probe />);
    expect(screen.getByTestId('enabled').textContent).toBe('');
  });

  it('reflects instance state and updates on subscribe notification', () => {
    const inst = makeFakeInstance();
    render(
      <MswDevtoolsContext.Provider value={inst}>
        <Probe />
      </MswDevtoolsContext.Provider>,
    );
    expect(screen.getByTestId('enabled').textContent).toBe('');
    act(() => {
      inst.toggle('GET::/a');
    });
    expect(screen.getByTestId('enabled').textContent).toBe('GET::/a');
  });
});
