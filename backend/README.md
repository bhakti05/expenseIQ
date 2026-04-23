# ExpenseIQ - Python Flask Backend

This backend handles heavy-duty processing tasks for the Intelligent Expense Tracker:
- **OCR Engine**: Tesseract OCR + OpenCV for receipt parsing.
- **Categorization**: Scikit-learn SVM model (with keyword-based fallback).
- **Forecasting**: LSTM and ARIMA time-series models for expense prediction.

## Setup Instructions

1. **Install Tesseract OCR**:
   - Download and install Tesseract from [OCR-binaries](https://github.com/UB-Mannheim/tesseract/wiki).
   - Add Tesseract to your System PATH variables.

2. **Python Environment**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\\Scripts\\activate
   pip install -r requirements.txt
   ```

3. **Run Backend**:
   ```bash
   python app.py
   ```
   The server will run on `http://localhost:5000`.

## API Endpoints

- `POST /api/scan`: Accepts a multipart form with a `receipt` image. Returns extracted JSON data.
- `POST /api/predict`: Accepts a JSON body with expense history. Returns future spending forecasts.
