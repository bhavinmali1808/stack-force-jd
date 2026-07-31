@echo off
cd /d c:\Users\Admin\.gemini\antigravity-ide\scratch\stack-force-jd
git add -A
git commit -m "chore: clean working tree and sync repo state"
git push origin main
echo Fully committed and pushed.
