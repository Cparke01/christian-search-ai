from fastapi import FastAPI, Query
from search import search_titles
from scrape import run_demo_scrape
from normalize import load_catalog

app = FastAPI(title="ClearStream Phase 2 API")

@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "ClearStream Phase 2 backend is live"
    }

@app.get("/health")
def health():
    return {"healthy": True}

@app.get("/refresh")
def refresh_catalog():
    rows = run_demo_scrape()
    return {
        "status": "refreshed",
        "items_loaded": len(rows)
    }

@app.get("/catalog")
def catalog():
    rows = load_catalog()
    return {
        "count": len(rows),
        "items": rows[:20]
    }

@app.get("/search")
def search(q: str = Query(..., min_length=1)):
    results = search_titles(q)
    return {
        "query": q,
        "count": len(results),
        "results": results
    }