
import sys
import importlib_metadata

print("Starting entry points scan...")
try:
    dists = list(importlib_metadata.distributions())
    print(f"Found {len(dists)} distributions")
    for i, dist in enumerate(dists):
        name = dist.metadata['Name']
        print(f"[{i}] Checking: {name}")
        try:
             ep = dist.entry_points
        except Exception as e:
            print(f"FAILED on {name}: {e}")
except Exception as e:
    print(f"Global Failure: {e}")
print("Done")
