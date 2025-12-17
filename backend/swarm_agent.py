import os
import sys
import os
import sys
# Patch environment to fix hangs
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    import patch_env
except ImportError:
    pass

from smolagents import CodeAgent, LiteLLMModel, tool
from dotenv import load_dotenv

# Ensure we can import from mcp_server
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from mcp_server import search_files, read_file, get_project_brain

load_dotenv()

# Wrapper Tools for Smolagents
@tool
def fs_search(pattern: str) -> str:
    """
    Search for files in the project directory.
    Args:
        pattern: The glob pattern to search for (e.g. '*.py')
    """
    return str(search_files(pattern))

@tool
def fs_read(path: str) -> str:
    """
    Read the contents of a file.
    Args:
        path: The relative path to the file.
    """
    return read_file(path)

@tool
def brain_get() -> str:
    """
    Get the high-level project summary (Brain).
    """
    return str(get_project_brain())

# Initialize Model
# Using Gemini via LiteLLM
try:
    model = LiteLLMModel(
        model_id="gemini/gemini-1.5-flash", 
        api_key=os.getenv("GOOGLE_API_KEY")
    )
except Exception as e:
    print(f"Error initializing LiteLLMModel: {e}")
    sys.exit(1)

# Initialize Agent
agent = CodeAgent(
    tools=[fs_search, fs_read, brain_get], 
    model=model,
    add_base_tools=True # Adds python interpreter etc.
)

def interact():
    print("🤖 GLIC++ Swarm Agent (Smolagents + MCP)")
    print("Type 'quit' to exit.")
    
    # Pre-load brain to say hello
    try:
        brain = get_project_brain()
        if "project_name" in brain:
            print(f"Connected to: {brain['project_name']}")
    except:
        pass

    while True:
        try:
            user_input = input("\nYou: ")
            if user_input.lower() in ['quit', 'exit']:
                break
            
            # Run agent
            response = agent.run(user_input)
            print(f"\nAgent:\n{response}")
            
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"\nError: {e}")

if __name__ == "__main__":
    interact()
