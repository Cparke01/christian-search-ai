from normalize import load_catalog, normalize_catalog
import os

DATA_DIR = "data"
RAW_FILE = os.path.join(DATA_DIR, "raw_catalog.csv")

def search_titles(query: str):
    if not os.path.exists(RAW_FILE):
        normalize_catalog()

    rows = load_catalog()
    q = query.lower().strip()

    matches = []
    for row in rows:
        blob = str(row.get("search_blob", "")).lower()
        if q in blob:
            matches.append({
                "title": row.get("title", ""),
                "source": row.get("source", ""),
                "type": row.get("type", ""),
                "genre": row.get("genre", ""),
                "description": row.get("description", ""),
                "url": row.get("url", "")
            })

    return matches[:25]