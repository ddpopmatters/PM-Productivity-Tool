export function getTelegramWebApp() {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp || null;
}

export function isTelegramMiniApp() {
  return Boolean(getTelegramWebApp());
}

export function configureTelegramMiniApp() {
  const webApp = getTelegramWebApp();
  if (!webApp) return null;

  try {
    webApp.ready?.();
    webApp.expand?.();
    webApp.setHeaderColor?.('#0f3d4c');
    webApp.setBackgroundColor?.('#f8fafc');
  } catch (_) {
    return webApp;
  }

  return webApp;
}

export function getTelegramStartParam() {
  const webApp = getTelegramWebApp();
  return webApp?.initDataUnsafe?.start_param || '';
}

