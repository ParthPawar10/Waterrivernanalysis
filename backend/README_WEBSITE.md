This workspace addition provides a minimal FastAPI backend and a React static frontend you can build and host on Netlify.

Structure
- `backend/main.py` - FastAPI app that loads the existing `model_export.json` from the mobile app and exposes `/encoders` and `/predict`.
- `web/` - React single-page app (CRA-style) that calls the backend API and shows predictions. Build output (`web/build`) is a static site suitable for Netlify.

Quick run (local)
1. Backend: from repository root run (use Python 3.9+ and install fastapi and uvicorn):

   python -m pip install fastapi uvicorn
   python -m uvicorn backend.main:app --reload

2. Frontend (dev):
   cd web
   npm install
   npm start

Build for Netlify
1. cd web
2. npm run build
3. Deploy the contents of `web/build` to Netlify as a static site. Set an environment variable `REACT_APP_API_BASE` in Netlify to point to your backend URL (e.g., `https://your-backend.example.com`).

Notes
- The backend reads the model file located at `WaterQualityApp/src/data/model_export.json` so keep that path intact.
- For simple demos you can run the FastAPI backend on a small server (Heroku, Fly, Railway) and point `REACT_APP_API_BASE` to it when deploying the React site to Netlify.
