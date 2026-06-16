import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  configureTelegramMiniApp,
  getTelegramStartParam,
  getTelegramWebApp,
  isTelegramMiniApp,
} from './telegramMiniApp';

afterEach(() => {
  delete window.Telegram;
  vi.restoreAllMocks();
});

describe('telegramMiniApp utilities', () => {
  it('returns null outside Telegram', () => {
    expect(getTelegramWebApp()).toBeNull();
    expect(isTelegramMiniApp()).toBe(false);
  });

  it('configures the injected Telegram WebApp object', () => {
    const webApp = {
      ready: vi.fn(),
      expand: vi.fn(),
      setHeaderColor: vi.fn(),
      setBackgroundColor: vi.fn(),
      initDataUnsafe: { start_param: 'start-of-day' },
    };
    window.Telegram = { WebApp: webApp };

    expect(configureTelegramMiniApp()).toBe(webApp);
    expect(webApp.ready).toHaveBeenCalled();
    expect(webApp.expand).toHaveBeenCalled();
    expect(webApp.setHeaderColor).toHaveBeenCalledWith('#0f3d4c');
    expect(webApp.setBackgroundColor).toHaveBeenCalledWith('#f8fafc');
    expect(getTelegramStartParam()).toBe('start-of-day');
  });
});

