"""
parser.py — Custom Python resume parser
───────────────────────────────────────────────────────────────────
No AI. Pure rule-based NLP using:
  - pdfplumber  → layout-aware PDF text extraction (handles columns)
  - python-docx → DOCX text extraction
  - regex       → email, phone, CGPA, experience years
  - skills.py   → dictionary matching for 100+ tech skills

Returns a structured dict:
{
  "name": str,
  "email": str,
  "phone": str,
  "extracted_skills": list[str],
  "years_of_experience": int | None,
  "cgpa": float | None,
  "college": str,
  "text": str,
  "sections": dict,   # detected section blocks
}
"""

import re
import os
from datetime import datetime
from typing import Optional, Dict

import pdfplumber
import docx
from flashtext import KeywordProcessor

from skills import SKILL_DICTIONARY

# Initialize PaddleOCR globally to avoid reloading model on every request
import logging
logging.getLogger("ppocr").setLevel(logging.ERROR)
try:
    from paddleocr import PaddleOCR
    import numpy as np
    from pdf2image import convert_from_path
    ocr_model = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
except Exception:
    ocr_model = None
    print("Warning: PaddleOCR disabled or dependencies missing. Fallback OCR will be skipped.")

# Initialize Flashtext for O(N) multi-keyword extraction
skill_processor = KeywordProcessor(case_sensitive=False)
skill_processor.add_keywords_from_list(SKILL_DICTIONARY)


# ── Text Extraction ────────────────────────────────────────────

def extract_text_pdf(file_path: str) -> str:
    """
    Use pdfplumber for layout-aware extraction.
    Handles multi-column PDFs much better than pdf-parse (Node.js).
    """
    lines = []
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text(x_tolerance=3, y_tolerance=3)
                if text:
                    lines.append(text)
    except Exception as e:
        raise RuntimeError(f"PDF parse error: {e}")
    return "\n".join(lines)


def extract_text_docx(file_path: str) -> str:
    """Extract text from DOCX, preserving paragraph order."""
    try:
        doc = docx.Document(file_path)
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n".join(paragraphs)
    except Exception as e:
        raise RuntimeError(f"DOCX parse error: {e}")


def extract_text_ocr(file_path: str) -> str:
    """Fallback OCR using PaddleOCR for scanned PDFs/Images."""
    if not ocr_model:
        return ""
    
    text_blocks = []
    try:
        images = convert_from_path(file_path, dpi=200)
        for img in images:
            # Convert PIL image to numpy array for PaddleOCR
            img_np = np.array(img)
            result = ocr_model.ocr(img_np, cls=True)
            if result and result[0]:
                for line in result[0]:
                    # line[1][0] contains the recognized text
                    text_blocks.append(line[1][0])
    except Exception as e:
        print(f"OCR failed: {e}")
    return "\n".join(text_blocks)


