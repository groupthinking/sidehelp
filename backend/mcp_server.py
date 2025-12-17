import sys
import os
# Patch environment to fix hangs
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    import patch_env
except ImportError:
    pass

from fastmcp import FastMCP
from pathlib import Path
import json
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize FastMCP Server
mcp = FastMCP("GLIC++ Legacy Bridge")

ROOT_DIR = Path(os.getcwd())
BRAIN_PATH = ROOT_DIR / ".deep_research_brain.json"
IGNORE_DIRS = {'.git', 'node_modules', '__pycache__', '.DS_Store', 'venv', 'env', '.gemini'}

@mcp.tool()
def search_files(pattern: str = "*", limit: int = 50) -> list[str]:
    """Search for files in the project directory matching a glob pattern."""
    matches = []
    for p in ROOT_DIR.rglob(pattern):
        if any(part in IGNORE_DIRS for part in p.parts):
            continue
        if p.is_file():
            matches.append(str(p.relative_to(ROOT_DIR)))
            if len(matches) >= limit:
                break
    return matches

@mcp.tool()
def read_file(path: str) -> str:
    """Read the contents of a file."""
    p = ROOT_DIR / path
    if not p.exists():
        return f"Error: File {path} not found."
    try:
        return p.read_text(encoding='utf-8')
    except Exception as e:
        return f"Error reading file: {e}"

@mcp.tool()
def get_project_brain() -> dict:
    """Get the high-level project summary (Brain)."""
    if BRAIN_PATH.exists():
        try:
            with open(BRAIN_PATH, 'r') as f:
                return json.load(f)
        except Exception as e:
            return {"error": f"Failed to load brain: {e}"}
    return {"error": "No Project Brain found. Please run deep research first."}

if __name__ == "__main__":
    mcp.run()
