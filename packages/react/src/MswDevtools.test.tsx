import { http, HttpResponse } from 'msw';
import { render, act, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MswDevtools } from './MswDevtools';

const fakeWorkerFactory = () => ({
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn(),
  resetHandlers: vi.fn(),
  use: vi.fn(),
});

describe('<MswDevtools />', () => {
  it('renders children only when enabled=false', () => {
    render(
      <MswDevtools enabled={false} handlers={[]} workerFactory={fakeWorkerFactory}>
        <div data-testid="child">child</div>
      </MswDevtools>,
    );
    expect(screen.getByTestId('child')).toBeTruthy();
    expect(document.querySelector('[data-msw-devtools-root]')).toBeNull();
  });

  it('mounts the devtool DOM when enabled', async () => {
    render(
      <MswDevtools
        handlers={[http.get('/x', () => HttpResponse.json({}))]}
        workerFactory={fakeWorkerFactory}
      >
        <div data-testid="child">child</div>
      </MswDevtools>,
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    expect(document.querySelector('[data-msw-devtools-root]')).not.toBeNull();
  });

  it('cleans up on unmount', async () => {
    const { unmount } = render(
      <MswDevtools handlers={[]} workerFactory={fakeWorkerFactory} />,
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    unmount();
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    expect(document.querySelector('[data-msw-devtools-root]')).toBeNull();
  });
});
