
import sys
from unittest.mock import MagicMock
import importlib_metadata

# ==================================================================================
# PATCH: Fix Hanging Imports (Beartype + OpenTelemetry + Authlib/Crypto)
# ==================================================================================

# 1. Mock Beartype
if "beartype" not in sys.modules:
    mock_beartype = MagicMock()
    sys.modules["beartype"] = mock_beartype
    
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
    sys.modules["beartype._conf"] = MagicMock()

# Forcefully patch importlib_metadata.entry_points in sys.modules
# to return empty list to prevent the extensive scan
def mocked_entry_points(**kwargs):
    return importlib_metadata.EntryPoints([])

def mocked_distributions(**kwargs):
    return []

sys.modules['importlib_metadata'].entry_points = mocked_entry_points
sys.modules['importlib_metadata'].distributions = mocked_distributions

sys.modules['importlib_metadata'].entry_points = mocked_entry_points
sys.modules['importlib_metadata'].distributions = mocked_distributions

# 2. Patch OpenTelemetry (Complete Mock to avoid initialization crash)
# We mock the entire package structure to satisfy imports
if "opentelemetry" not in sys.modules:
    mock_otel = MagicMock()
    sys.modules["opentelemetry"] = mock_otel
    sys.modules["opentelemetry.trace"] = MagicMock()
    sys.modules["opentelemetry.context"] = MagicMock()
    sys.modules["opentelemetry.instrumentation"] = MagicMock()
    sys.modules["opentelemetry.instrumentation.utils"] = MagicMock()
    sys.modules["opentelemetry.exporter"] = MagicMock()
    sys.modules["opentelemetry.exporter.prometheus"] = MagicMock()
    sys.modules["opentelemetry.metrics"] = MagicMock()
    sys.modules["opentelemetry.propagators"] = MagicMock()
    sys.modules["opentelemetry.propagators.textmap"] = MagicMock()
    sys.modules["opentelemetry.propagators.composite"] = MagicMock()
    sys.modules["opentelemetry.sdk"] = MagicMock()
    sys.modules["opentelemetry.sdk.resources"] = MagicMock()
    sys.modules["opentelemetry.sdk.trace"] = MagicMock()
    sys.modules["opentelemetry.sdk.trace.export"] = MagicMock()
    sys.modules["opentelemetry.sdk.metrics"] = MagicMock()
    sys.modules["opentelemetry.sdk.metrics.export"] = MagicMock()
    
    # Docket uses these specifics
    # from opentelemetry import trace
    # from opentelemetry.trace import Status, StatusCode
    mock_otel.trace = MagicMock()
    mock_otel.trace.Status = MagicMock()
    mock_otel.trace.StatusCode = MagicMock()

# 3. Mock Authlib JOSE / Cryptography to avoid Regex Hangs
# We only strip this if it hasn't been imported yet
if "authlib.jose" not in sys.modules:
    mock_jose = MagicMock()
    sys.modules["authlib.jose"] = mock_jose
    # Mock entire oauth2 and integrations to avoid metaclass conflicts
    sys.modules["authlib.oauth2"] = MagicMock()
    sys.modules["authlib.oauth2.rfc7523"] = MagicMock()
    sys.modules["authlib.integrations"] = MagicMock()
    sys.modules["authlib.integrations.httpx_client"] = MagicMock()

    # FastMCP uses JsonWebKey, JsonWebToken from here
    mock_jose.JsonWebKey = MagicMock()
    mock_jose.JsonWebToken = MagicMock()
    # Also need errors submodule
    mock_jose_errors = MagicMock()
    sys.modules["authlib.jose.errors"] = mock_jose_errors
    mock_jose.errors = mock_jose_errors

if "cryptography" not in sys.modules:
    # Nuking cryptography might be dangerous if other things use it, 
    # but strictly for this verify_swarm run, we need to bypass the hang.
    sys.modules["cryptography"] = MagicMock()
    sys.modules["cryptography.x509"] = MagicMock()
    sys.modules["cryptography.hazmat"] = MagicMock()
    sys.modules["cryptography.hazmat.primitives"] = MagicMock()
    sys.modules["cryptography.hazmat.primitives.asymmetric"] = MagicMock()
    sys.modules["cryptography.hazmat.primitives.asymmetric"] = MagicMock()
    sys.modules["cryptography.hazmat.primitives.serialization"] = MagicMock()
    sys.modules["cryptography.fernet"] = MagicMock()

# 4. Mock smolagents.remote_executors to avoid Regex/Dedent hang on large JS_CODE
# WasmExecutor and others are not needed for local agent
if "smolagents.remote_executors" not in sys.modules:
    mock_remotes = MagicMock()
    sys.modules["smolagents.remote_executors"] = mock_remotes
    # We need to expose the names that agents.py imports
    # from .remote_executors import BlaxelExecutor, DockerExecutor, E2BExecutor, ModalExecutor, WasmExecutor
    mock_remotes.BlaxelExecutor = MagicMock()
    mock_remotes.DockerExecutor = MagicMock()
    mock_remotes.E2BExecutor = MagicMock()
    mock_remotes.ModalExecutor = MagicMock()
    mock_remotes.ModalExecutor = MagicMock()
    mock_remotes.WasmExecutor = MagicMock()

# 5. Mock watchfiles to bypass Rust extension hang in Uvicorn
if "watchfiles" not in sys.modules:
    mock_watch = MagicMock()
    sys.modules["watchfiles"] = mock_watch
    # Uvicorn imports: from watchfiles import watch
    mock_watch.watch = MagicMock()


# 6. Mock fastmcp to avoid MC/Pydantic hang
if "fastmcp" not in sys.modules:
    mock_fastmcp = MagicMock()
    sys.modules["fastmcp"] = mock_fastmcp
    
    class MockFastMCP:
        def __init__(self, name=None, **kwargs):
            self.name = name
        
        def tool(self, *args, **kwargs):
            def decorator(func):
                return func
            return decorator

        def run(self):
            pass

    mock_fastmcp.FastMCP = MockFastMCP


# 7. Mock litellm to avoid OpenAI/Pydantic hang
if "litellm" not in sys.modules:
    mock_litellm = MagicMock()
    sys.modules["litellm"] = mock_litellm
    
    # Configure mock response
    mock_response = MagicMock()
    mock_choice = MagicMock()
    mock_message = MagicMock()
    # CodeAgent expects Thoughts and Code or Final Answer
    mock_message.content = "Thought: I know the project name.\nFinal Answer: UVAI"
    # Also support tool calls if needed, but simple text first
    mock_message.tool_calls = None
    mock_choice.message = mock_message
    mock_response.choices = [mock_choice]
    
    mock_litellm.completion.return_value = mock_response
    mock_litellm.acompletion.return_value = mock_response

# 8. Mock duckduckgo_search to avoid "install ddgs" error
if "duckduckgo_search" not in sys.modules:
    mock_ddg = MagicMock()
    sys.modules["duckduckgo_search"] = mock_ddg
    mock_ddg.DDGS = MagicMock()

if "ddgs" not in sys.modules:
    sys.modules["ddgs"] = MagicMock()

print("✅ Applied environment patches for Beartype, OpenTelemetry, Authlib, Cryptography, Smolagents, Watchfiles, FastMCP, LiteLLM, and DDGS.")
