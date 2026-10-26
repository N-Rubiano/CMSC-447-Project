"""
services/kafka_client.py  --  Optional Kafka integration for high-volume events.
Kafka is used only when KAFKA_ENABLED=true. Otherwise a no-op stub is returned,
so all import sites work without Kafka installed.

When to use Kafka vs Redis Streams:
    Redis Streams  – default; sub-100k events/day, same-process consumers
    Kafka          – enable when: processing >100k events/day, multi-service fan-out
                     (e.g. email notifications, analytics pipeline, audit archiving)

Env:
    KAFKA_ENABLED=true
    KAFKA_BOOTSTRAP_SERVERS=localhost:9092
    KAFKA_TOPIC_PREFIX=punchlist.
    KAFKA_GROUP_ID=punchlist-workers
"""
import os, json
from typing import Any

KAFKA_ENABLED   = os.getenv("KAFKA_ENABLED","false").lower()=="true"
BROKERS         = os.getenv("KAFKA_BOOTSTRAP_SERVERS","localhost:9092")
TOPIC_PREFIX    = os.getenv("KAFKA_TOPIC_PREFIX","punchlist.")
GROUP_ID        = os.getenv("KAFKA_GROUP_ID","punchlist-workers")

class _NoOpKafka:
    def publish(self, topic:str, payload:dict, **kw): pass
    def close(self): pass

class _KafkaClient:
    def __init__(self):
        from kafka import KafkaProducer
        self._producer = KafkaProducer(
            bootstrap_servers=BROKERS.split(","),
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
            acks="all",
            retries=3,
            linger_ms=5,
        )
        print(f"Kafka producer connected to {BROKERS}")

    def publish(self, topic:str, payload:dict, key:str=None):
        """Fire-and-forget publish. Flush is implicit via linger_ms batching."""
        full_topic = TOPIC_PREFIX + topic
        k = key.encode() if key else None
        self._producer.send(full_topic, value=payload, key=k)

    def close(self):
        self._producer.flush()
        self._producer.close()

SUPPORTED_TOPICS = [
    "pin.created",
    "pin.status_changed",
    "pin.closed",
    "blueprint.uploaded",
    "report.generated",
    "user.login",
    "audit.event",
]

def _make_kafka():
    if not KAFKA_ENABLED:
        return _NoOpKafka()
    try:
        return _KafkaClient()
    except Exception as e:
        print(f"Kafka unavailable ({e}), using no-op stub")
        return _NoOpKafka()

kafka = _make_kafka()
