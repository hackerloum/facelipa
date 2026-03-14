"""Face embedding utilities - cosine similarity, parsing."""
import numpy as np


def parse_embedding(val: list | str) -> list[float]:
    """Parse embedding from DB (string or array) to list of floats."""
    if isinstance(val, list):
        return [float(x) for x in val]
    if isinstance(val, str):
        s = val.strip("[]").strip()
        return [float(x) for x in s.split(",")] if s else []
    return []


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Cosine similarity between two 128-d vectors."""
    if len(a) != 128 or len(b) != 128:
        return 0.0
    arr_a = np.array(a, dtype=np.float64)
    arr_b = np.array(b, dtype=np.float64)
    dot = np.dot(arr_a, arr_b)
    na = np.linalg.norm(arr_a)
    nb = np.linalg.norm(arr_b)
    if na == 0 or nb == 0:
        return 0.0
    return float(dot / (na * nb))
