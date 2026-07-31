@echo off
cd /d c:\Users\Admin\.gemini\antigravity-ide\scratch\stack-force-jd
git add -A
git commit -m "feat: configure two-tier sender architecture (no-reply@ for broadcasts/OTPs, teams@ for support/replies)"
git push origin main
echo Email address configuration committed and pushed.
