def parse_depth(level_text: str) -> int:
    normalized = str(level_text).strip()
    if normalized == "0":
        return 0
    return normalized.count(".")
