import cv2
import numpy as np

def preprocess_image(image_path):
    # 1. Read image with OpenCV
    img = cv2.imread(image_path)
    if img is None:
        return None

    # 2. Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Detect if the image is mostly dark (dark mode)
    is_dark = np.mean(gray) < 127

    # 3. Apply Otsu's thresholding
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Ensure text is black and background is white
    if np.mean(thresh) < 127:
        thresh = cv2.bitwise_not(thresh)

    # 4. Apply 3x3 median blur (noise reduction)
    blurred = cv2.medianBlur(thresh, 3)

    # 5. Detect skew angle and correct it
    # Find coordinates of the dark text (pixel values < 127) on the white background
    coords = np.column_stack(np.where(blurred < 127))
    if len(coords) == 0:
        return blurred
        
    angle = cv2.minAreaRect(coords)[-1]
    
    # Correct angle logic
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle
        
    (h, w) = blurred.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(blurred, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

    # 6. Return preprocessed image
    return rotated
