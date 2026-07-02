import { Redis } from '@upstash/redis';

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const store = new Map<string, string>();

function makeFallbackClient() {
  const inner = new Redis({ url: 'http://localhost:6379', token: '' });
  const origGet = inner.get.bind(inner);
  const origSet = inner.set.bind(inner);
  const origDel = inner.del.bind(inner);

  return {
    get: async (key: string): Promise<string | null> => {
      try { return await origGet(key); } catch { return store.get(key) ?? null; }
    },
    set: async (key: string, value: string | number | boolean): Promise<string | null> => {
      try { return String(await origSet(key, value)); } catch { store.set(key, String(value)); return 'OK'; }
    },
    del: async (...keys: string[]): Promise<number> => {
      try { return await origDel(...keys); } catch { let c = 0; keys.forEach(k => { if (store.delete(k)) c++; }); return c; }
    },
  };
}

const redis: Redis = url && token
  ? new Redis({ url, token })
  : makeFallbackClient() as unknown as Redis;

export { redis };
