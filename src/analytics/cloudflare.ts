/** Cloudflare Web Analytics beacon: cookie-free page views, no consent needed. `spa` tracks route changes. */
export function loadCloudflareBeacon(token: string) {
  if (typeof document === 'undefined' || document.querySelector('script[data-cf-beacon]')) return;
  const s = document.createElement('script');
  s.defer = true;
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  s.dataset.cfBeacon = JSON.stringify({ token, spa: true });
  document.head.appendChild(s);
}
