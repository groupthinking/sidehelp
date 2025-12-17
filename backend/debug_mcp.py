
print("Step 1: start")
import sys
from unittest.mock import MagicMock

# Patch importlib_metadata.entry_points instead of wiping opentelemetry
import importlib_metadata
original_entry_points = importlib_metadata.entry_points

def mocked_entry_points(**kwargs):
    print(f"Intercepted entry_points call: {kwargs}")
    # Return empty collection or specific mock if needed
    # But wait, the hang is in *reading* them.
    # If we return an empty list, it shouldn't hang.
    return [] 

# We need to patch the exact function that opentelemetry uses
# It imports: from importlib_metadata import entry_points
# So we need to patch it in opentelemetry's namespace if it's already imported, 
# or patch sys.modules['importlib_metadata'].entry_points

sys.modules['importlib_metadata'].entry_points = mocked_entry_points

print("Step 2: sys imported and patched")
try:
    from fastmcp import FastMCP
    print("Step 3: FastMCP imported")
except ImportError as e:
    print(f"Failed to import FastMCP: {e}")
    sys.exit(1)

try:
    print("Step 4: Initializing FastMCP...")
    mcp = FastMCP("Debug Server")
    print("Step 5: FastMCP initialized")
except Exception as e:
    print(f"Failed to init FastMCP: {e}")
