import os
import re
import sys
from datetime import datetime

import cv2
import pytesseract

try:
    from ml.preprocess import preprocess_image
except ImportError:
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from ml.preprocess import preprocess_image

TESSERACT_PATH = os.getenv("TESSERACT_CMD", r"C:\Program Files\Tesseract-OCR\tesseract.exe")
if os.path.exists(TESSERACT_PATH):
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH

VENDOR_STOPWORDS = {
    "tax",
    "invoice",
    "receipt",
    "bill",
    "cash",
    "total",
    "amount",
    "date",
    "time",
    "gst",
    "phone",
    "mob",
    "upi",
    "card",
    "qty",
    "rate",
    "item",
}


def normalize_vendor_name(line: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9&@.'()\-\/ ]+", " ", line or "")
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" -:;,.")
    return cleaned[:80] if cleaned else "Unknown Vendor"


def looks_like_vendor(line: str) -> bool:
    lowered = (line or "").strip().lower()
    if not lowered or len(lowered) < 3:
        return False
    if any(stopword in lowered for stopword in VENDOR_STOPWORDS):
        return False
    letters = re.findall(r"[A-Za-z]", lowered)
    digits = re.findall(r"\d", lowered)
    if not letters:
        return False
    return len(letters) >= max(3, len(digits))


def extract_vendor_name(lines, raw_ocr_text: str = ""):
    # Google Pay and UPI specific matches
    match = re.search(r"(?im)^(?:From|To|Paid to)[\s:]+([A-Za-z\s]+)(?:\(|$)", raw_ocr_text)
    if match:
        name = match.group(1).strip()
        if len(name) > 2:
            return name

    for line in lines[:8]:
      candidate = normalize_vendor_name(line)
      if looks_like_vendor(candidate):
          return candidate
    return normalize_vendor_name(lines[0]) if lines else "Unknown Vendor"


def normalize_amount(raw_amount: str) -> str:
    cleaned = (raw_amount or "").replace(",", "").strip()
    cleaned = re.sub(r"[^0-9.]", "", cleaned)
    if cleaned.count(".") > 1:
        first, *rest = cleaned.split(".")
        cleaned = first + "." + "".join(rest)
    try:
        value = float(cleaned)
        if value <= 0:
            return "0.00"
        return f"{value:.2f}"
    except (TypeError, ValueError):
        return "0.00"


def extract_total_amount(lines, raw_ocr_text: str, ocr_variants=None) -> str:
    # Look for Rupee symbol (₹ or Rs) first specifically
    rupee_pattern = re.compile(r'(?:₹|Rs\.?)\s*(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})?|\d+\.\d{1,2}|\d+)', re.IGNORECASE)
    rupee_matches = rupee_pattern.findall(raw_ocr_text)
    if rupee_matches:
        valid_rupees = [float(normalize_amount(m)) for m in rupee_matches if float(normalize_amount(m)) > 0]
        if valid_rupees:
            return f"{valid_rupees[0]:.2f}"

    keyword_pattern = re.compile(
        r"(grand total|net payable|total amount|total|amount|bill amt|bill amount|amt|balance due)",
        re.IGNORECASE,
    )
    amount_pattern = re.compile(r"(?<!\d)(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})|\d+\.\d{1,2}|\d+)(?!\d)")

    scored_candidates = []
    status_keywords = r'(compieted|completed|success|processing|failed|sent|paid|successful)'
    
    if ocr_variants is None:
        ocr_variants = [(raw_ocr_text, lines)]
    
    for _, var_lines in ocr_variants:
        for i, line in enumerate(var_lines):
            matches = amount_pattern.findall(line)
            if not matches:
                continue
            
            score = 1
            line_lower = line.lower()
            
            if keyword_pattern.search(line_lower):
                score += 5
            if re.search(r"subtotal|discount|cgst|sgst|tax", line_lower):
                score -= 2
                
            # Context-aware bonus for UPI/App receipts
            surrounding_text = " ".join([l.lower() for l in var_lines[max(0, i-2):min(len(var_lines), i+3)]])
            if re.search(status_keywords, surrounding_text):
                score += 20
                
            for match in matches:
                amount = normalize_amount(match)
                numeric = float(amount)
                # Restrict huge numbers
                if 0 < numeric < 1000000:
                    current_score = score
                    # Penalize lines with phone patterns, UPI words, bank info, dates, and times
                    if re.search(r'\+|•|\*|-|upi|id|bank|a/c|acct|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|am|pm', line_lower):
                        current_score -= 10
                    
                    # Bonus for lines that ONLY contain the number
                    if re.match(r'^[\s₹Rs\.£€\$?=#zZfF]*' + re.escape(match) + r'[\s]*$', line, re.IGNORECASE):
                        current_score += 5
                        
                    # Extra bonus if it looks like a typical amount format
                    if "." in match and len(match.split(".")[1]) == 2:
                        current_score += 2
                        
                    scored_candidates.append((current_score, numeric, amount))

    if scored_candidates:
        scored_candidates.sort(key=lambda item: (item[0], item[1]))
        return scored_candidates[-1][2]
        
    # Fallback to single text if all fails
    if ocr_variants:
        raw_ocr_text, lines = max(ocr_variants, key=lambda item: len(item[1]))
    raw_matches = amount_pattern.findall(raw_ocr_text)
    numeric_matches = [normalize_amount(match) for match in raw_matches]
    numeric_matches = [amount for amount in numeric_matches if 0 < float(amount) < 1000000]
    return numeric_matches[-1] if numeric_matches else "0.00"


