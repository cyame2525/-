#!/usr/bin/env python3
"""Validate repository contains actionable source code, not just placeholders."""

from __future__ import annotations

from pathlib import Path
import sys

EXCLUDE_DIRS = {".git", ".github"}
PLACEHOLDERS = {".gitkeep", ".keep", "README.md"}
SOURCE_EXTENSIONS = {".py", ".js", ".ts", ".tsx", ".jsx", ".go", ".rs", ".java", ".rb", ".php", ".c", ".cc", ".cpp", ".h", ".hpp"}


def iter_files(root: Path):
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if any(part in EXCLUDE_DIRS for part in path.parts):
            continue
        yield path


def has_source_code(root: Path) -> bool:
    for path in iter_files(root):
        if path.name in PLACEHOLDERS:
            continue
        if path.suffix in SOURCE_EXTENSIONS:
            return True
    return False


def main() -> int:
    root = Path.cwd()
    if has_source_code(root):
        print("OK: repository contains source files")
        return 0

    print(
        "ERROR: repository appears empty (only placeholders found). "
        "Add at least one source file before running automation.",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
