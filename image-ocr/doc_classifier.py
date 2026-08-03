import re
import logging

logger = logging.getLogger(__name__)

# 18 Document Categories Mapping
DOCUMENT_CATEGORIES = {
    "1. Identity Documents": [
        "Aadhaar Card", "e-Aadhaar PDF", "PAN Card", "Voter ID (EPIC)", "Passport", 
        "Driving License", "OCI Card", "Overseas Citizen Card", "Birth Certificate", 
        "Death Certificate", "Marriage Certificate"
    ],
    "2. Financial Documents": [
        "Cancelled Cheque", "Bank Passbook", "Bank Statement", "Salary Slip", "Form 16", 
        "ITR", "GST Registration", "GST Return", "Udyam Certificate", "MSME Certificate", 
        "TAN Certificate", "PF Statement", "ESIC Card"
    ],
    "3. Educational Documents": [
        "10th Marksheet", "12th Marksheet", "Degree Certificate", "Diploma", 
        "Migration Certificate", "Transfer Certificate", "School Leaving Certificate", 
        "Bonafide Certificate", "Character Certificate", "University Transcript", 
        "Semester Result", "Hall Ticket", "Admit Card", "ID Card"
    ],
    "4. Business Documents": [
        "Certificate of Incorporation", "Partnership Deed", "LLP Certificate", "MOA", "AOA", 
        "Shop Act License", "Trade License", "GST Certificate", "Factory License", 
        "FSSAI License", "Import Export Code", "Professional Tax", "Udyam Registration", "Labour License"
    ],
    "5. Property Documents": [
        "Sale Deed", "Lease Agreement", "Rent Agreement", "Property Tax Receipt", "Index II", 
        "Encumbrance Certificate", "Khata", "7/12 Extract", "8A", "Property Card", 
        "Mutation Entry", "NA Order", "Building Permission"
    ],
    "6. Vehicle Documents": [
        "RC Book", "Insurance", "PUC", "Fitness Certificate", "Permit", "Tax Token"
    ],
    "7. Medical Documents": [
        "Prescription", "Medical Report", "Blood Test", "X-Ray Report", "MRI Report", 
        "Vaccination Certificate", "Hospital Discharge Summary", "Medical Insurance Card"
    ],
    "8. Employment Documents": [
        "Offer Letter", "Appointment Letter", "Experience Letter", "Relieving Letter", 
        "Salary Certificate", "Employment ID"
    ],
    "9. Legal Documents": [
        "Affidavit", "Notary", "Court Order", "FIR", "Charge Sheet", "Bail Order", "Legal Notice", "Agreement"
    ],
    "10. Insurance": [
        "Health Insurance", "Motor Insurance", "Life Insurance", "Claim Form"
    ],
    "11. Tax Documents": [
        "PAN", "GST", "TDS", "Form 26AS", "AIS", "Form 16", "Challans"
    ],
    "12. Utility Bills": [
        "Electricity Bill", "Water Bill", "Gas Bill", "Mobile Bill", "Broadband Bill"
    ],
    "13. Travel Documents": [
        "Flight Ticket", "Train Ticket", "Bus Ticket", "Hotel Invoice", "Visa", "Boarding Pass"
    ],
    "14. HR Documents": [
        "Resume", "CV", "Employee ID", "Joining Form", "Exit Form"
    ],
    "15. Government Certificates": [
        "Income Certificate", "Caste Certificate", "Domicile Certificate", "EWS Certificate", 
        "Disability Certificate", "Senior Citizen Card", "Ration Card", "Ayushman Bharat Card", 
        "ABHA Card", "NREGA Job Card"
    ],
    "16. Agriculture": [
        "Soil Health Card", "Farmer ID", "PM-Kisan Registration", "Crop Insurance", "Land Records"
    ],
    "17. Police & Security": [
        "Police Verification", "Character Certificate", "Arms License", "FIR"
    ],
    "18. Miscellaneous": [
        "Invoice", "Receipt", "Purchase Order", "Delivery Challan", "Quotation", 
        "Barcode Labels", "QR Codes", "Visiting Card", "Certificates", "Membership Card", "Event Pass"
    ]
}


