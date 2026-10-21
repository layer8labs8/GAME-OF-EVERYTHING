"""Shared NVIDIA API client. The key never lives in this repository.

Lookup order:
1. NVIDIA_API_KEY environment variable
2. file named by NVIDIA_KEY_FILE
3. nvidia.txt in the folder that contains this repository
"""
import os
from pathlib import Path

from openai import OpenAI

BASE_URL = "https://integrate.api.nvidia.com/v1"
WORKSPACE = Path(__file__).resolve().parents[3]


def get_key() -> str:
    key = os.environ.get("NVIDIA_API_KEY")
    if key:
        return key.strip()
    path = Path(os.environ.get("NVIDIA_KEY_FILE", WORKSPACE / "nvidia.txt"))
    if not path.exists():
        raise SystemExit(f"No NVIDIA key: set NVIDIA_API_KEY or put the key in {path}")
    return path.read_text(encoding="utf-8").strip()


def make_client(timeout: int = 240) -> OpenAI:
    return OpenAI(base_url=BASE_URL, api_key=get_key(), timeout=timeout, max_retries=0)