def extract_text(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        text = extract_text_pdf(file_path)
        # If extracted text is suspiciously short, fallback to OCR
        if len(text.strip()) < 100:
            ocr_text = extract_text_ocr(file_path)
            if len(ocr_text) > len(text):
                text = ocr_text
        return text
    elif ext in (".docx", ".doc"):
        return extract_text_docx(file_path)
    elif ext in (".jpg", ".jpeg", ".png"):
        # Directly OCR images
        return extract_text_ocr(file_path)
    elif ext == ".txt":
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    else:
        raise ValueError(f"Unsupported file type: {ext}")


# ── Meta Extraction ────────────────────────────────────────────

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
PHONE_RE = re.compile(r"(\+?[\d\s\-().]{10,17})")

def extract_email(text: str) -> str:
    m = EMAIL_RE.search(text)
    return m.group(0).strip() if m else ""


def extract_phone(text: str) -> str:
    m = PHONE_RE.search(text)
    if m:
        raw = m.group(0).strip()
        # only return if it has at least 10 digits
        digits = re.sub(r"\D", "", raw)
        if len(digits) >= 10:
            return raw
    return ""


def extract_name(text: str, email: str) -> str:
    """
    Heuristic: the candidate name is usually the first non-empty line
    that is not an email/phone/URL and is short (< 60 chars).
    """
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    for line in lines[:8]:  # look in top 8 lines only
        if len(line) < 4 or len(line) > 60:
            continue
        if "@" in line or "http" in line.lower():
            continue
        if re.search(r"\d{5,}", line):  # skip lines that are mostly numbers
            continue
        if email and email.split("@")[0].lower() in line.lower():
            continue
        # Skip obvious section headers
        headers = ["resume", "curriculum vitae", "cv", "objective", "summary",
                   "profile", "contact", "phone", "email", "address"]
        if any(h in line.lower() for h in headers):
            continue
        return line
    return "Unknown"


# ── CGPA Extraction ────────────────────────────────────────────

CGPA_PATTERNS = [
    re.compile(r"cgpa\s*[:\-]?\s*(\d+\.?\d*)\s*(?:/\s*\d+)?", re.I),
    re.compile(r"gpa\s*[:\-]?\s*(\d+\.?\d*)\s*(?:/\s*\d+)?", re.I),
    re.compile(r"(\d+\.?\d*)\s*/\s*10\s*cgpa", re.I),
    re.compile(r"(\d+\.?\d*)\s*/\s*10", re.I),
    re.compile(r"(\d+\.?\d*)\s*cgpa", re.I),
]

def extract_cgpa(text: str) -> Optional[float]:
    for pattern in CGPA_PATTERNS:
        m = pattern.search(text)
        if m:
            val = float(m.group(1))
            if 0 < val <= 10:
                return round(val, 1)
            if 0 < val <= 4:  # 4.0 scale → 10.0 scale
                return round((val / 4) * 10, 1)
    return None


# ── Experience Extraction ──────────────────────────────────────

YEAR_RANGE_RE = re.compile(
    r"((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(\d{4})\s*[-–—to]+\s*(present|current|now|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{4}|\d{4})",
    re.I
)
EXP_EXPLICIT_RE = re.compile(r"(\d+)\+?\s*(?:yrs|years?)\s*(?:of\s*)?(?:work\s*)?experience", re.I)
EXP_BROAD_RE = re.compile(r"(?:experience|exp)[^\w]*(\d+)\+?\s*y", re.I)

def extract_experience(text: str) -> Optional[int]:
    """Returns total months of experience."""
    # Try explicit "X years of experience" first
    m = EXP_EXPLICIT_RE.search(text) or EXP_BROAD_RE.search(text)
    if m:
        val = int(m.group(1))
        if 0 <= val <= 50:
            return val * 12

    # Try summing date ranges in the text
    current_year = datetime.now().year
    total_months = 0
    for m in YEAR_RANGE_RE.finditer(text):
        start_year = int(m.group(2))
        end_raw = m.group(3).strip().lower()
        if end_raw in ("present", "current", "now"):
            end_year = current_year
        else:
            year_match = re.search(r"\d{4}", end_raw)
            end_year = int(year_match.group()) if year_match else current_year

        if 1980 <= start_year <= current_year and start_year <= end_year <= current_year + 1:
            total_months += (end_year - start_year) * 12

    if total_months > 0:
        return min(total_months, 50 * 12)

    return None


# ── College Extraction ─────────────────────────────────────────

COLLEGE_KEYWORDS = [
    "university", "college", "institute", "iit", "nit", "bits", "iiit",
    "mit", "vit", "srm", "school of", "faculty of", "polytechnic",
    "academy", "campus",
]

def extract_college(text: str) -> str:
    lines = [l.strip() for l in text.split("\n")]
    for line in lines:
        lower = line.lower()
        if any(kw in lower for kw in COLLEGE_KEYWORDS) and 5 < len(line) < 120:
            return re.sub(r"^\W+|\W+$", "", line).strip()
    return ""


# ── Social Links Extraction ────────────────────────────────────
# Fixed version of the buggy function documented in bug.md.
# Bugs fixed:
#   1. Crashes if text is empty or None → early guard added
#   2. Typo "linkdin" → corrected to "linkedin"
#   3. Wrong domain "git-hub" → corrected to "github"
#   4. re.compile().find() does not exist → changed to .search()
#   5. Calling .group(0) on None → made safe with conditional
#   6. Return type was Optional[str] but returned a tuple → now returns Dict[str, str]

LINKEDIN_RE = re.compile(
    r"(?:https?://)?(?:www\.)?linkedin\.com/in/[a-zA-Z0-9\-_%]+",
    re.IGNORECASE,
)
GITHUB_RE = re.compile(
    r"(?:https?://)?(?:www\.)?github\.com/[a-zA-Z0-9\-_]+",
    re.IGNORECASE,
)


def extract_social_links(text: str) -> Dict[str, str]:
    """
    Extracts LinkedIn and GitHub profile URLs from the resume text.
    Returns a dictionary with 'linkedin' and 'github' keys.
    Returns empty strings if not found.
    """
    if not text:                          # Bug #1 fix: guard against empty/None
        return {"linkedin": "", "github": ""}

    li_match = LINKEDIN_RE.search(text)   # Bug #3/#4 fix: .search() not .find()
    gh_match = GITHUB_RE.search(text)     # Bug #3/#4 fix

    return {
        "linkedin": li_match.group(0) if li_match else "",  # Bug #5 fix: safe
        "github":   gh_match.group(0) if gh_match else "",  # Bug #5 fix: safe
    }                                     # Bug #6 fix: returns Dict, not tuple


# ── Skills Extraction ──────────────────────────────────────────

def extract_skills(text: str) -> list:
    """
    O(N) extraction using FlashText (Aho-Corasick algorithm).
    Handles multi-word skills and whole-word boundaries efficiently.
    """
    # Flashtext handles case-insensitivity natively since we initialized it with case_sensitive=False
    found = skill_processor.extract_keywords(text)
    return sorted(set(found))


# ── Section Detection ──────────────────────────────────────────

SECTION_HEADERS = {
    "summary": ["summary", "objective", "profile", "about", "overview"],
    "experience": ["experience", "work history", "employment", "work experience", "professional experience"],
    "education": ["education", "academic", "qualification", "degree"],
    "skills": ["skills", "technical skills", "core competencies", "technologies"],
    "projects": ["projects", "personal projects", "key projects"],
    "certifications": ["certifications", "certificates", "courses", "training"],
}

def detect_sections(text: str) -> dict:
    """
    Split resume text into named sections for richer parsing later.
    Returns dict of { section_name: section_text }
    """
    lines = text.split("\n")
    sections = {}
    current_section = "header"
    current_lines = []

    for line in lines:
        stripped = line.strip().lower()
        matched_section = None

        for section_name, keywords in SECTION_HEADERS.items():
            if any(stripped == kw or stripped.startswith(kw + ":") for kw in keywords):
                matched_section = section_name
                break

        if matched_section:
            sections[current_section] = "\n".join(current_lines).strip()
            current_section = matched_section
            current_lines = []
        else:
            current_lines.append(line)

    sections[current_section] = "\n".join(current_lines).strip()
    return sections

# ── Current Role Extraction ────────────────────────────────────

def extract_current_role(text: str) -> str:
    """Look for common job titles in the first 20 lines."""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    common_roles = [
        "software engineer", "frontend developer", "backend developer",
        "full stack developer", "data scientist", "product manager",
        "ui/ux designer", "devops engineer", "qa engineer", "system administrator",
        "business analyst", "project manager", "marketing manager", "sales representative",
        "account executive", "designer", "developer", "engineer", "manager", "architect",
        "consultant", "analyst", "director", "lead"
    ]
    for line in lines[:20]:
        lower_line = line.lower()
        if len(line) < 5 or len(line) > 60:
            continue
        for role in common_roles:
            # We want to match whole words if possible, but simple 'in' works for a heuristic
            if role in lower_line:
                return line.strip()
    return "Unknown Role"


# ── Main Parse Pipeline ────────────────────────────────────────

def parse_resume(file_path: str) -> dict:
    """
    Full resume parsing pipeline.
    Returns structured data dict.
    """
    text = extract_text(file_path)
    email = extract_email(text)
    phone = extract_phone(text)
    name = extract_name(text, email)
    skills = extract_skills(text)
    cgpa = extract_cgpa(text)
    total_exp_months = extract_experience(text)
    exp_years = total_exp_months // 12 if total_exp_months else None
    exp_months = total_exp_months % 12 if total_exp_months else None
    college = extract_college(text)
    current_role = extract_current_role(text)
    sections = detect_sections(text)
    social_links = extract_social_links(text)   # Bug fix — now integrated

    return {
        "name": name,
        "email": email,
        "phone": phone,
        "extracted_skills": skills,
        "years_of_experience": exp_years,
        "months_of_experience": exp_months,
        "cgpa": cgpa,
        "college": college,
        "current_role": current_role,
        "text": text,
        "sections": sections,
        "skill_count": len(skills),
        "linkedin": social_links["linkedin"],    # ← new field
        "github":   social_links["github"],      # ← new field
    }
