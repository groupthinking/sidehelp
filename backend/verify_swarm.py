import os
import sys
# Patch environment to fix hangs
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    import patch_env
except ImportError:
    pass

# Ensure we can import from src
# Assuming this script is run from /Users/garvey/sidehelp
# Ensure we can import from current directory (backend)
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

print("Importing swarm_agent...")
try:
    from swarm_agent import agent
except ImportError as e:
    print(f"FAILED: Could not import swarm_agent: {e}")
    # Try creating a dummy agent if import fails due to missing keys just to verify structure
    sys.exit(1)

print("✅ Successfully imported swarm_agent.")

query = "What is the project name in the brain? Please just return the name."
print(f"Testing Query: {query}")

try:
    response = agent.run(query)
    print(f"Agent Response: {response}")
    print("✅ Logic test passed.")
except Exception as e:
    print(f"❌ Execution failed: {e}")
    sys.exit(1)
