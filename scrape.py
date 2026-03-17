import os
import pandas as pd

DATA_DIR = "data"
RAW_FILE = os.path.join(DATA_DIR, "raw_catalog.csv")

def ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)

def run_demo_scrape():
    ensure_data_dir()

    rows = [
        {
            "title": "The Chosen",
            "source": "Angel Studios",
            "type": "Series",
            "genre": "Drama, Faith",
            "description": "A faith-based series about the life of Jesus and the people who knew Him.",
            "url": "https://www.angel.com/watch/the-chosen"
        },
        {
            "title": "Jesus Revolution",
            "source": "Lionsgate",
            "type": "Movie",
            "genre": "Drama, Faith",
            "description": "A film inspired by the Jesus movement of the 1970s.",
            "url": "https://www.lionsgate.com/"
        },
        {
            "title": "The Ten Commandments",
            "source": "Catalog",
            "type": "Movie",
            "genre": "Drama, Epic, Faith",
            "description": "A classic biblical epic following the life of Moses.",
            "url": "https://www.justwatch.com/"
        },
        {
            "title": "I Can Only Imagine",
            "source": "Lionsgate",
            "type": "Movie",
            "genre": "Drama, Music, Faith",
            "description": "The story behind the beloved Christian song.",
            "url": "https://www.lionsgate.com/"
        },
        {
            "title": "American Gospel",
            "source": "Documentary",
            "type": "Documentary",
            "genre": "Faith, Documentary",
            "description": "A documentary exploring Christian teachings and doctrine.",
            "url": "https://www.justwatch.com/"
        }
    ]

    df = pd.DataFrame(rows)
    df.to_csv(RAW_FILE, index=False)
    return rows