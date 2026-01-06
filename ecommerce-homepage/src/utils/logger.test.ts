import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from './logger';

describe('logger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('log', () => {
    it('should log in development', () => {
      logger.log('Test message', { key: 'value' });
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should log errors', () => {
      const error = new Error('Test error');
      logger.error('Test error message', error);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should sanitize sensitive keys', () => {
      logger.error('Test', undefined, { apiKey: 'secret-key-12345' });
      const call = consoleErrorSpy.mock.calls[0];
      // The context object should be the third argument
      if (call[2] && typeof call[2] === 'object') {
        expect(call[2]).toHaveProperty('apiKey');
        expect(String(call[2].apiKey)).toContain('***');
      } else {
        // Fallback: check the stringified call
        const callString = JSON.stringify(call);
        expect(callString).toContain('***');
      }
    });
  });

  describe('warn', () => {
    it('should log warnings in development', () => {
      logger.warn('Test warning', { key: 'value' });
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('debug', () => {
    it('should log debug messages in development', () => {
      logger.debug('Test debug', { key: 'value' });
      expect(consoleDebugSpy).toHaveBeenCalled();
    });
  });
});

