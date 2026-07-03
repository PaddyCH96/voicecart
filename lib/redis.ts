import { Redis } from '@upstash/redis';

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const store = new Map<string, string>();

function makeFallbackClient() {
  const inner = new Redis({ url: 'http://localhost:6379', token: '' });
  const origGet = inner.get.bind(inner);
  const origSet = inner.set.bind(inner);
  const origDel = inner.del.bind(inner);
  const origIncr = inner.incr.bind(inner);
  const origExpire = inner.expire.bind(inner);

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
    incr: async (key: string): Promise<number> => {
      try { return await origIncr(key); } catch {
        // Check if key has expired and reset if necessary
        const ttlRaw = store.get(key + '_ttl');
        if (ttlRaw && Date.now() > parseInt(ttlRaw, 10)) {
          store.delete(key);
          store.delete(key + '_ttl');
        }
        const current = parseInt(store.get(key) || '0', 10);
        store.set(key, String(current + 1));
        return current + 1;
      }
    },
    expire: async (key: string, seconds: number): Promise<number> => {
      try { return await origExpire(key, seconds); } catch {
        store.set(key + '_ttl', String(Date.now() + seconds * 1000));
        return 1;
      }
    },
  };
}

const redis: Redis = url && token
  ? new Redis({ url, token })
  : makeFallbackClient() as unknown as Redis;

export { redis };
