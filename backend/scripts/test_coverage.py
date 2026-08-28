from __future__ import annotations

import sys
from pathlib import Path

import pytest


def main() -> int:
    backend_root = Path(__file__).resolve().parent.parent
    sys.path.insert(0, str(backend_root))

    args = [
        "--cov=app",
        "--cov-report=term-missing",
        "--cov-report=html:htmlcov",
        "--cov-report=xml",
    ]
    args.extend(sys.argv[1:])
    return pytest.main(args)


if __name__ == "__main__":
    raise SystemExit(main())
