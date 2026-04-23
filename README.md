# ExpenseIQ — Intelligent Financial Management System 💼

ExpenseIQ is a high-performance, AI-powered expense tracking and forecasting application. It leverages Tesseract OCR for receipt scanning, Machine Learning for predictive analysis, and Groq's LLaMA3 for automated financial advisory.

## 🚀 Key Features

- **AI Receipt Scanning**: Instant extraction of vendor, amount, date, and category from images.
- **Predictive Forecasting**: LSTM and ARIMA models to simulate your future spending habits.
- **Autonomous Financial Advisor**: Real-time insights and budget recommendations powered by LLaMA3.
- **Interactive Analytics**: High-density data visualizations for deep spending audits.
- **Budget Governance**: Category-level threshold management with real-time overrun alerts.
- **Operative Portal**: Secure authentication and identity management via Supabase.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Lucide React, Recharts.
- **Backend**: Flask (Python), OpenCV, Pytesseract, TensorFlow, Scikit-learn.
- **Infrastructure**: Supabase (PostgreSQL + Auth), Groq API (LLaMA3).

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.9 or higher)
- **Tesseract OCR**: 
  - **Windows**: Install via [UB-Mannheim](https://github.com/UB-Mannheim/tesseract/wiki) and add to PATH.
  - **Linux**: `sudo apt install tesseract-ocr`
  - **Mac**: `brew install tesseract`

## ⚙️ Installation & Setup

### 1. Database Configuration (Supabase)
1. Create a new Supabase project.
2. Run the following SQL in the SQL Editor to initialize tables:
```sql
-- Expenses Table
CREATE TABLE expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  vendor_name TEXT,
  total_amount NUMERIC,
  category TEXT,
  payment_mode TEXT,
  date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budgets Table
CREATE TABLE budgets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  category TEXT,
  limit_amount NUMERIC,
  month TEXT, -- Format: YYYY-MM
  UNIQUE(user_id, category, month)
);
```

### 2. Frontend Setup
```bash
cd frontend
npm install
```
Create a `.env` in the `frontend` directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
VITE_GROQ_API_KEY=your_groq_key
```

### 3. Backend Setup
```bash
cd backend
pip install -r requirements.txt
```
Create a `.env` in the `backend` directory:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

## 🏃 Execution

1. **Start Backend**: `cd backend && python app.py` (Runs on port 5000)
2. **Start Frontend**: `cd frontend && npm run dev` (Runs on port 5173)

## 📁 Project Structure

```
├── backend/
│   ├── ml/              # Computer Vision & ML Models
│   ├── app.py           # Flask API Entry
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/  # Atomic UI Units
│   │   ├── context/     # Auth & State
│   │   ├── lib/         # API & Supabase Clients
│   │   └── pages/       # Feature Containers
│   └── tailwind.config.js
└── README.md
```

## 🛡️ License
Distributed under the MIT License. See `LICENSE` for more information.