def normalize_date(raw_date: str) -> str:
    if not raw_date:
        return ""

    # Fix common Tesseract month typos
    raw_date = raw_date.replace("Mat", "Mar").replace("Noy", "Nov").replace("Dac", "Dec")
    # Fix common number typos like 91 instead of 21
    if raw_date.startswith("91 "):
        raw_date = raw_date.replace("91 ", "21 ", 1)

    raw_date = re.sub(r',.*$', '', raw_date).strip()

    for date_format in ("%d %b %Y", "%d %B %Y", "%d/%m/%Y", "%d-%m-%Y", "%d/%m/%y", "%d-%m-%y", "%Y-%m-%d", "%Y/%m/%d"):
        try:
            return datetime.strptime(raw_date, date_format).strftime("%Y-%m-%d")
        except ValueError:
            continue
            
    # Return empty string instead of invalid date so frontend can fallback to today's date
    return ""


def extract_receipt_data(image_path):
    processed_img = preprocess_image(image_path)
    if processed_img is None:
        return {"error": "Could not process image"}

    ocr_variants = []
    for config in (r"--oem 3 --psm 6", r"--oem 3 --psm 4"):
        text = pytesseract.image_to_string(processed_img, config=config)
        cleaned_lines = [line.strip() for line in text.splitlines() if line.strip()]
        ocr_variants.append((text, cleaned_lines))

    raw_ocr_text, lines = max(ocr_variants, key=lambda item: len(item[1]))
    
    # DEBUG: Save exactly what Tesseract saw to a file so we can inspect it without guessing
    try:
        with open("ocr_debug.txt", "w", encoding="utf-8") as f:
            f.write("RAW OCR TEXT:\n")
            f.write(raw_ocr_text)
            f.write("\n\nLINES:\n")
            for line in lines:
                f.write(line + "\n")
    except Exception as e:
        print("Debug log error:", e)

    vendor_name = extract_vendor_name(lines, raw_ocr_text)
    total_amount = extract_total_amount(lines, raw_ocr_text, ocr_variants=ocr_variants)

    date_match = re.search(
        r"(\d{1,2}\s+[A-Za-z]{3,}\s+\d{4}|\d{2}[/-]\d{2}[/-]\d{2,4}|\d{4}[/-]\d{2}[/-]\d{2})",
        raw_ocr_text,
    )
    date = normalize_date(date_match.group(1)) if date_match else ""

    return {
        "vendor_name": vendor_name,
        "total_amount": total_amount,
        "date": date,
        "raw_ocr_text": raw_ocr_text,
    }
