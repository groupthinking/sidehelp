import os
print("Importing LiteLLMModel...")
from smolagents import LiteLLMModel
from dotenv import load_dotenv
load_dotenv()

print("Initializing Model...")
try:
    model = LiteLLMModel(
        model_id="gemini/gemini-1.5-flash", 
        api_key=os.getenv("GOOGLE_API_KEY")
    )
    print("Model Initialized.")
except Exception as e:
    print(f"Failed: {e}")
