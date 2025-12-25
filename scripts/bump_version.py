import sys
from pathlib import Path
import re

version = sys.argv[1]

root = Path(__file__).resolve().parent.parent
src_dir = root / "src"

# tìm package Python đầu tiên trong src/
packages = [p for p in src_dir.iterdir() if p.is_dir()]

if not packages:
    raise RuntimeError("No Python package found in src/")

package_dir = packages[0]

files = [
    root / "pyproject.toml",
    package_dir / "__init__.py",
    root / "frontend" / "package.json",
]

for file in files:
    if not file.exists():
        print(f"⚠️ Skip missing file: {file}")
        continue

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

print(f"✅ Version bumped to {version}")
