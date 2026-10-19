import re
import time
import aiohttp
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from typing import Dict, Any, List, Optional

# Strict email regex requiring alphabetic TLD of 2-15 letters
EMAIL_REGEX = re.compile(r'\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,15}\b')
PHONE_REGEX = re.compile(r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}')

DISALLOWED_DOMAINS = {
    'example.com', 'domain.com', 'test.com', 'sentry.io', 'wixpress.com', 
    'wordpress.org', 'schema.org', 'github.com', 'googleapis.com', 
    'google.com', 'facebook.com', 'instagram.com', 'twitter.com', 'x.com'
}

DISALLOWED_PREFIXES = {
    'bootstrap', 'handlebars', 'axe-core', 'axe', 'validatorjs', 'swiper', 
    'wght', 'react', 'vue', 'angular', 'webpack', 'core-js', 'lodash', 
    'jquery', 'npm', 'node', 'yarn', 'github', 'sentry', 'wixpress', 
    'schema', 'example', 'yourname', 'test', 'email', 'javascript-tracker',
    'intl-messageformat'
}

ASSET_EXTENSIONS = (
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp', 
    '.js', '.css', '.map', '.json', '.woff', '.woff2', '.ttf', '.eot'
)

def is_valid_email(email: str) -> bool:
    if not email or not isinstance(email, str):
        return False
    email = email.strip().lower()
    
    # Must match strict regex
    if not EMAIL_REGEX.fullmatch(email):
        return False
        
    if len(email) < 6 or len(email) > 60:
        return False
        
    if any(email.endswith(ext) for ext in ASSET_EXTENSIONS):
        return False
        
    parts = email.split('@')
    if len(parts) != 2:
        return False
        
    local, domain = parts
    
    # Disallow known framework, tool or package prefixes
    if any(local == p or local.startswith(p + '@') or local.startswith(p + '-') or local.startswith(p + '.') for p in DISALLOWED_PREFIXES):
        return False

    # Disallow internal dummy domains
    if domain in DISALLOWED_DOMAINS or any(domain.endswith('.' + d) for d in DISALLOWED_DOMAINS):
        return False
        
    domain_parts = domain.split('.')
    tld = domain_parts[-1]
    if not tld.isalpha() or len(tld) < 2:
        return False
        
    # Any domain part being purely numeric is invalid (like version numbers 1.1.2)
    if any(p.isdigit() for p in domain_parts):
        return False
        
    # Reject consecutive dots or leading/trailing dots/dashes
    if '..' in email or local.startswith('.') or local.endswith('.') or domain.startswith('.') or domain.endswith('.'):
        return False
        
    return True

def clean_email(email: str) -> Optional[str]:
    if not email:
        return None
    cleaned = email.strip().lower().strip('<>"\';:,()[]{}')
    if is_valid_email(cleaned):
        return cleaned
    return None

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
        addr = mailto.get("href", "").replace("mailto:", "").split("?")[0].strip()
        cleaned = clean_email(addr)
        if cleaned:
            emails.add(cleaned)

    # Clean text: strip script, style, code, svg so JS packages/webpack bundles aren't extracted as emails
    text_soup = BeautifulSoup(html, "html.parser")
    for tag in text_soup(["script", "style", "noscript", "svg", "iframe", "code"]):
        tag.decompose()
    clean_page_text = text_soup.get_text(separator=" ")

    # Regex search on cleaned visible text
    for m in EMAIL_REGEX.findall(clean_page_text):
        cleaned = clean_email(m)
        if cleaned:
            emails.add(cleaned)

    for p in PHONE_REGEX.findall(clean_page_text):
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
                            addr = mailto.get("href", "").replace("mailto:", "").split("?")[0].strip()
                            cleaned = clean_email(addr)
                            if cleaned:
                                emails.add(cleaned)
                        for tag in c_soup(["script", "style", "noscript", "svg", "iframe", "code"]):
                            tag.decompose()
                        c_text = c_soup.get_text(separator=" ")
                        for m in EMAIL_REGEX.findall(c_text):
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
