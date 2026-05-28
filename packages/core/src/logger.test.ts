import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from './logger';

afterEach(() => vi.restoreAllMocks());

describe('createLogger', () => {
  it('routes calls to the supplied sink', () => {
    const error = vi.fn();
    const warn = vi.fn();
    const info = vi.fn();
    const debug = vi.fn();
    const log = createLogger({ logger: { error, warn, info, debug }, logLevel: 'debug' });

    log.error('e');
    log.warn('w');
    log.info('i');
    log.debug('d');

    expect(error).toHaveBeenCalledWith('e');
    expect(warn).toHaveBeenCalledWith('w');
    expect(info).toHaveBeenCalledWith('i');
    expect(debug).toHaveBeenCalledWith('d');
  });

  it('respects "warn" level by default (info and debug silenced)', () => {
    const sink = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };
    const log = createLogger({ logger: sink });
    log.error('e');
    log.warn('w');
    log.info('i');
    log.debug('d');
    expect(sink.error).toHaveBeenCalled();
    expect(sink.warn).toHaveBeenCalled();
    expect(sink.info).not.toHaveBeenCalled();
    expect(sink.debug).not.toHaveBeenCalled();
  });

  it('silences everything at level "silent"', () => {
    const sink = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };
    const log = createLogger({ logger: sink, logLevel: 'silent' });
    log.error('e');
    log.warn('w');
    expect(sink.error).not.toHaveBeenCalled();
    expect(sink.warn).not.toHaveBeenCalled();
  });

  it('falls back to console with the "[msw-devtools]" prefix', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const log = createLogger({});
    log.error('boom');
    log.warn('hmm');
    expect(errorSpy).toHaveBeenCalledWith('[msw-devtools]', 'boom');
    expect(warnSpy).toHaveBeenCalledWith('[msw-devtools]', 'hmm');
  });
});
