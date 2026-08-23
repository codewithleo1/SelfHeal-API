"""Run this to diagnose the Upstash lpush issue."""
import os
from dotenv import load_dotenv
from upstash_redis import Redis

load_dotenv()

r = Redis(
    url=os.getenv("UPSTASH_REDIS_URL"),
    token=os.getenv("UPSTASH_REDIS_TOKEN"),
)

# Test 1: basic set/get
r.set("selfheal:test", "hello")
val = r.get("selfheal:test")
print(f"SET/GET test: {val}")  # should be "hello"

# Test 2: lpush and immediate llen
result = r.lpush("selfheal:debug", "item1")
print(f"lpush result: {result}")  # should be 1

length = r.llen("selfheal:debug")
print(f"llen after lpush: {length}")  # should be 1

items = r.lrange("selfheal:debug", 0, -1)
print(f"lrange: {items}")

# Test 3: rpop
popped = r.rpop("selfheal:debug")
print(f"rpop: {popped}")  # should be "item1"

# Cleanup
r.delete("selfheal:test")
r.delete("selfheal:debug")
print("Done")