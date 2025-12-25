from setuptools import setup
from setuptools.command.build_py import build_py
import subprocess
import shutil
from pathlib import Path

class BuildFrontend(build_py):
    def run(self):
        root = Path(__file__).parent
        frontend_dir = root / "frontend"
        target_dir = (
            root
            / "src"
            / "streamlit_merge_tables"
            / "streamlit_component"
            / "frontend"
        )

        if frontend_dir.exists():
            print("▶ Building frontend (React/Vite)...")

            subprocess.check_call(["npm", "install"], cwd=frontend_dir)
            subprocess.check_call(["npm", "run", "build"], cwd=frontend_dir)

            # dist_dir = frontend_dir / "dist"
            # if target_dir.exists():
            #     shutil.rmtree(target_dir)

            # shutil.copytree(dist_dir, target_dir)

        super().run()

setup(
    cmdclass={
        "build_py": BuildFrontend,
    }
)
