export interface Config { url: string; email?: string; password?: string; token?: string }
export function readConfig(env = process.env): Config {
  if (!env.POCKETBASE_URL) throw new Error('POCKETBASE_URL is required');
  const url = new URL(env.POCKETBASE_URL);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('POCKETBASE_URL must be an HTTP(S) base URL without credentials, query or fragment');
  if (!!env.POCKETBASE_ADMIN_EMAIL !== !!env.POCKETBASE_ADMIN_PASSWORD) throw new Error('Set both POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD');
  return { url: url.href.replace(/\/$/, ''), email: env.POCKETBASE_ADMIN_EMAIL, password: env.POCKETBASE_ADMIN_PASSWORD, token: env.POCKETBASE_ADMIN_TOKEN };
}
