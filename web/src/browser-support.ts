/** Where to send a visitor whose browser cannot give the emulator shared memory.
 * Android apps open links in a WebView, which never can; Chrome on the same phone can. */
export function unsupportedBrowserMessage(userAgent: string, touchPoints = 0) {
  const android = /Android/i.test(userAgent);
  if (android && /; wv\)|FB_IAB|FBAV|Instagram|LinkedInApp|\bLine\/|MicroMessenger|Bytedance|Snapchat/i.test(userAgent))
    return 'The browser inside this app can’t run the game. Open this page in Chrome to play.';
  const ios = /iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && touchPoints > 1);
  const safari = /Version\/[\d.]+.*Safari\//i.test(userAgent);
  if (ios && !safari) return 'This browser can’t run the game. Open this page in Safari to play.';
  return 'This browser can’t run the game. Update it, or open this page in the latest Chrome, Edge, Firefox or Safari.';
}

/** In-app browsers often block the clipboard API, so fall back to a selection copy. */
export async function copyText(text: string, host: HTMLElement) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const field = document.createElement('textarea');
    field.value = text;
    field.readOnly = true;
    field.style.cssText = 'position:fixed;top:0;left:0;opacity:0;user-select:text;-webkit-user-select:text';
    host.append(field);
    field.select();
    field.setSelectionRange(0, text.length);
    try { return document.execCommand('copy'); } catch { return false; } finally { field.remove(); }
  }
}
