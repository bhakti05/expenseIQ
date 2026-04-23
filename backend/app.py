import logging
import os
import sys
from concurrent.futures import Future, ThreadPoolExecutor
from typing import Any, Dict

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.utils import secure_filename

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

try:
    from ml.ocr import extract_receipt_data
    from ml.categorizer import categorize_expense, load_models as load_cat_models
    from ml.predictor import load_prediction_models, predict_expenses
except ImportError:
    import ml.categorizer as categorizer
    import ml.ocr as ocr
    import ml.predictor as predictor

    extract_receipt_data = ocr.extract_receipt_data
    categorize_expense = categorizer.categorize_expense
    load_cat_models = categorizer.load_models
    predict_expenses = predictor.predict_expenses
    load_prediction_models = predictor.load_prediction_models

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = Flask(__name__)

frontend_origin_env = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
allowed_origins = [origin.strip() for origin in frontend_origin_env.split(",") if origin.strip()]
CORS(app, resources={r"/api/*": {"origins": allowed_origins or "*"}})

UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

executor = ThreadPoolExecutor(max_workers=max(2, min(4, (os.cpu_count() or 2))))
model_init_future: Future | None = None


def start_background_model_initialization() -> None:
    global model_init_future
    if model_init_future is None:
        model_init_future = executor.submit(initialize_models)


def initialize_models() -> Dict[str, bool]:
    logger.info("Initializing ML models in background...")
    categorizer_ready = load_cat_models()
    predictor_ready = load_prediction_models()
    logger.info("Background model initialization completed.")
    return {
        "categorizer_ready": bool(categorizer_ready),
        "predictor_ready": bool(predictor_ready),
    }


def wait_for_models_if_needed() -> Dict[str, bool]:
    start_background_model_initialization()
    assert model_init_future is not None
    try:
        return model_init_future.result(timeout=60)
    except Exception as error:
        logger.warning("Model initialization check failed: %s", error)
        return {"categorizer_ready": False, "predictor_ready": False}


def process_receipt_pipeline(filepath: str) -> Dict[str, Any]:
    result: Dict[str, Any] = {"success": False, "error": "Unknown error"}
    try:
        wait_for_models_if_needed()
        ocr_data = extract_receipt_data(filepath)
        if "error" in ocr_data:
            raise Exception(str(ocr_data["error"]))

        category = categorize_expense(
            str(ocr_data.get("vendor_name", "Unknown")),
            str(ocr_data.get("raw_ocr_text", "")),
        )

        result = {
            "success": True,
            "vendor_name": ocr_data.get("vendor_name", "Unknown"),
            "total_amount": ocr_data.get("total_amount", "0.00"),
            "date": ocr_data.get("date", ""),
            "category": category,
            "raw_ocr_text": ocr_data.get("raw_ocr_text", ""),
        }
    except Exception as error:
        logger.error("Pipeline error: %s", error)
        result = {"success": False, "error": str(error)}
    finally:
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception as cleanup_error:
                logger.warning("Could not remove temp file %s: %s", filepath, cleanup_error)

    return result


@app.route("/api/scan", methods=["POST"])
def scan_receipt():
    if "receipt" not in request.files:
        return jsonify({"success": False, "error": "No file part"}), 400

    file = request.files["receipt"]
    if file.filename == "":
        return jsonify({"success": False, "error": "No selected file"}), 400

    filename = secure_filename(file.filename)
    if not filename:
        return jsonify({"success": False, "error": "Invalid file name"}), 400

    filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(filepath)

    future: Future[Dict[str, Any]] = executor.submit(process_receipt_pipeline, filepath)
    result = future.result()
    return (jsonify(result), 200) if result.get("success") else (jsonify(result), 500)


@app.route("/api/predict", methods=["POST"])
def predict():
    data = request.get_json()
    if not data or "expenses" not in data:
        return jsonify({"success": False, "error": "Missing expenses data"}), 400

    try:
        wait_for_models_if_needed()
        predictions = predict_expenses(data["expenses"])
        return jsonify(
            {
                "success": True,
                "predictions": predictions["lstm"],
                "arima": predictions["arima"],
            }
        )
    except Exception as error:
        logger.error("Prediction error: %s", error)
        return jsonify({"success": False, "error": str(error)}), 500


@app.route("/api/health", methods=["GET"])
def health_check():
    models_status = {"categorizer_ready": False, "predictor_ready": False}
    if model_init_future and model_init_future.done():
        try:
            models_status = model_init_future.result()
        except Exception:
            pass

    return jsonify(
        {
            "status": "healthy",
            "models": models_status,
            "allowed_origins": allowed_origins,
        }
    )


if __name__ == "__main__":
    logger.info("ExpenseIQ Flask Backend Starting...")
    start_background_model_initialization()
    # Hugging Face Spaces automatically inject SPACE_ID environment variable
    # We fallback to 7860 if on Hugging Face, else use 5000 for local dev
    default_port = 7860 if os.getenv("SPACE_ID") else 5000
    port = int(os.getenv("PORT", default_port))
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
