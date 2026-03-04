# Repository Health Check

## What was wrong

This repository was initialized with only `.gitkeep`, so automation had no meaningful source code to process. That can cause pipelines or agent workflows to report success without validating anything substantive.

## Fix

Added `scripts/validate_repo.py` to fail fast when a repository contains only placeholder files.

## Run

```bash
python3 scripts/validate_repo.py
```
