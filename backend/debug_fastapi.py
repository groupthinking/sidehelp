
print("Testing fastapi import...")
try:
    import fastapi
    print(f"fastapi imported successfully: {fastapi.__version__}")
except Exception as e:
    print(f"fastapi import failed: {e}")
