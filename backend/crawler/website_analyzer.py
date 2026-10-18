import re
import time
import aiohttp
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from typing import Dict, Any, List, Optional

EMAIL_REGEX = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')
PHONE_REGEX = re.compile(r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}')

# Common false positive emails to filter out
IGNORE_EMAILS = {
    'example.com', 'domain.com', 'yourname@', 'test@test.com', 'email@example.com',
    'sentry.io', 'wixpress.com', 'wordpress.org', 'schema.org'
}

def clean_email(email: str) -> Optional[str]:
    email = email.strip().lower()
    if any(ignore in email for ignore in IGNORE_EMAILS):
        return None
    # Filter image extensions falsely captured as email
    if email.endswith(('.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp')):
        return None
    if len(email) > 60 or len(email) < 6:
        return None
    return email

async def analyze_website(url: str, session: aiohttp.ClientSession) -> Dict[str, Any]:
    """
    Crawls the website and extracts contact details, checks tech stack,
    evaluates mobile readiness, detects missing mobile apps, and identifies pain points.
    """
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    result = {
        "url": url,
        "is_accessible": False,
        "status_code": 0,
        "load_speed_ms": 0,
        "is_https": url.startswith("https://"),
        "mobile_responsive": False,
        "has_mobile_app": False,
        "has_booking_system": False,
        "tech_stack": [],
        "audit_flags": [],
        "opportunity_score": 50,
        "recommended_category": "Website Redesign",
        "extracted_emails": [],
        "extracted_phones": [],
        "title": ""
    }

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }

    start_time = time.time()
    try:
        async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=12), allow_redirects=True) as resp:
            elapsed_ms = int((time.time() - start_time) * 1000)
            result["load_speed_ms"] = elapsed_ms
            result["status_code"] = resp.status
            result["is_accessible"] = resp.status < 400

            if resp.status >= 400:
                result["audit_flags"].append(f"HTTP Status {resp.status} - Website unreachable or erroring")
                result["opportunity_score"] += 20
                return result

            html = await resp.text(errors="ignore")
    except Exception as e:
        result["audit_flags"].append(f"Connection issue: {str(e)[:40]}")
        result["load_speed_ms"] = int((time.time() - start_time) * 1000)
        return result

    soup = BeautifulSoup(html, "html.parser")
    result["title"] = soup.title.string.strip() if soup.title and soup.title.string else ""

    # 1. Mobile Responsiveness Check
    viewport = soup.find("meta", attrs={"name": "viewport"})
    if viewport and "width=device-width" in str(viewport.get("content", "")):
        result["mobile_responsive"] = True
    else:
        result["mobile_responsive"] = False
        result["audit_flags"].append("Missing Mobile Viewport meta tag (Poor mobile experience)")
        result["opportunity_score"] += 25

    # 2. Check for App Store / Play Store Links
    has_app = False
    for a in soup.find_all("a", href=True):
        href = a["href"].lower()
        if "apple.com" in href and "/app/" in href:
            has_app = True
        elif "play.google.com" in href and "id=" in href:
            has_app = True
    result["has_mobile_app"] = has_app

    if not has_app:
        result["audit_flags"].append("No Native iOS/Android App linked (High App Opportunity)")
        result["opportunity_score"] += 25

    # 3. Detect Booking/Ordering system
    text_lower = soup.get_text().lower()
    if any(k in text_lower for k in ["book now", "schedule appointment", "order online", "reserve a table", "get quote"]):
        result["has_booking_system"] = True

    # 4. Tech Stack Heuristics
    techs = []
    if "wp-content" in html or "wp-includes" in html:
        techs.append("WordPress")
    if "wix.com" in html or "_wix" in html:
        techs.append("Wix")
    if "squarespace" in html:
        techs.append("Squarespace")
    if "shopify" in html:
        techs.append("Shopify")
    if "bootstrap" in html:
        techs.append("Bootstrap")
    if "react" in html:
        techs.append("React")
    if "next" in html:
        techs.append("Next.js")

    result["tech_stack"] = techs

    # Check for outdated indicators
    if "WordPress" in techs and not result["mobile_responsive"]:
        result["audit_flags"].append("Outdated legacy WordPress theme detected")
        result["opportunity_score"] += 15

    if elapsed_ms > 2500:
        result["audit_flags"].append(f"Slow Load Time ({elapsed_ms}ms) - Needs speed optimization")
        result["opportunity_score"] += 15

    # Determine recommended pitch category
    if not result["has_mobile_app"] and (result["has_booking_system"] or "Shopify" in techs or "order" in text_lower):
        result["recommended_category"] = "App Development"
    elif not result["mobile_responsive"] or elapsed_ms > 2200 or "Outdated" in str(result["audit_flags"]):
        result["recommended_category"] = "Website Redesign"
    else:
        result["recommended_category"] = "App Development" if not result["has_mobile_app"] else "Website Redesign"

    # 5. Extract contact info (from homepage + contact subpages)
    emails = set()
    phones = set()

    for mailto in soup.find_all("a", href=re.compile(r"^mailto:", re.I)):
        addr = mailto["href"].replace("mailto:", "").split("?")[0].strip()
        cleaned = clean_email(addr)
        if cleaned:
            emails.add(cleaned)

    # Regex search on homepage
    for m in EMAIL_REGEX.findall(html):
        cleaned = clean_email(m)
        if cleaned:
            emails.add(cleaned)

    for p in PHONE_REGEX.findall(html):
        if len(p) >= 10:
            phones.add(p.strip())

    # If no email found on homepage, crawl /contact or /about page
    if not emails:
        contact_links = []
        for a in soup.find_all("a", href=True):
            href = a["href"].lower()
            if any(term in href for term in ["contact", "about", "reach-us", "get-in-touch"]):
                full_link = urljoin(url, a["href"])
                if urlparse(full_link).netloc == urlparse(url).netloc:
                    contact_links.append(full_link)

        for c_url in contact_links[:2]:
            try:
                async with session.get(c_url, headers=headers, timeout=aiohttp.ClientTimeout(total=8)) as c_resp:
                    if c_resp.status == 200:
                        c_html = await c_resp.text(errors="ignore")
                        c_soup = BeautifulSoup(c_html, "html.parser")
                        for mailto in c_soup.find_all("a", href=re.compile(r"^mailto:", re.I)):
                            addr = mailto["href"].replace("mailto:", "").split("?")[0].strip()
                            cleaned = clean_email(addr)
                            if cleaned:
                                emails.add(cleaned)
                        for m in EMAIL_REGEX.findall(c_html):
                            cleaned = clean_email(m)
                            if cleaned:
                                emails.add(cleaned)
                        if emails:
                            break
            except Exception:
                pass

    result["extracted_emails"] = list(emails)
    result["extracted_phones"] = list(phones)[:3]
    return result
