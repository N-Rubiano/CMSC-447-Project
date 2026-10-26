"""
services/cache.py  –  Redis cache with in-process dict fallback.
Usage:
    from app.services.cache import cache
    data = cache.get("my_key")
    cache.set("my_key", data, ttl=300)
    cache.delete("my_key")
    cache.flush_pattern("project:*")
"""
import os, json, time, threading
from typing import Any, Optional

REDIS_URL = os.getenv("REDIS_URL","")
DEFAULT_TTL = int(os.getenv("CACHE_DEFAULT_TTL","300"))

class _InProcessCache:
    def __init__(self):
        self._s:dict = {}
        self._lock = threading.Lock()
    def get(self, key:str) -> Optional[Any]:
        with self._lock:
            e = self._s.get(key)
            if not e: return None
            if e["exp"] and e["exp"] < time.time():
                del self._s[key]; return None
            return e["v"]
    def set(self, key:str, val:Any, ttl:int=DEFAULT_TTL):
        with self._lock:
            self._s[key]={"v":val,"exp":time.time()+ttl if ttl else None}
    def delete(self, key:str):
        with self._lock: self._s.pop(key,None)
    def flush_pattern(self, pattern:str):
        prefix=pattern.rstrip("*")
        with self._lock:
            keys=[k for k in self._s if k.startswith(prefix)]
            for k in keys: del self._s[k]

class _RedisCache:
    def __init__(self, url:str):
        import redis as _r
        self._r=_r.Redis.from_url(url,decode_responses=True)
        self._r.ping()
    def get(self, key:str)->Optional[Any]:
        try:
            raw=self._r.get(key)
            return json.loads(raw) if raw is not None else None
        except Exception: return None
    def set(self, key:str, val:Any, ttl:int=DEFAULT_TTL):
        try: self._r.set(key,json.dumps(val),ex=ttl or None)
        except Exception: pass
    def delete(self, key:str):
        try: self._r.delete(key)
        except Exception: pass
    def flush_pattern(self, pattern:str):
        try:
            keys=self._r.keys(pattern)
            if keys: self._r.delete(*keys)
        except Exception: pass

def _make_cache():
    if REDIS_URL:
        try:
            c=_RedisCache(REDIS_URL)
            print("Redis cache connected")
            return c
        except Exception as e:
            print(f"Redis cache unavailable ({e}), using in-process cache")
    return _InProcessCache()

cache = _make_cache()
