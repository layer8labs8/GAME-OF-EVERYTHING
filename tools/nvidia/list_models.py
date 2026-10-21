"""Print every model id the NVIDIA endpoint lists (not all of them are callable)."""
from client import make_client

ids = sorted(m.id for m in make_client().models.list().data)
print(len(ids), "models")
for i in ids:
    print(i)
