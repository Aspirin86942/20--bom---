import re


LEVEL_PATTERN = re.compile(r"^\.+\d+$")


def parse_depth(level_text: object) -> int:
    normalized = str(level_text).strip()
    if normalized == "0":
        return 0
    if not LEVEL_PATTERN.fullmatch(normalized):
        raise ValueError(f"invalid bom level: {normalized}")
    return normalized.count(".")
