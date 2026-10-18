import json
import os
from typing import Dict, Any, Tuple
from ..database import get_setting, log_activity

DEFAULT_SENDER_NAME = "Alex"

def generate_heuristic_pitch(lead: Dict[str, Any]) -> Tuple[str, str]:
    """
    Generates a battle-tested, high-converting cold email tailored to whether
    the lead needs Mobile App Development or Modern Website Redesign.
    """
    biz_name = lead.get("business_name", "your team")
    category = lead.get("category", "Website Redesign")
    analysis = lead.get("website_analysis", {})
    if isinstance(analysis, str):
        try:
            analysis = json.loads(analysis)
        except Exception:
            analysis = {}

    flags = analysis.get("audit_flags", [])
    load_speed = analysis.get("load_speed_ms", 1200)
    has_app = analysis.get("has_mobile_app", False)
    from_name = get_setting("from_name", DEFAULT_SENDER_NAME)

    if category == "App Development":
        subject = f"Mobile app concept for {biz_name} (iOS & Android booking)"
        body = f"""Hi {biz_name} team,

I came across your business while reviewing top services in your market. Your offerings are fantastic, but I noticed you currently don't have a dedicated iOS & Android mobile application for your clients to book appointments and receive push notifications directly.

Over 72% of modern customers prefer 1-tap bookings and mobile loyalty perks rather than opening a browser. We recently built a cross-platform mobile app for a similar business that increased repeat customer bookings by 38% within 60 days.

We took the liberty of mapping out a quick 3-screen interactive prototype for {biz_name}:
1. 1-Tap Instant Appointment & Service Booking
2. Real-Time Push Notifications for Reminders & Offers
3. Integrated Apple Pay & Google Pay checkout

Would you be open to a quick 5-minute Loom demo or a quick walkthrough this Thursday to see how it looks?

Best regards,

{from_name}
Mobile & Web Engineering Lead
P.S. If you're not the right person to review digital growth for {biz_name}, could you kindly point me in the right direction?"""

    else:
        # Website Redesign & Modern Web Platform
        speed_note = f"takes approximately {load_speed}ms to load" if load_speed > 2000 else "could benefit from a modern Next.js/React architecture"
        flaw_note = f"specifically: {flags[0]}" if flags else "improving conversion rate and mobile UX"

        subject = f"Quick question regarding {biz_name}'s website conversion"
        body = f"""Hi {biz_name} team,

I was looking through your online presence at {biz_name}. Your brand reputation is strong, but reviewing the site on mobile, I noticed a few technical bottlenecks ({flaw_note}, and the page {speed_note}).

In today's competitive landscape, slow load times and non-optimized mobile navigation can lead to upwards of 40% bounce rate from potential high-intent clients before they reach your contact form.

We specialize in modernizing legacy websites into high-speed, interactive web platforms (React/Next.js) that load in under 600ms and convert visitors into paying clients effortlessly.

I put together a brief checklist and redesign mockup specifically for {biz_name}'s homepage and booking flow. 

Would you be opposed to seeing the mockup? Happy to send a quick 2-minute video overview with no strings attached.

Warmly,

{from_name}
Full-Stack Web Architect
P.S. If you are not handling website updates for {biz_name}, no problem at all! Feel free to forward this to your marketing/tech lead."""

    return subject, body

async def generate_ai_pitch(lead: Dict[str, Any]) -> Tuple[str, str]:
    """
    Generates a personalized email pitch using Google Gemini if API key is configured,
    or falls back seamlessly to the high-converting heuristic pitch engine.
    """
    gemini_key = get_setting("gemini_api_key", "").strip() or os.environ.get("GEMINI_API_KEY", "")

    if not gemini_key:
        # Use our built-in high-converting pitch engine
        return generate_heuristic_pitch(lead)

    try:
        from google import genai
        client = genai.Client(api_key=gemini_key)

        biz_name = lead.get("business_name", "")
        category = lead.get("category", "")
        website = lead.get("website_url", "")
        desc = lead.get("description", "")
        analysis = json.dumps(lead.get("website_analysis", {}))
        from_name = get_setting("from_name", DEFAULT_SENDER_NAME)

        prompt = f"""
You are an elite B2B tech sales & cold outreach expert for an app & web development studio.
Write a personalized, concise, high-converting cold email to:
- Business: {biz_name}
- Target Service: {category} (Mobile App or Website Redesign)
- Website: {website}
- Background Info: {desc}
- Website Audit findings: {analysis}
- Sender Name: {from_name}

Rules:
1. Max 140 words.
2. Hook them with a specific genuine observation or technical bottleneck from the audit.
3. Offer concrete value (e.g. mock prototype, interactive demo, speed boost).
4. Low friction Call-to-action (e.g. 'Can I send you a 60-second video demo?').
5. Respond ONLY in valid JSON format:
{{"subject": "...", "body": "..."}}
"""

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )

        text = response.text.strip()
        # Parse JSON
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()

        data = json.loads(text)
        return data.get("subject", ""), data.get("body", "")

    except Exception as e:
        log_activity("AI_PITCH", f"Gemini API generation error: {e}. Falling back to heuristic pitch.", "WARNING")
        return generate_heuristic_pitch(lead)
