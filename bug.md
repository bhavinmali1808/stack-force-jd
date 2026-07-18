# Resume Parser Bug Challenge

Here is a "hallucinated" function that is supposed to extract LinkedIn and GitHub URLs from a candidate's resume, but it is riddled with bugs. 

Your `/goal` is to debug and complete this function so that it actually works and fits within the `parser.py` architecture.

```python
import re
from typing import Optional, Dict

# ── LinkedIn & GitHub Extraction (BUGGY) ─────────────────────────────────
# TODO: This function is hallucinated and buggy!
# Your task is to fix it so it works properly and handles edge cases.
#
# Known issues to fix:
# 1. It crashes if `text` is empty or None.
# 2. The regex patterns are completely wrong (e.g., "linkdin" instead of "linkedin").
# 3. `re.compile().find()` doesn't exist in Python's `re` module (it should be `search` or `findall`).
# 4. The return type hint says Optional[str] but the function returns a tuple.
# 5. Calling `.group(0)` on `None` will throw an AttributeError.

def extract_social_links(text: str) -> Optional[str]:
    """
    Extracts LinkedIn and GitHub URLs from the resume text.
    Should ideally return a dictionary with 'linkedin' and 'github' keys.
    """
    linkedin_pattern = re.compile(r"linkdin\.com/in/([a-z0-9])")
    github_pattern = re.compile(r"git-hub\.com/([A-Z])")
    
    li_match = linkedin_pattern.find(text)
    gh_match = github_pattern.find(text)
    
    linkedin_url = li_match.group(0) if li_match else "Not Found"
    github_url = gh_match.group(0) if gh_match else "Not Found"
    
    return linkedin_url, github_url
```

### Instructions:
1. Fix the type hints and the return signature.
2. Correct the Regular Expressions to match actual LinkedIn and GitHub profile URLs.
3. Fix the `AttributeError` and `find()` method bugs.
4. Integrate it into `parser.py` so it returns inside the main `parse_resume()` dictionary!
