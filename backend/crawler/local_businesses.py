import asyncio
import aiohttp
import json
import random
import urllib.parse
from bs4 import BeautifulSoup
from typing import List, Dict, Any
from .website_analyzer import analyze_website
from ..database import log_activity, save_lead, get_lead

# Free & public Overpass API for OpenStreetMap (unlimited business queries worldwide)
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# DuckDuckGo HTML Lite search endpoint for targeted searches
DDG_URL = "https://html.duckduckgo.com/html/"

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0"
]

async def search_duckduckgo_businesses(query: str, session: aiohttp.ClientSession) -> List[Dict[str, str]]:
    """Searches DuckDuckGo HTML for business websites."""
    results = []
    headers = {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Referer": "https://html.duckduckgo.com/"
    }
    data = {"q": query}
    try:
        async with session.post(DDG_URL, data=data, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as resp:
            if resp.status == 200:
                html = await resp.text(errors="ignore")
                soup = BeautifulSoup(html, "html.parser")
                for link in soup.find_all("a", class_="result__url"):
                    href = link.get("href", "").strip()
                    if href.startswith("/l/?kh=-1&uddg="):
                        # Decode DDG redirect URL
                        actual_url = urllib.parse.unquote(href.split("uddg=")[1])
                    else:
                        actual_url = href

                    title_elem = link.find_previous("a", class_="result__snippet") or link.find_previous("h2")
                    title = title_elem.get_text().strip() if title_elem else ""

                    # Exclude aggregators like Yelp, Facebook, LinkedIn, Yellowpages
                    domain = urllib.parse.urlparse(actual_url).netloc.lower()
                    if domain and not any(agg in domain for agg in ["yelp.", "facebook.", "tripadvisor.", "yellowpages.", "linkedin.", "wikipedia.", "instagram.", "twitter.", "mapquest."]):
                        results.append({
                            "name": title or domain,
                            "website_url": actual_url
                        })
    except Exception as e:
        log_activity("CRAWLER", f"DuckDuckGo search error: {e}", "WARNING")
    return results[:8]

async def search_overpass_businesses(niche: str, location: str, session: aiohttp.ClientSession) -> List[Dict[str, str]]:
    """
    Queries OpenStreetMap Overpass API for real local businesses with websites in target city.
    Extremely reliable, zero captcha, high-quality real business data.
    """
    results = []
    # Map high-level niche to OSM tags
    amenity_tag = "dentist"
    if "dental" in niche.lower() or "medical" in niche.lower() or "clinic" in niche.lower():
        amenity_tag = '["amenity"~"dentist|clinic|doctors"]'
    elif "gym" in niche.lower() or "fitness" in niche.lower():
        amenity_tag = '["leisure"="fitness_centre"]'
    elif "restaurant" in niche.lower() or "food" in niche.lower():
        amenity_tag = '["amenity"="restaurant"]'
    elif "real estate" in niche.lower():
        amenity_tag = '["office"="estate_agent"]'
    elif "law" in niche.lower() or "legal" in niche.lower():
        amenity_tag = '["office"="lawyer"]'
    else:
        amenity_tag = '["office"]'

    city = location.split(",")[0].strip()

    query = f"""
    [out:json][timeout:15];
    area[name="{city}"]->.searchArea;
    (
      node{amenity_tag}["website"](area.searchArea);
      way{amenity_tag}["website"](area.searchArea);
    );
    out tags 15;
    """
    try:
        async with session.post(OVERPASS_URL, data={"data": query}, timeout=aiohttp.ClientTimeout(total=18)) as resp:
            if resp.status == 200:
                data = await resp.json()
                for el in data.get("elements", []):
                    tags = el.get("tags", {})
                    name = tags.get("name")
                    website = tags.get("website") or tags.get("contact:website")
                    phone = tags.get("phone") or tags.get("contact:phone") or ""
                    email = tags.get("email") or tags.get("contact:email") or ""

                    if name and website:
                        results.append({
                            "name": name,
                            "website_url": website,
                            "phone": phone,
                            "email": email
                        })
    except Exception as e:
        log_activity("CRAWLER", f"Overpass API error for {city}: {e}", "WARNING")

    return results

async def crawl_local_niche(niche: str, location: str) -> List[Dict[str, Any]]:
    """
    Crawls local businesses in a niche and location, audits their website,
    and returns enriched lead candidates.
    """
    log_activity("CRAWLER", f"Starting local crawl: '{niche}' in '{location}'", "INFO")
    leads_found = []

    async with aiohttp.ClientSession() as session:
        # Step 1: Query Overpass for verified local businesses
        osm_businesses = await search_overpass_businesses(niche, location, session)
        
        # Step 2: Query DuckDuckGo for additional targeted web businesses
        search_query = f"{niche} in {location} official website"
        ddg_businesses = await search_duckduckgo_businesses(search_query, session)

        from ..database import is_domain_seen, normalize_domain

        candidates = osm_businesses + ddg_businesses
        # Remove duplicate domains and skip already crawled domains
        seen_domains = set()
        unique_candidates = []
        for c in candidates:
            dom = normalize_domain(c.get("website_url", ""))
            if not dom:
                continue
            # Zero-duplicate check: if domain was ever seen in database, skip immediately!
            if is_domain_seen(dom):
                continue
            if dom not in seen_domains:
                seen_domains.add(dom)
                unique_candidates.append(c)

        log_activity("CRAWLER", f"Filtered to {len(unique_candidates)} brand new uncrawled domains for '{niche}' in '{location}'", "INFO")

        # Step 3: Analyze each website asynchronously
        for candidate in unique_candidates[:6]:  # Process in high-quality batches
            url = candidate["website_url"]
            name = candidate["name"]
            try:
                analysis = await analyze_website(url, session)
                email = candidate.get("email") or (analysis["extracted_emails"][0] if analysis["extracted_emails"] else "")
                phone = candidate.get("phone") or (analysis["extracted_phones"][0] if analysis["extracted_phones"] else "")

                # If no email directly found, synthesize/detect standard business contact structure or continue
                # Clean up business name
                clean_name = analysis.get("title") or name or "Local Business"
                if len(clean_name) > 60:
                    clean_name = clean_name.split("|")[0].split("-")[0].strip()
                if len(clean_name) > 60:
                    clean_name = clean_name[:57] + "..."

                lead_data = {
                    "business_name": clean_name,
                    "source": "Local Business Discovery",
                    "category": analysis["recommended_category"],
                    "website_url": url,
                    "contact_email": email,
                    "contact_phone": phone,
                    "location": location,
                    "description": f"{niche} located in {location}. {', '.join(analysis['audit_flags'][:2])}",
                    "website_analysis": analysis,
                    "status": "ANALYZED" if email else "DISCOVERED"
                }

                saved_id = save_lead(lead_data)
                if saved_id:
                    lead_data["id"] = saved_id
                    leads_found.append(lead_data)
                    log_activity("CRAWLER", f"New Lead Saved: '{name}' ({url}) | Category: {analysis['recommended_category']} | Email: {email or 'Crawling subpages...'}", "SUCCESS")
                
                await asyncio.sleep(random.uniform(1.0, 2.5))
            except Exception as e:
                log_activity("CRAWLER", f"Error analyzing {url}: {e}", "ERROR")

    return leads_found
