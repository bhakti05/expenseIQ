# This wrapper allows Hugging Face Spaces to run the backend from the root of the repository
import sys
import os

# Add backend directory to Python path so internal imports work correctly
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
if backend_path not in sys.path:
    sys.path.append(backend_path)

# Import the actual Flask app from the backend
from backend.app import app, start_background_model_initialization

if __name__ == "__main__":
    start_background_model_initialization()
    # Let Hugging Face inject the port, default to 7860
    port = int(os.getenv("PORT", 7860))
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
