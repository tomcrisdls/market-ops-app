#!/bin/bash
eval "$(/opt/homebrew/bin/brew shellenv zsh)"
cd "/Users/cristhoferdelossantos/Library/Mobile Documents/com~apple~CloudDocs/market-ops-app"
git add .
git commit -m "update $(date '+%Y-%m-%d %H:%M')"
git push
echo ""
echo "✅ Deployed! Live at https://market-ops-app.vercel.app/"
