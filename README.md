# AutoLead AI 🚀
### Autonomous 24/7 Web & Mobile App Development Lead Generator & Cold Outreach Engine

AutoLead AI ek complete end-to-end autonomous software solution hai jo:
1. **24/7 Continuous Web Scraping & Crawling** karta hai multi-channel platforms se:
   - **Local Businesses** via Google Maps, OpenStreetMap Overpass, DuckDuckGo (Dental Clinics, Real Estate, Gyms, Restaurants, E-Commerce brands).
   - **Active Freelance & Job Postings** via Reddit (`r/forhire`, `r/freelance_forhire`, `r/hireaprogrammer`) and Hacker News ("Who is hiring" / "Freelancers").
2. **Website & Mobile App Opportunity Audit**:
   - Har business ki website ko background me analyze karta hai:
     - Mobile Viewport / Responsiveness check (kya site mobile me achhi dikhti hai ya tooti hui hai).
     - Native iOS/Android App check (kya company ke paas mobile app hai? Agar nahi hai toh high-ticket App Development lead identify karta hai).
     - Page load speed in milliseconds.
     - Outdated Tech Stack detection (legacy WordPress, Wix, old HTML).
     - Contact emails, phone numbers, and location extraction.
3. **AI Pitch Generator (Hyper-Personalized Cold Emails)**:
   - Website flaws aur business type ke basis par personalized hook, value proposition, aur low-friction CTA ke sath cold email pitch generate karta hai.
   - Built-in high-converting engine + optional Google Gemini API support.
4. **100% Fully Autonomous Cold Email Dispatcher**:
   - Gmail / Google Workspace / Custom SMTP support.
   - Anti-spam guardrails (daily sending limit quota, randomized delay intervals, sandbox simulation mode).
5. **Real-Time Glassmorphic Command Center Dashboard**:
   - Live KPI cards, opportunity score meters, email logs, and instant manual controls.

---

## ⚡ Quick Start (Kaise Run Karein)

### Method 1: 1-Click Launch (Recommended for Windows)
Simply double click on:
```cmd
run.bat
```
Ya PowerShell me run karein:
```powershell
.\start.ps1
```

### Method 2: Manual Terminal Launch

**Step 1: Backend Start Karein**
```powershell
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

**Step 2: Frontend Dashboard Start Karein**
```powershell
cd frontend
npm run dev
```
Dashboard URL: [http://localhost:5173](http://localhost:5173)

---

## 📧 Live Gmail SMTP Setup (Real Emails Send Karne Ke Liye)

Dashboard me **Settings** icon par click karein:
1. **Sender Display Name**: e.g., `Alex from DevStudio`
2. **Gmail Address**: `yourname@gmail.com`
3. **Gmail 16-Character App Password**:
   - Google Account me jaayein > `Security` > `2-Step Verification` on karein.
   - Niche `App Passwords` search karein aur "Mail" ke liye ek 16-character password banayein (e.g., `abcd efgh ijkl mnop`).
   - Is password ko Settings me paste karein.
4. **Sandbox Simulation Mode**: Isko **Live SMTP Dispatch** par set karein.
5. Click **Save All Settings**.

---

## 🤖 100% Autonomous Auto-Pilot Mode
- Header me **Auto-Pilot: 100% Autonomous** toggle ko ON rakhein.
- Jaise hi crawler naye leads discover karega aur unki email find karega:
  1. AI turant audit karega.
  2. Pitch ready karega.
  3. Safe delay (5-8 seconds jitter) ke sath email shoot kar dega!
- Agar aap pehle email inspect karke bhejna chahte hain, toh toggle ko **Review Mode** par set kar sakte hain.

---

## 🛠️ Project Architecture

```
Auto-lead/
├── backend/
│   ├── app.py                   # FastAPI REST API & Lifespan Scheduler
│   ├── database.py              # SQLite database (leads, settings, activity logs)
│   ├── autolead.db              # Persistent SQLite storage
│   ├── crawler/
│   │   ├── engine.py            # Master 24/7 background scheduler loop
│   │   ├── local_businesses.py  # OSM Overpass + DuckDuckGo business scraper
│   │   ├── job_boards.py        # Reddit r/forhire + Hacker News scraper
│   │   └── website_analyzer.py  # Mobile audit, app check, speed & email extractor
│   ├── ai/
│   │   └── pitch_generator.py   # AI cold outreach writer (Gemini + Heuristic engine)
│   └── outreach/
│       └── email_sender.py      # Autonomous Gmail / SMTP dispatcher with anti-spam
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Command Center UI, metrics, inspector & settings
│   │   └── index.css            # Cyber Obsidian glassmorphism design system
│   ├── package.json
│   └── index.html
├── run.bat                      # 1-Click Windows Batch launcher
├── start.ps1                    # PowerShell runner
└── README.md
```
