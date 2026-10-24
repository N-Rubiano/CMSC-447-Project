"""
middleware/rate_limiter.py
Sliding-window rate limiter. Optional Redis backend, in-process fallback.
Env: RATE_LIMIT_ENABLED, RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_SECONDS,
     AUTH_RATE_LIMIT_REQUESTS, AUTH_RATE_LIMIT_WINDOW_SECONDS, REDIS_URL
"""
import os, time, threading, collections
from typing import Optional
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED","true").lower()=="true"
WINDOW = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS","60"))
LIMIT  = int(os.getenv("RATE_LIMIT_REQUESTS","120"))
AUTH_WINDOW = int(os.getenv("AUTH_RATE_LIMIT_WINDOW_SECONDS","60"))
AUTH_LIMIT  = int(os.getenv("AUTH_RATE_LIMIT_REQUESTS","100"))
REDIS_URL   = os.getenv("REDIS_URL","")

_redis: Optional[object] = None
def _get_redis():
    global _redis
    if _redis is not None: return _redis
    if not REDIS_URL: return None
    try:
        import redis as _r
        _redis = _r.Redis.from_url(REDIS_URL, decode_responses=True)
        _redis.ping()
        return _redis
    except Exception: return None

_store: dict = {}
_lock = threading.Lock()

def _in_process_check(key, limit, window):
    now = time.time()
    with _lock:
        if key not in _store: _store[key] = collections.deque()
        dq = _store[key]
        while dq and dq[0] < now - window: dq.popleft()
        if len(dq) < limit:
            dq.append(now); return True, 0
        return False, int(window-(now-dq[0]))+1

_LUA = "local k=KEYS[1];local n=tonumber(ARGV[1]);local w=tonumber(ARGV[2]);local l=tonumber(ARGV[3]);redis.call('ZREMRANGEBYSCORE',k,'-inf',n-w);local c=redis.call('ZCARD',k);if c<l then redis.call('ZADD',k,n,n..'-'..math.random(1e6));redis.call('EXPIRE',k,w+1);return {1,0} end;local o=redis.call('ZRANGE',k,0,0,'WITHSCORES');return {0,w-(n-tonumber(o[2]))+1}"

def _redis_check(r, key, limit, window):
    try:
        res=r.eval(_LUA,1,key,time.time(),window,limit); return int(res[0])==1,int(res[1])
    except Exception: return True,0

class RateLimitMiddleware(BaseHTTPMiddleware):
    def _ip(self,req):
        xff=req.headers.get("X-Forwarded-For")
        return xff.split(",")[0].strip() if xff else (req.client.host if req.client else "unknown")
    async def dispatch(self,req:Request,call_next)->Response:
        if not RATE_LIMIT_ENABLED or not req.url.path.startswith("/api/"): return await call_next(req)
        ip=self._ip(req); auth=req.url.path.startswith("/api/auth/")
        lim,win=(AUTH_LIMIT,AUTH_WINDOW) if auth else (LIMIT,WINDOW)
        key=f"rl:{'auth' if auth else 'api'}:{ip}"
        r=_get_redis()
        ok,retry=_redis_check(r,key,lim,win) if r else _in_process_check(key,lim,win)
        if not ok:
            return JSONResponse({"error":"Too many requests","retry_after":retry},status_code=429,
                headers={"Retry-After":str(retry),"X-RateLimit-Limit":str(lim),"X-RateLimit-Remaining":"0"})
        resp=await call_next(req); resp.headers["X-RateLimit-Limit"]=str(lim); return resp
