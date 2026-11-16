# SAgriVision AI

SAgriVision AI is a modular agriculture platform that brings crop, seed, disease, yield, and agricultural-assistant features together behind a single web application.

The project currently uses a multi-service development workflow. The main Node.js orchestrator starts the frontend, gateway backend, and supporting ML services with one command.

## Features

- User registration and login
- Email OTP verification and password reset
- Seed identification from uploaded images
- Plant disease detection with leaf validation and confidence reporting
- Crop recommendation based on soil, season, climate, and category
- CropGPT agricultural assistant with report generation
- Yield prediction, comparison, history, crop information, soil information, and resources
- Prediction history stored and displayed per user
- English/Hindi interfaces in supported modules

## Modules

### Authentication

Authentication is implemented in the main SAgriVision Node.js backend and static frontend pages.

- Frontend: `frontend/login.html`, `frontend/login.js`, `frontend/forgot.html`, `frontend/forgot.js`
- Backend: `backend/src/index.js`
- Database access: `backend/src/database/db.js`
- Email delivery: Nodemailer with SMTP configuration
- User and OTP data: MongoDB

The existing backend provides registration, email OTP verification, login, password reset, session tokens, and authenticated API access.

### Seed Identification

Seed Identification uses the SAgriVision static frontend, a Node.js backend adapter, and a Python TensorFlow inference worker.

- Frontend: `frontend/seed-analysis.htm`, `frontend/seed-analysis.js`
- Backend adapter: `backend/src/services/seedTypeInference.js`
- Python inference script: `backend/src/inference/seed_type_predict.py`
- Model: `backend/models/seed_type/model/seed_type4.2_mobilenetv2.h5`
- Seed image assets: `frontend/assets/`

The backend keeps the model worker warm and records seed analyses in MongoDB.

### Disease Detection

Disease Detection uses Flask for its model service. The integrated service is located at `disease-detection-service/`.

- Flask entry point: `disease-detection-service/app.py`
- Predictor: `disease-detection-service/predictor.py`
- Image preprocessing: `disease-detection-service/image_preprocessing.py`
- Wikipedia enrichment: `disease-detection-service/wiki.py`
- Original interface assets: `disease-detection-service/templates/` and `disease-detection-service/static/`
- Integrated SAgriVision page: `frontend/disease-detection.html`
- Integrated page assets: `frontend/disease-detection.css`, `frontend/disease-detection.js`
- Models: `disease-detection-service/models/`

The Flask service listens internally on port `5055`. Browser requests go through authenticated SAgriVision backend routes rather than directly to the Flask service.

The original disease inference flow is preserved: image quality checks, leaf validation, crop grouping, disease classification, confidence thresholds, healthy/uncertain/non-leaf results, descriptions, and Wikipedia enrichment.

### CropGPT

CropGPT has a React/Vite frontend and a separate backend service. The SAgriVision frontend serves the built CropGPT application under `/cropgpt/`.

- Frontend source: `frontend/cropgpt-app/`
- Frontend build output: `frontend/cropgpt-dist/`
- Vite configuration: `frontend/cropgpt-app/vite.config.js`
- SAgriVision static routing: `frontend/server.mjs`
- SAgriVision backend proxy routes: `/api/cropgpt/chat` and `/api/cropgpt/reports/pdf`
- Backend service location used by the orchestrator: `D:/CropGpt`

The CropGPT frontend uses React, Vite, and `lucide-react`. Its backend is started with Uvicorn from the existing CropGPT project and is kept outside the SAgriVision source tree.

### Yield Prediction

Yield Prediction uses Flask for its backend service.

- Flask entry point: `crop-advisor-service/run.py`
- Flask application package: `crop-advisor-service/app/`
- ML code: `crop-advisor-service/ml/`
- Model: `crop-advisor-service/models/yield_model.joblib`
- Data: `crop-advisor-service/data/crop_yield.csv`
- Reports and metrics: `crop-advisor-service/reports/`
- Frontend page: `frontend/yield-prediction.html`
- Frontend assets: `frontend/yield-prediction-assets/`

The Flask service listens internally on port `5000`. The main SAgriVision backend proxies approved Yield Prediction API routes under `/api/yield-prediction`.

### Crop Recommendation

Crop Recommendation consists of a React/Vite frontend, an Express backend implementation, and a separate FastAPI ML API.

- Frontend source: `crop-recommendation-module/frontend/`
- Integrated frontend build served by SAgriVision: `frontend/crop-recommendation/`
- Backend implementation: `crop-recommendation-module/backend/server.js`
- ML API: `crop-recommendation-module/ml-api/ml/ml_api.py`
- ML code: `crop-recommendation-module/ml-api/ml/`
- Dataset and checks: `crop-recommendation-module/ml-api/data/`

The main development orchestrator starts the Crop Recommendation ML API on port `8001`. The main SAgriVision backend forwards authenticated recommendation and climate requests to that service.

## Actual Project Structure

```text
SAgriVision AI/
├── backend/
│   ├── models/                 Seed model files
│   ├── src/
│   │   ├── database/            MongoDB access
│   │   ├── inference/           Python inference scripts
│   │   ├── models/              Backend model adapters
│   │   └── services/            Seed and disease service integrations
│   ├── .env.example
│   ├── package.json
│   └── requirements.txt
├── crop-advisor-service/        Flask Yield Prediction service
│   ├── app/
│   ├── data/
│   ├── ml/
│   ├── models/
│   ├── reports/
│   ├── config.py
│   ├── requirements.txt
│   └── run.py
├── crop-recommendation-module/
│   ├── backend/                 Express implementation
│   ├── frontend/                React/Vite source
│   └── ml-api/                  FastAPI ML service
├── disease-detection-service/   Flask Disease Detection service
│   ├── models/
│   ├── static/
│   ├── templates/
│   ├── app.py
│   ├── predictor.py
│   └── requirements.txt
├── frontend/
│   ├── crop-recommendation/     Served Crop Recommendation build
│   ├── cropgpt-app/             CropGPT React/Vite source
│   ├── cropgpt-dist/            CropGPT build output
│   ├── yield-prediction-assets/
│   ├── dashboard.html
│   ├── disease-detection.html
│   ├── login.html
│   ├── prediction-history.html
│   ├── server.mjs
│   └── yield-prediction.html
├── scripts/
│   └── dev.mjs                  Development service orchestrator
├── backend.venv/                Existing local Python environment
├── package.json
├── package-lock.json
└── .gitignore
```

