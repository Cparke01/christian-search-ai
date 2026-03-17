import os
import pandas as pd

DATA_DIR = "data"
RAW_FILE = os.path.join(DATA_DIR, "raw_catalog.csv")
NORMALIZED_FILE = os.path.join(DATA_DIR, "normalized_catalog.csv")

def normalize_text(value):
    if not isinstance(value, str):
        return ""
    return " ".join(value.strip().split())

def normalize_catalog():
    if not os.path.exists(RAW_FILE):
        return []

    df = pd.read_csv(RAW_FILE).fillna("")

    for col in ["title", "source", "type", "genre", "description", "url"]:
        if col in df.columns:
            df[col] = df[col].apply(normalize_text)

    df["search_blob"] = (
        df["title"] + " " +
        df["source"] + " " +
        df["type"] + " " +
        df["genre"] + " " +
        df["description"]
    ).str.lower()

    df.to_csv(NORMALIZED_FILE, index=False)
    return df.to_dict(orient="records")

def load_catalog():
    if os.path.exists(NORMALIZED_FILE):
        df = pd.read_csv(NORMALIZED_FILE).fillna("")
        return df.to_dict(orient="records")

    return normalize_catalog()