import sys
from pathlib import Path
import re

version = sys.argv[1]

files = [
    Path("pyproject.toml"),
    Path("src/streamlit_merge_tables/__init__.py"),
    Path("frontend/package.json"),
]

for file in files:
    text = file.read_text()

    text = re.sub(
        r'version\s*=\s*"[0-9]+\.[0-9]+\.[0-9]+"',
        f'version = "{version}"',
        text,
    )

    text = re.sub(
        r'"version"\s*:\s*"[0-9]+\.[0-9]+\.[0-9]+"',
        f'"version": "{version}"',
        text,
    )

    file.write_text(text)

print(f"Version bumped to {version}")

