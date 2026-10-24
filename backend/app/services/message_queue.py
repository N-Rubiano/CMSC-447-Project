"""
services/message_queue.py  –  Async message queue backed by Redis Streams.
Falls back to an in-process asyncio.Queue for dev/test without Redis.

Usage:
    from app.services.message_queue import mq
    await mq.publish("pin.created", {"pin_id": "...", "project_id": "..."})
    await mq.subscribe("pin.created", my_async_handler)
"""
import os, json, asyncio, threading
from typing import Callable, Awaitable, Any

REDIS_URL  = os.getenv("REDIS_URL","")
STREAM_PREFIX = "punchlist:"

class _InProcessQueue:
    def __init__(self):
        self._queues: dict[str,asyncio.Queue] = {}
        self._handlers: dict[str,list] = {}

    async def publish(self, topic:str, payload:dict):
        for cb in self._handlers.get(topic,[]):
            try: await cb(payload)
            except Exception as e: print(f"[MQ] handler error on {topic}: {e}")

    async def subscribe(self, topic:str, handler:Callable[[dict],Awaitable[Any]]):
        self._handlers.setdefault(topic,[]).append(handler)
        print(f"[MQ-dev] subscribed to {topic}")

class _RedisStreamQueue:
    def __init__(self, url:str):
        import redis.asyncio as aioredis
        self._url = url
        self._handlers: dict[str,list] = {}
        self._client = None

    async def _get_client(self):
        if self._client is None:
            import redis.asyncio as aioredis
            self._client = await aioredis.from_url(self._url, decode_responses=True)
        return self._client

    async def publish(self, topic:str, payload:dict):
        r = await self._get_client()
        stream = STREAM_PREFIX + topic
        await r.xadd(stream, {"data": json.dumps(payload)}, maxlen=1000)

    async def subscribe(self, topic:str, handler:Callable[[dict],Awaitable[Any]]):
        self._handlers.setdefault(topic,[]).append(handler)
        asyncio.create_task(self._consume(topic))

    async def _consume(self, topic:str):
        r = await self._get_client()
        stream = STREAM_PREFIX + topic
        last_id = "$"
        while True:
            try:
                msgs = await r.xread({stream: last_id}, block=0, count=10)
                for _stream, entries in msgs:
                    for msg_id, fields in entries:
                        payload = json.loads(fields.get("data","{}"))
                        for cb in self._handlers.get(topic,[]):
                            try: await cb(payload)
                            except Exception as e: print(f"[MQ] error in {topic} handler: {e}")
                        last_id = msg_id
            except Exception as e:
                print(f"[MQ] stream error on {topic}: {e}")
                await asyncio.sleep(2)

def _make_mq():
    if REDIS_URL:
        try:
            q = _RedisStreamQueue(REDIS_URL)
            print("Message queue: Redis Streams backend")
            return q
        except Exception as e:
            print(f"[MQ] Redis unavailable ({e}), using in-process queue")
    return _InProcessQueue()

mq = _make_mq()
