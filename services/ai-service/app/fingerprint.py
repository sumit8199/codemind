import hashlib
from typing import Optional


def generate_finding_fingerprint(
    category: str,
    file_path: Optional[str],
    start_line: Optional[int],
    end_line: Optional[int],
    title: str,
) -> str:
    """
    Generate a stable, deterministic fingerprint hash for finding deduplication.
    Normalized by category, path, line-range, and normalized title.
    """
    norm_cat = (category or "").lower().strip()
    norm_path = (file_path or "unknown").strip().replace("\\", "/").lower()
    s_line = start_line if start_line is not None else 0
    e_line = end_line if end_line is not None else s_line
    norm_title = (title or "").lower().strip()

    raw_key = f"{norm_cat}|{norm_path}|{s_line}-{e_line}|{norm_title}"
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
