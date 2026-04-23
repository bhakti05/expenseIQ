import sys
import os

libs = [
    'flask', 'flask_cors', 'cv2', 'pytesseract', 'sklearn', 
    'tensorflow', 'pandas', 'numpy', 'statsmodels', 'joblib', 'PIL', 'supabase'
]

print(f"Python Executable: {sys.executable}")
print(f"Python Version: {sys.version}")
print("-" * 30)

for lib in libs:
    try:
        if lib == 'sklearn':
            import sklearn
            print(f"SUCCESS {lib}: {sklearn.__version__}")
        elif lib == 'cv2':
            import cv2
            print(f"SUCCESS {lib}: {cv2.__version__}")
        elif lib == 'PIL':
            from PIL import Image
            print(f"SUCCESS {lib}: Loaded")
        else:
            import importlib
            module = importlib.import_module(lib)
            version = getattr(module, '__version__', 'Loaded')
            print(f"SUCCESS {lib}: {version}")
    except ImportError as e:
        print(f"FAIL {lib}: Not Found ({e})")
    except Exception as e:
        print(f"ERROR {lib}: Error loading ({e})")
