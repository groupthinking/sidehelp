
print("Step 1: start")
import sys
from unittest.mock import MagicMock
import importlib_metadata

# MOCK BEARTYPE to avoid import hooks hang - ITERATION 3
mock_beartype = MagicMock()
sys.modules["beartype"] = mock_beartype

# Handle @beartype(conf=...) usage
def beartype_decorator(*args, **kwargs):
    def decorator(func):
        return func
    if len(args) == 1 and callable(args[0]) and not kwargs:
        return args[0]
    return decorator

mock_beartype.beartype = beartype_decorator
mock_beartype.BeartypeConf = MagicMock()
sys.modules["beartype.claw"] = MagicMock()
sys.modules["beartype.door"] = MagicMock()
sys.modules["beartype.vale"] = MagicMock()

# Patch entry points
def mocked_entry_points(**kwargs):
    # Return real EntryPoints object but empty
    return importlib_metadata.EntryPoints([])

sys.modules['importlib_metadata'].entry_points = mocked_entry_points

print("Step 2: sys imported and patched")
try:
    from fastmcp import FastMCP
    print("Step 3: FastMCP imported")
except ImportError as e:
    print(f"Failed to import FastMCP: {e}")
    sys.exit(1)
except Exception as e:
    print(f"Failed to import FastMCP (Unknown): {e}")
    sys.exit(1)

try:
    print("Step 4: Initializing FastMCP...")
    mcp = FastMCP("Debug Server")
    print("Step 5: FastMCP initialized")
except Exception as e:
    print(f"Failed to init FastMCP: {e}")
