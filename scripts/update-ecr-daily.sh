#!/bin/bash
# Daily ECR update script for The Sandlot
# Intended to be run by OpenClaw cron at 6 AM ET
set -euo pipefail

cd ~/clawd/tunnel-snakes

echo "$(date): Starting daily ECR update..."

# Step 1: Run the enrichment script (fetches FP data, updates Supabase, generates top-500 JSON)
python3 scripts/enrich-ecr-all.py

# Step 2: Check if ecr-top500.json changed and commit/push if so
if git diff --quiet src/data/ecr-top500.json 2>/dev/null; then
    echo "No ECR changes"
else
    git add src/data/ecr-top500.json scripts/ecr-summary.json
    git commit -m "Daily ECR update $(date +%Y-%m-%d)"
    git push
    echo "ECR updated and deployed"
fi

echo "$(date): Daily ECR update complete"
