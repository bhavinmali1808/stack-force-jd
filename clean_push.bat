@echo off
cd /d c:\Users\Admin\.gemini\antigravity-ide\scratch\stack-force-jd
git add -A
git commit -m "chore: remove legacy emailer folder and fix BullMQ queue name format"
git push origin main
echo Cleaned legacy emailer and pushed updates.
