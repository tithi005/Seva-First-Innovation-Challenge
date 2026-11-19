# Amogh Rail 🚆

**Intelligent Railway Delay Prediction & Dispatch Optimization System**

Amogh Rail is a comprehensive ML-powered dashboard and inference system designed to predict and manage train delays on the Howrah-Burdwan line. The system utilizes machine learning models to forecast delays and constraint programming to optimize single-track train dispatching, ultimately saving time and reducing bottlenecks across the railway network.

## ✨ Features

- **Delay Prediction Engine**: A two-stage ML pipeline featuring a `RandomForestClassifier` and a `HistGradientBoostingRegressor` to predict delay probability and magnitude based on weather, congestion, and upstream delays.
- **Dispatch Optimization**: Uses Google OR-Tools CP-SAT to calculate the optimal train schedule, minimizing priority-weighted wait times compared to standard FIFO (First-In-First-Out) dispatching.
- **Interactive Dashboard**: A React-based web interface built with Vite, Tailwind CSS, and ECharts for visualizing network traffic, delays, and schedule efficiency.
- **AMOGH AI Assistant**: An AI-powered Station Master (via NVIDIA Nemotron 3.5 Super 120B) capable of answering complex queries about the Howrah-Burdwan network and providing actionable insights.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, TypeScript, ECharts
- **Backend**: FastAPI, Python
- **Machine Learning**: Scikit-Learn, Pandas, Joblib
- **Optimization**: OR-Tools (CP-SAT), SimPy
- **AI/LLM**: OpenAI SDK (NVIDIA API Integration)

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Python](https://www.python.org/) 3.9+

### Backend Setup

1. Open a terminal and navigate to the root directory, then into the `api` folder (or run commands from root pointing to `api`):
   ```bash
   cd api
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   pip install ortools simpy  # Required for the optimization engine
   ```

3. Set up your environment variables in the `.env` file (`api/.env`). Copy the template:
   ```bash
   cp api/.env.example api/.env
   ```
   ```env
   NVIDIA_API_KEY=your_api_key_here
   NVIDIA_MODEL=nvidia/nemotron-3.5-super-vl-120b-a12b
   NVIDIA_TIMEOUT=30
   ```
   `api/.env` is git-ignored — never commit a real key.
   `NVIDIA_MODEL` is optional (that is the default). Reasoning/thinking is disabled in
   `_complete()` for low-latency replies; any other NIM chat model can be swapped in here.

4. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   The API will be accessible at `http://localhost:8000`.

### Frontend Setup

1. Open a new terminal from the project root directory and install npm dependencies:
   ```bash
   npm install
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend will be accessible at the localhost port provided by Vite (usually `http://localhost:5173`).

### UI design system

Dashboard, ML Inference, Analytics and Optimization share one "dispatcher signal board"
vocabulary, built from `src/components/dashboard/`:

- `Panel.tsx` — hairline instrument panel (the structural unit; no shadows, no rounded corners)
- `KpiRail.tsx` — divided metric rail with an optional calibrated meter and threshold tick
- `PageHeader.tsx` — eyebrow, title, hairline rule and the right-hand action cluster
- `theme.ts` — shared class tokens (`PAGE`, `FIELD`, `THEAD`, `TROW`, `tag()`), so hairlines,
  type scale and status chips stay identical across pages

Dark mode is a real theme, not an inversion: `#0C1424` panels on a `#0F172A` field with
signal amber/green accents and tabular JetBrains Mono figures.

## 📊 ML Models & Data Insights

The delay prediction relies on a real-structure dataset from the Howrah-Burdwan corridor (50,000 journeys). 
- **Classifier**: Predicts whether a train will be delayed > 10 min (87.17% accuracy).
- **Regressor**: Predicts the exact delay magnitude (MAE: 1.59 mins, R²: 0.878).
- **Key Delay Factors**: Weather conditions (31.8%), upstream delay (24.4%), and section congestion (15.6%) are the most significant factors causing delays.
