from pathlib import Path

from scripts.validate_repo import has_source_code


def test_detects_source_files(tmp_path: Path) -> None:
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "main.py").write_text("print('ok')\n", encoding="utf-8")

    assert has_source_code(tmp_path)


def test_ignores_placeholder_only_repositories(tmp_path: Path) -> None:
    (tmp_path / ".gitkeep").write_text("", encoding="utf-8")
    (tmp_path / "README.md").write_text("placeholder\n", encoding="utf-8")

    assert not has_source_code(tmp_path)