The project intentionally retains module-specific source locations because the existing startup scripts, relative imports, build output paths, and asset URLs depend on them.

## Prerequisites

- Windows development environment
- Node.js 18 or newer
- npm
- Python environments with the dependencies required by each Python service
- MongoDB instance accessible through `MONGODB_URI`
- SMTP provider configuration if registration or password-reset email delivery is required
- Existing CropGPT project at `D:/CropGpt` for the orchestrated CropGPT backend
- Existing Crop Advisor Python environment configured for the Yield Prediction service
- Existing Crop Recommendation ML API Python environment

The exact Python requirements are listed in:

- `disease-detection-service/requirements.txt`
- `crop-advisor-service/requirements.txt`
- `crop-recommendation-module/ml-api/requirements.txt`
- `backend/requirements.txt`

## Environment Configuration

Do not commit real credentials. Use the existing environment-file mechanism and keep secret values local.

The backend template is [`backend/.env.example`](backend/.env.example). The backend is started with `.env.development` by the development orchestrator.

Common configuration names include:

```text
MONGODB_URI
MONGODB_DB
PORT
FRONTEND_ORIGIN
ML_API_URL
PYTHON_BIN
DISEASE_API_URL
DISEASE_PYTHON_BIN
DISEASE_TIMEOUT_MS
CROPGPT_API_URL
CROPGPT_TIMEOUT_MS
CROP_ADVISOR_API_URL
CROP_ADVISOR_API_KEY
CROP_ADVISOR_TIMEOUT_MS
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASS
FROM_EMAIL
```

Use local values appropriate for the environment. Never place passwords, SMTP credentials, API keys, or MongoDB connection strings in frontend files, committed files, or browser-visible code.

## Installation

Install dependencies only when setting up a new environment and use the package manifests already present in the project.

Node.js package manifests are located in:

- `backend/package.json`
- `frontend/package.json`
- `frontend/cropgpt-app/package.json`
- `crop-recommendation-module/backend/package.json`
- `crop-recommendation-module/frontend/package.json`

Python dependencies are listed in the requirement files referenced above. Do not retrain models as part of normal application setup.

## Startup

From the project root:

```powershell
cd "E:\SAgriVision AI"
npm run dev
```

The root `package.json` delegates to `scripts/dev.mjs`.

The development workflow performs these operations in order:

1. Builds the integrated CropGPT frontend.
2. Starts or reuses the Crop Recommendation ML API on `8001`.
3. Starts or reuses the CropGPT backend on `8002`.
4. Starts or reuses the Yield Prediction Flask service on `5000`.
5. Starts or reuses the Disease Detection Flask service on `5055`.
6. Starts or reuses the SAgriVision Node.js backend on `3000`.
7. Starts or reuses the SAgriVision static frontend on `4173`.

Open the frontend at:

```text
http://localhost:4173
```

The main SAgriVision backend is available internally at:

```text
http://localhost:3000
```

The orchestrator checks service health, avoids duplicate services, detects occupied ports, and shuts down child processes that it started.

## Important Service URLs

| Service | Default address | Role |
|---|---:|---|
| SAgriVision frontend | `http://localhost:4173` | Static web application |
| SAgriVision backend | `http://localhost:3000` | Authentication, gateway APIs, MongoDB access |
| Crop Recommendation ML API | `http://127.0.0.1:8001` | Recommendation and climate inference |
| CropGPT backend | `http://127.0.0.1:8002` | CropGPT chat and reports |
| Yield Prediction Flask service | `http://127.0.0.1:5000` | Yield APIs and agricultural resources |
| Disease Detection Flask service | `http://127.0.0.1:5055` | Leaf and disease inference |

Internal services should not be exposed publicly without appropriate authentication and network controls.

## Git Workflow

Review changes before committing:

```powershell
git status
git diff
```

Create a focused branch for a change:

```powershell
git switch -c codex/<short-description>
```

Stage only intended files, create a descriptive commit, and push the branch through the project’s normal review process:

```powershell
git add <files>
git commit -m "Describe the change"
git push -u origin codex/<short-description>
```

Do not commit `.env` files, credentials, generated secrets, virtual environments, or large local artifacts. Review `.gitignore` before staging files.

## Security Notes

- Keep `.env`, `.env.local`, and `.env.development` files outside version control.
- Keep SMTP passwords, MongoDB URIs, API keys, JWT/session secrets, and provider credentials backend-only.
- Do not embed secrets in HTML, CSS, JavaScript, React source, or built frontend assets.
- Keep internal ML and Flask services bound to loopback unless protected by an authenticated gateway.
- Do not expose model files or training data through the static frontend server.
- Use HTTPS, secure cookies, restricted CORS, and production-grade WSGI/ASGI servers when deploying outside local development.
- Treat model confidence as an inference score, not a guaranteed diagnosis or agronomic recommendation.

## Project Integrity

The existing module implementations, APIs, database collections, model files, startup orchestration, and original D-drive projects are preserved. This README documents the current layout and workflow; it does not replace or redesign any module.
