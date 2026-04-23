import pandas as pd
import numpy as np
import os
import json
import joblib
from datetime import datetime, timedelta
from statsmodels.tsa.arima.model import ARIMA
import logging

# Configure Logger
logger = logging.getLogger(__name__)

# Soft-load TensorFlow to avoid DLL issues on Windows
_TF_AVAILABLE = False
try:
    from tensorflow.keras.models import load_model # type: ignore
    _TF_AVAILABLE = True
    logger.info("TensorFlow loaded successfully.")
except (ImportError, Exception) as e:
    logger.warning(f"TensorFlow not available or DLL missing. Only ARIMA will work. Error: {e}")

# Resolve paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'lstm_model.h5')
SCALER_PATH = os.path.join(BASE_DIR, 'models', 'lstm_scaler.pkl')
CONFIG_PATH = os.path.join(BASE_DIR, 'models', 'lstm_config.json')

# Global variables to cache models
_lstm_model = None
_scaler = None
_config = None

def load_prediction_models():
    global _lstm_model, _scaler, _config
    if not _TF_AVAILABLE:
        logger.warning("Skipping LSTM load: TensorFlow is not available.")
        return False

    try:
        if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
            # Suppress TensorFlow logs
            os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
            _lstm_model = load_model(MODEL_PATH)
            _scaler = joblib.load(SCALER_PATH)
            
            if os.path.exists(CONFIG_PATH):
                with open(CONFIG_PATH, 'r') as f:
                    _config = json.load(f)
            logger.info("LSTM Prediction models loaded successfully.")
            return True
    except Exception as e:
        logger.error(f"Error loading prediction models: {e}")
    return False

def predict_expenses(expense_history):
    # expect expense_history: list of {date, total_amount}
    if not expense_history:
        return {"lstm": [], "arima": []}

    df = pd.DataFrame(expense_history)
    df['date'] = pd.to_datetime(df['date'])
    df['total_amount'] = pd.to_numeric(df['total_amount'])
    
    # Aggregate by date
    daily_spend = df.groupby('date')['total_amount'].sum().reset_index()
    daily_spend = daily_spend.sort_values('date')
    
    # Fill missing dates with 0
    if not daily_spend.empty:
        all_dates = pd.date_range(start=daily_spend['date'].min(), end=daily_spend['date'].max(), freq='D')
        daily_spend = daily_spend.set_index('date').reindex(all_dates, fill_value=0).reset_index()
        daily_spend.columns = ['date', 'amount']
    else:
        return {"lstm": [], "arima": []}
    
    values = daily_spend['amount'].values

    # --- ARIMA Prediction ---
    arima_results = []
    try:
        if len(values) >= 7: # Need some data for ARIMA
            model = ARIMA(values, order=(5, 1, 0))
            model_fit = model.fit()
            forecast = model_fit.forecast(steps=30)
            
            last_date = daily_spend['date'].max()
            for i, val in enumerate(forecast):
                pred_date = (last_date + timedelta(days=i+1)).strftime('%Y-%m-%d')
                arima_results.append({"predicted_date": pred_date, "predicted_amount": float(max(0, val))})
    except Exception as e:
        print(f"ARIMA Prediction error: {e}")

    # --- LSTM Prediction ---
    lstm_results = []
    try:
        if _lstm_model is None:
            load_prediction_models()

        if _lstm_model and _scaler:
            window_size = _config.get('window_size', 30) if _config else 30
            
            # Prepare data
            scaled_data = _scaler.transform(values.reshape(-1, 1))
            
            # Use last window_size days
            if len(scaled_data) < window_size:
                # Pad with mean if not enough data
                mean_val = np.mean(scaled_data) if len(scaled_data) > 0 else 0
                padding = np.full((window_size - len(scaled_data), 1), mean_val)
                current_batch = np.vstack([padding, scaled_data])
            else:
                current_batch = scaled_data[-window_size:]

            current_batch = current_batch.reshape(1, window_size, 1)
            last_date = daily_spend['date'].max()
            
            import tensorflow as tf
            # Convert to tensor once to avoid overhead in the loop
            current_batch = tf.convert_to_tensor(current_batch, dtype=tf.float32)

            # Iterative prediction for 30 days
            for i in range(30):
                # Use direct call instead of .predict() for massive speedup in small iterative loops
                pred_scaled_tensor = _lstm_model(current_batch, training=False)
                pred_scaled = float(pred_scaled_tensor[0][0])
                
                pred_val = _scaler.inverse_transform([[pred_scaled]])[0][0]
                
                pred_date = (last_date + timedelta(days=i+1)).strftime('%Y-%m-%d')
                lstm_results.append({"predicted_date": pred_date, "predicted_amount": float(max(0, pred_val))})
                
                # Update batch efficiently
                new_val = tf.constant([[[pred_scaled]]], dtype=tf.float32)
                current_batch = tf.concat([current_batch[:, 1:, :], new_val], axis=1)
    except Exception as e:
        print(f"LSTM Prediction error: {e}")

    return {"lstm": lstm_results, "arima": arima_results}