def classify_and_extract_fields(text: str) -> dict:
    """
    Identifies document category, specific document type, and extracts structured fields
    tailored for Indian Identity, Financial, Educational, Property, Vehicle, Medical, Utility, and other documents.
    """
    upper_text = text.upper()
    doc_category = "18. Miscellaneous"
    doc_type = "Document / Certificate"
    extracted_fields = {}

    # Common extraction utilities
    emails = list(set(re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)))
    phones = list(set(re.findall(r'\b(?:(?:\+91[\s-]?)?[6-9]\d{9})\b', text)))
    dates = list(set(re.findall(r'\b\d{2}[/-]\d{2}[/-]\d{4}\b|\b\d{4}[/-]\d{2}[/-]\d{2}\b', text)))
    pincodes = list(set(re.findall(r'\b[1-9]\d{5}\b', text)))
    amounts = list(set(re.findall(r'(?:Rs\.?|INR|₹)\s?[\d,]+(?:\.\d{2})?', text, re.IGNORECASE)))

    # 1. Identity Documents
    pan_match = re.search(r'\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b', text)
    aadhaar_match = re.search(r'\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b', text)
    epic_match = re.search(r'\b[A-Z]{3}[0-9]{7}\b', text)
    passport_match = re.search(r'\b[A-Z]{1}[0-9]{7}\b', text)
    dl_match = re.search(r'\b[A-Z]{2}[-\s]?\d{2}[-\s]?(?:19|20)\d{11}\b', text)

    if pan_match:
        doc_category = "1. Identity Documents"
        doc_type = "PAN Card"
        extracted_fields["pan_number"] = pan_match.group(0)
    elif aadhaar_match or ("GOVERNMENT OF INDIA" in upper_text and "UNIQUE IDENTIFICATION" in upper_text):
        doc_category = "1. Identity Documents"
        doc_type = "Aadhaar Card"
        if aadhaar_match:
            extracted_fields["uid_number"] = aadhaar_match.group(0).replace(" ", "")
        gender_match = re.search(r'\b(MALE|FEMALE|TRANSGENDER)\b', upper_text)
        if gender_match:
            extracted_fields["gender"] = gender_match.group(1)
        dob_match = re.search(r'(?:DOB|Date of Birth|Year of Birth)\s*[:.-]?\s*(\d{2}/\d{2}/\d{4}|\d{4})', text, re.IGNORECASE)
        if dob_match:
            extracted_fields["dob_or_year"] = dob_match.group(1)
    elif passport_match and ("PASSPORT" in upper_text or "REPUBLIC OF INDIA" in upper_text):
        doc_category = "1. Identity Documents"
        doc_type = "Passport"
        extracted_fields["passport_number"] = passport_match.group(0)
    elif dl_match or "DRIVING LICENCE" in upper_text or "LICENCE TO DRIVE" in upper_text:
        doc_category = "1. Identity Documents"
        doc_type = "Driving License"
        if dl_match:
            extracted_fields["dl_number"] = dl_match.group(0)
    elif epic_match or "ELECTION COMMISSION OF INDIA" in upper_text or "VOTER" in upper_text:
        doc_category = "1. Identity Documents"
        doc_type = "Voter ID (EPIC)"
        if epic_match:
            extracted_fields["epic_number"] = epic_match.group(0)

    # 2. Financial Documents
    elif "IFSC" in upper_text or "MICR" in upper_text or "CANCELLED" in upper_text:
        doc_category = "2. Financial Documents"
        if "CANCELLED" in upper_text:
            doc_type = "Cancelled Cheque"
        elif "PASSBOOK" in upper_text:
            doc_type = "Bank Passbook"
        else:
            doc_type = "Bank Statement"
        
        ifsc = re.search(r'\b[A-Z]{4}0[A-Z0-9]{6}\b', text)
        acc_no = re.search(r'\b\d{9,18}\b', text)
        if ifsc:
            extracted_fields["ifsc_code"] = ifsc.group(0)
        if acc_no:
            extracted_fields["account_number"] = acc_no.group(0)

    elif "FORM 16" in upper_text or "FORM NO. 16" in upper_text:
        doc_category = "2. Financial Documents"
        doc_type = "Form 16"
    elif "GSTIN" in upper_text or "GOODS AND SERVICES TAX" in upper_text:
        doc_category = "2. Financial Documents"
        doc_type = "GST Registration / Return"
        gstin = re.search(r'\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b', text)
        if gstin:
            extracted_fields["gstin"] = gstin.group(0)

    # 3. Educational Documents
    elif any(k in upper_text for k in ["MARKSHEET", "DEGREE", "DIPLOMA", "BOARD OF SECONDARY", "UNIVERSITY", "ROLL NO", "CGPA", "STATEMENT OF MARKS"]):
        doc_category = "3. Educational Documents"
        if "LEAVING CERTIFICATE" in upper_text or "SCHOOL LEAVING" in upper_text:
            doc_type = "School Leaving Certificate"
        elif "MARKSHEET" in upper_text or "STATEMENT OF MARKS" in upper_text:
            doc_type = "10th/12th Marksheet"
        elif "DEGREE" in upper_text:
            doc_type = "Degree Certificate"
        else:
            doc_type = "Educational Certificate"

        roll = re.search(r'(?:Roll\s*(?:No|Num|Number)?|Enrollment\s*(?:No|Num)?)\s*[:.-]?\s*([A-Za-z0-9-]+)', text, re.IGNORECASE)
        cgpa = re.search(r'(?:CGPA|SGPA|Percentage|Grades?)\s*[:.-]?\s*([\d.]+)', text, re.IGNORECASE)
        if roll:
            extracted_fields["roll_or_enrollment_no"] = roll.group(1)
        if cgpa:
            extracted_fields["cgpa_or_percentage"] = cgpa.group(1)

    # 5. Property Documents
    elif any(k in upper_text for k in ["SALE DEED", "7/12", "KHATA", "INDEX II", "ENCUMBRANCE", "LEASE AGREEMENT", "RENT AGREEMENT", "SURVEY NO"]):
        doc_category = "5. Property Documents"
        if "SALE DEED" in upper_text:
            doc_type = "Sale Deed"
        elif "7/12" in upper_text:
            doc_type = "7/12 Extract"
        elif "RENT" in upper_text or "LEASE" in upper_text:
            doc_type = "Rent / Lease Agreement"
        else:
            doc_type = "Property Document"
        
        survey = re.search(r'(?:Survey\s*(?:No|Num|Number)?|Gat\s*No)\s*[:.-]?\s*([\d/A-Za-z-]+)', text, re.IGNORECASE)
        if survey:
            extracted_fields["survey_number"] = survey.group(1)

    # 6. Vehicle Documents
    elif any(k in upper_text for k in ["REGISTRATION CERTIFICATE", "CHASSIS NO", "ENGINE NO", "PUC", "FITNESS CERTIFICATE"]):
        doc_category = "6. Vehicle Documents"
        doc_type = "RC Book / Vehicle Document"
        chassis = re.search(r'\b[A-HJ-NPR-Z0-9]{17}\b', upper_text)
        reg_no = re.search(r'\b[A-Z]{2}\s?\d{2}\s?[A-Z]{1,3}\s?\d{4}\b', upper_text)
        if chassis:
            extracted_fields["chassis_number"] = chassis.group(0)
        if reg_no:
            extracted_fields["vehicle_reg_number"] = reg_no.group(0)

    # 7. Medical Documents
    elif any(k in upper_text for k in ["PRESCRIPTION", "HOSPITAL", "PATIENT", "DIAGNOSIS", "BLOOD TEST", "DISCHARGE SUMMARY", "RX"]):
        doc_category = "7. Medical Documents"
        doc_type = "Medical Prescription / Report"

    # 12. Utility Bills
    elif any(k in upper_text for k in ["ELECTRICITY", "WATER BILL", "GAS BILL", "CONSUMER NO", "BILL DATE", "DUE DATE", "AMOUNT DUE"]):
        doc_category = "12. Utility Bills"
        doc_type = "Utility Bill"
        consumer_no = re.search(r'(?:Consumer\s*(?:No|ID|Num)?|Account\s*No)\s*[:.-]?\s*(\d+)', text, re.IGNORECASE)
        if consumer_no:
            extracted_fields["consumer_number"] = consumer_no.group(1)

    # Global field attachments
    if dates:
        extracted_fields["extracted_dates"] = dates
    if pincodes:
        extracted_fields["pincodes"] = pincodes
    if phones:
        extracted_fields["phone_numbers"] = phones
    if emails:
        extracted_fields["email_addresses"] = emails
    if amounts:
        extracted_fields["financial_amounts"] = amounts

    return {
        "category": doc_category,
        "document_type": doc_type,
        "fields": extracted_fields
    }
