# Mine Intelligence Platform

AI-powered mining production intelligence platform for SIH 26023.

This repository contains a React + FastAPI application that lets users upload mining production datasets, calculate KPIs, detect anomalies, train a saved forecasting model, ask grounded questions with Groq, and generate analytical reports.

## Project Overview

- Upload CSV, XLSX, or XLS datasets.
- Clean and validate the uploaded data.
- Compute KPIs and production trends from the dataset.
- Detect anomalies with statistical methods.
- Train and save a forecast model locally.
- Ask a grounded AI assistant about the uploaded data.
- Generate a structured intelligence report and PDF export.

## Architecture

```text
React Frontend -> FastAPI Backend -> Data Engine / Forecast Engine / Anomaly Engine / Groq Assistant
```

### Frontend

- React
- Vite
- Tailwind CSS
- Recharts

### Backend

- Python
- FastAPI
- Pandas
- NumPy
- ReportLab
- Groq

## Features

- Dataset upload and session persistence
- Data quality summary
- Dynamic KPIs
- Production trend charts
- Target vs actual analysis
- Forecasting with saved model artifacts
- Statistical anomaly detection
- AI assistant with grounded responses
- Analytical report generation
- PDF export

## Folder Structure

```text
mine-intelligence-platform/
  backend/
    app/
      api/
      services/
    models/
    data/
    run.py
    train_models.py
  frontend/
    src/
      api/
      components/
      pages/
      utils/
```

## Installation

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` to the backend.

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn run:app --reload
```

You can also run:

```bash
cd backend
python run.py
```

## Environment Variables

Create a `.env` file from the examples:

```env
GROQ_API_KEY=
GROQ_MODEL=llama3-8b-8192
ASSISTANT_HISTORY_LIMIT=12

CORS_ORIGINS=http://localhost:5173
MAX_UPLOAD_MB=15

DATA_DIR=./data
UPLOAD_DIR=./data/uploads
REPORTS_DIR=./data/reports
MODELS_DIR=./models
```

Notes:

- Keep `GROQ_API_KEY` out of the frontend.
- The backend stores the forecast model in `backend/models/`.

## Model Training

Train or retrain the forecasting model with:

```bash
cd backend
python train_models.py
```

The command:

1. Loads the active uploaded dataset.
2. Cleans and aggregates the production series.
3. Evaluates candidate time-series baselines.
4. Selects the best model by validation error.
5. Saves the model artifact to `backend/models/production_forecaster.pkl`.

## API Endpoints

### Health and session

- `GET /api/health`
- `GET /api/session`
- `GET /api/filters`
- `GET /api/quality`

### Upload

- `POST /api/upload`
- `POST /api/documents/upload`
- `POST /api/demo/load`

### Analytics

- `GET /api/kpis`
- `GET /api/production`
- `GET /api/anomalies`
- `GET /api/forecast`

### AI

- `POST /api/ask`
- `GET /api/assistant/suggestions`

### Reports

- `POST /api/report`
- `GET /api/report/pdf`

### Training

- `POST /api/train-models`

## Dataset Format

At minimum, the dataset should include:

- a time field: `year` or `date`
- an actual production field: `production`, `actual`, `output`, or similar

Optional fields:

- `mine`
- `mineral`
- `state`
- `district`
- `target`
- `capacity`
- `dispatch`

Example CSV:

```csv
year,mine,mineral,state,district,production,target
2021,Mine A,Iron Ore,Odisha,Keonjhar,830,840
2022,Mine A,Iron Ore,Odisha,Keonjhar,905,880
2023,Mine A,Iron Ore,Odisha,Keonjhar,940,920
```

## Troubleshooting

- `Upload a CSV or Excel file first.` - no dataset is loaded yet.
- `Could not identify the actual production column.` - rename the production field or add an alias.
- `Could not identify a year or date column.` - add `year` or `date`.
- `Groq API key missing` - set `GROQ_API_KEY` in `.env`.
- Forecast model not training - the dataset may be too small; upload more historical rows.

## Run the Full App

1. Start the backend.
2. Start the frontend.
3. Upload a dataset from the Dashboard or Documents page.
4. Review KPIs, anomalies, and forecast output.
5. Open the AI Assistant to ask grounded questions.

