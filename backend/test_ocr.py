import pytesseract
try:
    print("Checking Tesseract version...")
    print(pytesseract.get_tesseract_version())
    print("Tesseract found!")
except Exception as e:
    print(f"Error: {e}")
