import asyncio
import aiohttp
import json
import re
from typing import List, Dict, Any
from ..database import log_activity, save_lead
from .website_analyzer import EMAIL_REGEX, clean_email

REDDIT_SUBREDDITS = ["forhire", "hireaprogrammer", "freelance_forhire"]
REDDIT_HEADERS = {
    "User-Agent": "AutoLeadBot/1.0 by DevGrowth (Educational Autonomous Lead Engine)"
}

async def crawl_reddit_hiring_posts(session: aiohttp.ClientSession) -> List[Dict[str, Any]]:
    """Crawls Reddit subreddits for active [Hiring] posts seeking web and mobile app developers."""
    leads = []
    for sub in REDDIT_SUBREDDITS:
        url = f"https://www.reddit.com/r/{sub}/new.json?limit=15"
        try:
            async with session.get(url, headers=REDDIT_HEADERS, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    children = data.get("data", {}).get("children", [])
                    for post in children:
                        pdata = post.get("data", {})
                        title = pdata.get("title", "")
                        selftext = pdata.get("selftext", "")
                        author = pdata.get("author", "")
                        permalink = f"https://reddit.com{pdata.get('permalink', '')}"

                        # Check if it's a hiring post for App or Web dev
                        title_lower = title.lower()
                        is_hiring = "[hiring]" in title_lower or "hiring:" in title_lower or "[job]" in title_lower

                        if not is_hiring:
                            continue

                        combined_text = f"{title}\n{selftext}"
                        is_app = any(k in combined_text.lower() for k in ["app", "ios", "android", "flutter", "react native", "mobile"])
                        is_web = any(k in combined_text.lower() for k in ["website", "web dev", "frontend", "fullstack", "react", "next.js", "redesign", "wordpress", "landing page"])

                        if not (is_app or is_web):
                            continue

                        category = "App Development" if is_app else "Website Redesign"

                        # Extract email if author included one
                        emails = []
                        for m in EMAIL_REGEX.findall(combined_text):
                            cleaned = clean_email(m)
                            if cleaned:
                                emails.append(cleaned)

                        contact_email = emails[0] if emails else ""
                        
                        # Extract website URL if mentioned
                        urls = re.findall(r'(https?://[^\s]+)', combined_text)
                        clean_url = ""
                        for u in urls:
                            if "reddit.com" not in u and "imgur.com" not in u:
                                clean_url = u.rstrip('.,!?:;')
                                break

                        lead_data = {
                            "business_name": f"Project by u/{author}: {title[:40]}...",
                            "source": f"Reddit r/{sub}",
                            "category": category,
                            "website_url": clean_url or permalink,
                            "contact_email": contact_email,
                            "contact_person": f"u/{author}",
                            "location": "Remote / Worldwide",
                            "description": f"Client post: {title}\n\n{selftext[:300]}...",
                            "website_analysis": {
                                "source": "Reddit Gig Board",
                                "budget_hint": "Hourly / Fixed gig",
                                "opportunity_score": 90 if contact_email else 75,
                                "audit_flags": ["Direct high-intent client looking for developer", "Immediate hiring signal"]
                            },
                            "status": "ANALYZED" if contact_email else "DISCOVERED"
                        }

                        saved_id = save_lead(lead_data)
                        if saved_id:
                            lead_data["id"] = saved_id
                            leads.append(lead_data)
                            log_activity("CRAWLER", f"New Freelance Lead: u/{author} | '{title[:50]}' | Category: {category}", "SUCCESS")
                await asyncio.sleep(1.5)
        except Exception as e:
            log_activity("CRAWLER", f"Reddit crawl error for r/{sub}: {e}", "WARNING")
    return leads

async def crawl_hackernews_freelance(session: aiohttp.ClientSession) -> List[Dict[str, Any]]:
    """Crawls Hacker News 'Who wants to be hired / Seeking freelancer' threads via Firebase API."""
    leads = []
    try:
        # Search recent HN stories for "Freelancer? Seeking freelancer"
        hn_search_url = "https://hn.algolia.com/api/v1/search_by_date?tags=story&query=freelancer&hitsPerPage=3"
        async with session.get(hn_search_url, timeout=aiohttp.ClientTimeout(total=8)) as resp:
            if resp.status == 200:
                data = await resp.json()
                for hit in data.get("hits", []):
                    title = hit.get("title", "")
                    story_id = hit.get("story_id") or hit.get("objectID")
                    if "seeking freelancer" in title.lower() or "who is hiring" in title.lower():
                        # Fetch recent comments
                        comments_url = f"https://hn.algolia.com/api/v1/search?tags=comment,story_{story_id}&hitsPerPage=10"
                        async with session.get(comments_url, timeout=aiohttp.ClientTimeout(total=8)) as c_resp:
                            if c_resp.status == 200:
                                c_data = await c_resp.json()
                                for comment in c_data.get("hits", []):
                                    text = comment.get("comment_text", "")
                                    author = comment.get("author", "")
                                    
                                    # Check for app or web project keywords
                                    if any(w in text.lower() for w in ["app", "website", "frontend", "mobile", "react", "nextjs", "ios", "android"]):
                                        emails = [clean_email(m) for m in EMAIL_REGEX.findall(text) if clean_email(m)]
                                        email = emails[0] if emails else ""
                                        
                                        is_app = any(w in text.lower() for w in ["app", "ios", "android", "flutter", "mobile"])
                                        category = "App Development" if is_app else "Website Redesign"

                                        lead_data = {
                                            "business_name": f"HN Founder: {author}",
                                            "source": "HackerNews Freelance",
                                            "category": category,
                                            "website_url": f"https://news.ycombinator.com/item?id={comment.get('objectID')}",
                                            "contact_email": email,
                                            "contact_person": author,
                                            "location": "Global / Remote",
                                            "description": text[:350],
                                            "website_analysis": {
                                                "source": "HackerNews Startup Project",
                                                "opportunity_score": 88,
                                                "audit_flags": ["HackerNews Founder / Tech Team Looking for builder"]
                                            },
                                            "status": "ANALYZED" if email else "DISCOVERED"
                                        }

                                        saved_id = save_lead(lead_data)
                                        if saved_id:
                                            lead_data["id"] = saved_id
                                            leads.append(lead_data)
                                            log_activity("CRAWLER", f"New HN Lead: {author} ({category})", "SUCCESS")
    except Exception as e:
        log_activity("CRAWLER", f"HN crawl error: {e}", "WARNING")
    return leads

async def crawl_job_boards() -> List[Dict[str, Any]]:
    """Runs all freelance & direct project crawlers."""
    all_leads = []
    async with aiohttp.ClientSession() as session:
        reddit_leads = await crawl_reddit_hiring_posts(session)
        all_leads.extend(reddit_leads)
        
        hn_leads = await crawl_hackernews_freelance(session)
        all_leads.extend(hn_leads)
    return all_leads
