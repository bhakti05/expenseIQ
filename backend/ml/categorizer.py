import joblib
import os
import re

# Resolve paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'svm_model.pkl')
VECTORizer_PATH = os.path.join(BASE_DIR, 'models', 'tfidf_vectorizer.pkl')
LE_PATH = os.path.join(BASE_DIR, 'models', 'label_encoder.pkl')

# Global variables to cache models
_svm_model = None
_vectorizer = None
_label_encoder = None

def load_models():
    global _svm_model, _vectorizer, _label_encoder
    try:
        if os.path.exists(MODEL_PATH) and os.path.exists(VECTORizer_PATH) and os.path.exists(LE_PATH):
            _svm_model = joblib.load(MODEL_PATH)
            _vectorizer = joblib.load(VECTORizer_PATH)
            _label_encoder = joblib.load(LE_PATH)
            return True
    except Exception as e:
        print(f"Error loading categorization models: {e}")
    return False

def clean_text(text):
    """Clean and normalize transaction text (matches training notebook)."""
    text = str(text).lower()
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    # Basic stopwords removal
    stopwords = {'the','a','an','and','or','in','on','at','to','for','of','with','by','from','is','was'}
    words = [w for w in text.split() if w not in stopwords and len(w) > 1]
    return ' '.join(words)

# Categorization rules as fallback
RULES = {
    "Food": ["restaurant", "cafe", "pizza", "burger", "zomato", "swiggy", "food", "dining", "coffee", "bakery"],
    "Travel": ["uber", "ola", "petrol", "fuel", "flight", "irctc", "metro", "bus", "taxi", "travel"],
    "Groceries": ["supermarket", "bigbasket", "grocery", "vegetables", "mart", "store", "provisions"],
    "Health": ["pharmacy", "hospital", "clinic", "medicine", "apollo", "health", "doctor", "medical"],
    "Shopping": ["amazon", "flipkart", "mall", "fashion", "clothes", "apparel", "myntra"],
    "Utilities": ["electricity", "wifi", "internet", "water", "gas", "bill", "recharge", "mobile"],
    "Entertainment": ["netflix", "movie", "cinema", "spotify", "hotstar", "gaming", "concert"]
}

def categorize_expense(vendor_name, raw_text):
    combined_text = (vendor_name + " " + raw_text).lower()
    cleaned_text = clean_text(combined_text)
    
    # Try using ML model
    if _svm_model is None:
        load_models()

    if _svm_model and _vectorizer and _label_encoder:
        try:
            vec = _vectorizer.transform([cleaned_text])
            pred_encoded = _svm_model.predict(vec)[0]
            # Handle both numeric and string predictions
            if hasattr(_label_encoder, 'inverse_transform'):
                return _label_encoder.inverse_transform([pred_encoded])[0]
            return pred_encoded
        except Exception as e:
            print(f"ML Categorization prediction failed: {e}")

    # Fallback to rules if ML fails or models not loaded
    for category, keywords in RULES.items():
        if any(keyword in combined_text for keyword in keywords):
            return category
            
    return "Other"
