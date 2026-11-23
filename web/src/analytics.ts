type AnalyticsCall = [event: string, payload?: unknown];
type AnalyticsWindow = Window & { va?: (...call: AnalyticsCall) => void; vaq?: AnalyticsCall[] };

/** Vercel Web Analytics: same-origin, so it loads on this cross-origin isolated
 * page, and cookieless. Calls queue until the deferred script picks them up. */
export function startAnalytics() {
  if (['localhost', '127.0.0.1'].includes(location.hostname)) return;
  const page = window as AnalyticsWindow;
  page.va ??= (...call) => { (page.vaq ??= []).push(call); };
  const script = document.createElement('script');
  script.defer = true;
  script.src = '/_vercel/insights/script.js';
  document.head.append(script);
}

export function track(name: string, data?: Record<string, string>) {
  (window as AnalyticsWindow).va?.('event', data ? { name, data } : { name });
}
