import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Calendar,
  Clock,
  Send,
  Mail,
  Phone,
  Video,
  Sparkles,
  Building2,
  CheckCircle,
  X,
  Plus,
  MessageSquare,
  ExternalLink,
  Zap,
  Globe,
  Layers
} from 'lucide-react';

export default function LeadOutreachRecord({ leads = [], currentView = 'record', setCurrentView }) {
  const [selectedDay, setSelectedDay] = useState(18); // 18 Oct Sunday
  const [searchLead, setSearchLead] = useState('');
  const [selectedLeadFilter, setSelectedLeadFilter] = useState(null);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [timeRangeFilter, setTimeRangeFilter] = useState('ALL'); // 'ALL' | 'NIGHT' | 'MORNING' | 'AFTERNOON' | 'EVENING'

  // Scheduled Outreach & Meeting Records across 24 Hours & multiple October dates
  const [scheduledRecords, setScheduledRecords] = useState([
    // October 5
    {
      id: 501,
      businessName: 'Austin Tech Incubator',
      leadId: 5,
      day: 5,
      time: '10:00 AM',
      type: 'Dispatched',
      category: 'App Development',
      channel: 'Gmail SMTP',
      subject: 'Mobile App MVP Sprint for Portfolio Startups',
      notes: 'Dispatched automated pitch with prototype link.'
    },
    // October 8
    {
      id: 801,
      businessName: 'Silicon Valley Legal Tech',
      leadId: 30,
      day: 8,
      time: '2:00 PM',
      type: 'Demo Call',
      category: 'App Development',
      channel: 'Google Meet',
      subject: 'Client Intake Architecture & Security Review',
      notes: 'Initial discovery call with managing partner.'
    },
    // October 11
    {
      id: 1101,
      businessName: 'Apex Fitness & Gym NYC',
      leadId: 7,
      day: 11,
      time: '11:30 AM',
      type: 'Follow-up',
      category: 'App Development',
      channel: 'Gmail SMTP',
      subject: 'Quick Follow-up: Member iOS Companion App',
      notes: 'Sent follow-up with mobile app ROI metrics.'
    },
    // October 12
    {
      id: 1201,
      businessName: 'BYGEORGE Luxury Boutique',
      leadId: 78,
      day: 12,
      time: '3:00 PM',
      type: 'Demo Call',
      category: 'Website Redesign',
      channel: 'Zoom Call',
      subject: 'E-Commerce Mobile UX Speed Upgrade Demo',
      notes: 'Walkthrough of Next.js checkout optimization.'
    },
    // October 14
    {
      id: 1401,
      businessName: 'Estilo Austin Boutique',
      leadId: 79,
      day: 14,
      time: '9:30 AM',
      type: 'Dispatched',
      category: 'App Development',
      channel: 'Gmail SMTP',
      subject: 'Native Mobile Shopping App for Estilo Customers',
      notes: 'Automated cold pitch with instant push notification demo.'
    },
    // October 15
    {
      id: 1501,
      businessName: 'Austin Dental & Medical Group',
      leadId: 4,
      day: 15,
      time: '1:30 PM',
      type: 'Demo Call',
      category: 'Website Redesign',
      channel: 'Google Meet',
      subject: 'Interactive Dental Booking App Demo',
      notes: 'Presented patient appointment scheduler prototype.'
    },
    // October 17
    {
      id: 4,
      businessName: 'Apex Fitness & Gym NYC',
      leadId: 7,
      day: 17,
      time: '10:00 AM',
      type: 'Dispatched',
      category: 'App Development',
      channel: 'Gmail SMTP',
      subject: 'Member iOS/Android companion app for Apex Gyms',
      notes: 'Cold pitch dispatched with membership portal demo.'
    },
    // October 18 (Today)
    {
      id: 7,
      businessName: 'Global Crawler Daemon',
      leadId: null,
      day: 18,
      time: '12:30 AM',
      type: 'Dispatched',
      category: 'Autonomous Crawler',
      channel: 'Reddit & OSM Scraper',
      subject: 'Nightly 24/7 Multi-Channel Lead Scraping Sweep',
      notes: 'Crawled 48 local business websites and extracted 22 verified emails.'
    },
    {
      id: 8,
      businessName: 'Tech Stack Auditor',
      leadId: null,
      day: 18,
      time: '3:30 AM',
      type: 'Follow-up',
      category: 'Audit Engine',
      channel: 'Website Analyzer',
      subject: 'Mobile Viewport & Load Speed Batch Analysis',
      notes: 'Scored 100+ domain targets on mobile responsiveness & legacy stacks.'
    },
    {
      id: 9,
      businessName: 'Silicon Valley Legal Tech',
      leadId: 30,
      day: 18,
      time: '6:30 AM',
      type: 'Dispatched',
      category: 'App Development',
      channel: 'Gmail SMTP',
      subject: 'Early Morning Outreach: Client Intake iOS Portal Concept',
      notes: 'Dispatched before US business open.'
    },
    {
      id: 1,
      businessName: 'Tejas Health Care',
      leadId: 1,
      day: 18,
      time: '9:00 AM',
      type: 'Dispatched',
      category: 'App Development',
      channel: 'Gmail SMTP',
      subject: 'Mobile patient app concept for Tejas Health Care',
      notes: 'Initial cold email sent autonomously with 60-sec video pitch hook.'
    },
    {
      id: 2,
      businessName: 'Top 10 E-Commerce London',
      leadId: 25,
      day: 18,
      time: '11:00 AM',
      type: 'Demo Call',
      category: 'App Development',
      channel: 'Google Meet',
      subject: 'Mobile Commerce App Architecture Walkthrough',
      notes: 'Scheduled 15-min discovery call with Lead Architect Alex.'
    },
    {
      id: 5,
      businessName: 'Prestige Real Estate Agency',
      leadId: 12,
      day: 18,
      time: '1:00 PM',
      type: 'Demo Call',
      category: 'Website Redesign',
      channel: 'Zoom Call',
      subject: 'Modern IDX Property Search Portal Demo',
      notes: 'Client requested live walkthrough of Next.js speed upgrade.'
    },
    {
      id: 3,
      businessName: 'Austin Dental & Medical Group',
      leadId: 4,
      day: 18,
      time: '2:30 PM',
      type: 'Follow-up',
      category: 'Website Redesign',
      channel: 'Gmail SMTP',
      subject: 'Quick question regarding your dental clinic mobile booking',
      notes: 'Queued automated Follow-up #1 with mobile speed audit.'
    },
    {
      id: 6,
      businessName: 'Downtown Legal Consultancies',
      leadId: 15,
      day: 18,
      time: '5:30 PM',
      type: 'Follow-up',
      category: 'Website Redesign',
      channel: 'Gmail SMTP',
      subject: 'Case intake optimization proposal',
      notes: 'Automated follow-up with mobile responsiveness report.'
    },
    {
      id: 10,
      businessName: 'West Coast Retail Brands',
      leadId: 35,
      day: 18,
      time: '8:30 PM',
      type: 'Dispatched',
      category: 'Website Redesign',
      channel: 'Gmail SMTP',
      subject: 'Next.js Speed Modernization & Mobile Checkout Demo',
      notes: 'Timed outreach for California evening review window.'
    },
    {
      id: 11,
      businessName: 'AutoLead Security & Quota Daemon',
      leadId: null,
      day: 18,
      time: '11:00 PM',
      type: 'Follow-up',
      category: 'Anti-Spam Guardrails',
      channel: 'SMTP Engine',
      subject: 'Daily Quota Reset & Domain Health Diagnostics',
      notes: 'Verified 0 bounce rate and healthy sender reputation scores.'
    },
    // October 19
    {
      id: 1901,
      businessName: 'Prestige Real Estate Agency',
      leadId: 12,
      day: 19,
      time: '9:00 AM',
      type: 'Dispatched',
      category: 'Website Redesign',
      channel: 'Gmail SMTP',
      subject: 'Next.js Property Search Portal Architecture Demo',
      notes: 'Dispatched high-value video pitch.'
    },
    {
      id: 1902,
      businessName: 'London Retail Brands',
      leadId: 25,
      day: 19,
      time: '4:00 PM',
      type: 'Demo Call',
      category: 'App Development',
      channel: 'Google Meet',
      subject: 'Mobile Commerce Global App Architecture',
      notes: 'Discovery meeting with CTO.'
    },
    // October 20
    {
      id: 2001,
      businessName: 'Tejas Health Care',
      leadId: 1,
      day: 20,
      time: '11:00 AM',
      type: 'Follow-up',
      category: 'App Development',
      channel: 'Gmail SMTP',
      subject: 'Follow-up #1: iOS patient intake demo video',
      notes: 'Follow-up queued autonomously.'
    },
    // October 22
    {
      id: 2201,
      businessName: 'Estilo Austin Boutique',
      leadId: 79,
      day: 22,
      time: '2:00 PM',
      type: 'Demo Call',
      category: 'App Development',
      channel: 'Zoom Call',
      subject: 'Mobile App Prototype Walkthrough for In-Store Pickup',
      notes: 'Scheduled live demo.'
    },
    // October 25
    {
      id: 2501,
      businessName: 'Downtown Legal Consultancies',
      leadId: 15,
      day: 25,
      time: '10:30 AM',
      type: 'Dispatched',
      category: 'Website Redesign',
      channel: 'Gmail SMTP',
      subject: 'Next-Gen Mobile Case Intake Web App Concept',
      notes: 'Dispatched proposal with security benchmark.'
    },
    // October 28
    {
      id: 2801,
      businessName: 'Top 10 E-Commerce London',
      leadId: 25,
      day: 28,
      time: '3:30 PM',
      type: 'Follow-up',
      category: 'App Development',
      channel: 'Gmail SMTP',
      subject: 'Follow-up #2: Mobile App Speed Case Study',
      notes: 'Sent benchmark comparison.'
    }
  ]);

  // Modal State for scheduling new dispatch / meeting
  const [formBusiness, setFormBusiness] = useState('');
  const [formType, setFormType] = useState('Dispatched');
  const [formChannel, setFormChannel] = useState('Gmail SMTP');
  const [formSubject, setFormSubject] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Filter leads from AutoLead database
  const displayLeads = (leads && leads.length > 0) ? leads : [
    { id: 1, business_name: 'Tejas Health Care', category: 'App Development', contact_email: 'info@tejashealth.org', location: 'Austin, TX' },
    { id: 25, business_name: 'Top 10 E-Commerce London', category: 'App Development', contact_email: 'support@made.com', location: 'London, UK' },
    { id: 4, business_name: 'Austin Dental & Medical Group', category: 'Website Redesign', contact_email: 'hello@austindental.com', location: 'Austin, TX' },
    { id: 7, business_name: 'Apex Fitness & Gym NYC', category: 'App Development', contact_email: 'contact@apexgyms.com', location: 'New York, NY' },
    { id: 12, business_name: 'Prestige Real Estate Agency', category: 'Website Redesign', contact_email: 'sales@prestigerealty.com', location: 'Toronto, Canada' }
  ];

  const filteredLeadsList = displayLeads.filter(l => {
    const nameMatch = (l.business_name || '').toLowerCase().includes(searchLead.toLowerCase()) ||
                      (l.category || '').toLowerCase().includes(searchLead.toLowerCase()) ||
                      (l.location || '').toLowerCase().includes(searchLead.toLowerCase());
    const catMatch = activeCategory === 'ALL' || l.category === activeCategory;
    return nameMatch && catMatch;
  });

  // Complete 24-Hour Timeline: 12:00 AM midnight through 11:30 PM & 12:00 AM (Next Day)
  const all24HourSlots = [
    '12:00 AM', '12:30 AM',
    '1:00 AM', '1:30 AM',
    '2:00 AM', '2:30 AM',
    '3:00 AM', '3:30 AM',
    '4:00 AM', '4:30 AM',
    '5:00 AM', '5:30 AM',
    '6:00 AM', '6:30 AM',
    '7:00 AM', '7:30 AM',
    '8:00 AM', '8:30 AM',
    '9:00 AM', '9:30 AM',
    '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM',
    '1:00 PM', '1:30 PM',
    '2:00 PM', '2:30 PM',
    '3:00 PM', '3:30 PM',
    '4:00 PM', '4:30 PM',
    '5:00 PM', '5:30 PM',
    '6:00 PM', '6:30 PM',
    '7:00 PM', '7:30 PM',
    '8:00 PM', '8:30 PM',
    '9:00 PM', '9:30 PM',
    '10:00 PM', '10:30 PM',
    '11:00 PM', '11:30 PM',
    '12:00 AM (Next Day)'
  ];

  const timeSlots = all24HourSlots.filter(t => {
    if (timeRangeFilter === 'ALL') return true;
    if (timeRangeFilter === 'NIGHT') {
      return t.endsWith('AM') && (t.startsWith('12:') || ['1:', '2:', '3:', '4:', '5:'].some(h => t.startsWith(h)));
    }
    if (timeRangeFilter === 'MORNING') {
      return t.endsWith('AM') && ['6:', '7:', '8:', '9:', '10:', '11:'].some(h => t.startsWith(h));
    }
    if (timeRangeFilter === 'AFTERNOON') {
      return t.endsWith('PM') && (t.startsWith('12:') || ['1:', '2:', '3:', '4:', '5:'].some(h => t.startsWith(h)));
    }
    if (timeRangeFilter === 'EVENING') {
      return (t.endsWith('PM') && ['6:', '7:', '8:', '9:', '10:', '11:'].some(h => t.startsWith(h))) || t.includes('Next Day');
    }
    return true;
  });

  const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  // Dynamically calculate 4-day window centered on or starting around selectedDay (1..31 Oct 2026)
  const startDay = Math.max(1, Math.min(28, selectedDay - 1));
  const daysHeader = [0, 1, 2, 3].map(offset => {
    const d = startDay + offset;
    const dateObj = new Date(2026, 9, d);
    const dayName = DAY_NAMES[dateObj.getDay()];
    return {
      dayName,
      date: d,
      isToday: d === 18,
      isSelected: d === selectedDay
    };
  });

  const currentDateRange = `${daysHeader[0].date} – ${daysHeader[daysHeader.length - 1].date} Oct 2026`;

  const miniCalendarDays = [
    { day: 27, inMonth: false }, { day: 28, inMonth: false }, { day: 29, inMonth: false }, { day: 30, inMonth: false },
    { day: 1, inMonth: true }, { day: 2, inMonth: true }, { day: 3, inMonth: true },
    { day: 4, inMonth: true }, { day: 5, inMonth: true }, { day: 6, inMonth: true }, { day: 7, inMonth: true },
    { day: 8, inMonth: true }, { day: 9, inMonth: true }, { day: 10, inMonth: true },
    { day: 11, inMonth: true }, { day: 12, inMonth: true }, { day: 13, inMonth: true }, { day: 14, inMonth: true },
    { day: 15, inMonth: true }, { day: 16, inMonth: true }, { day: 17, inMonth: true },
    { day: 18, inMonth: true },
    { day: 19, inMonth: true }, { day: 20, inMonth: true }, { day: 21, inMonth: true }, { day: 22, inMonth: true },
    { day: 23, inMonth: true }, { day: 24, inMonth: true },
    { day: 25, inMonth: true }, { day: 26, inMonth: true }, { day: 27, inMonth: true }, { day: 28, inMonth: true },
    { day: 29, inMonth: true }, { day: 30, inMonth: true }, { day: 31, inMonth: true }
  ];

  const handleSlotClick = (date, time) => {
    setSelectedSlot({ date, time });
    if (selectedLeadFilter) {
      setFormBusiness(selectedLeadFilter.business_name);
      setFormSubject(`Follow-up: Mobile app proposal for ${selectedLeadFilter.business_name}`);
    } else {
      setFormBusiness('');
      setFormSubject('');
    }
    setShowScheduleModal(true);
  };

  const handleSaveSchedule = (e) => {
    e.preventDefault();
    if (!formBusiness.trim()) return;

    const newRecord = {
      id: Date.now(),
      businessName: formBusiness.trim(),
      leadId: selectedLeadFilter ? selectedLeadFilter.id : null,
      day: selectedSlot.date,
      time: selectedSlot.time,
      type: formType,
      channel: formChannel,
      subject: formSubject.trim() || `Cold Outreach - ${formBusiness}`,
      notes: formNotes.trim()
    };

    setScheduledRecords([...scheduledRecords, newRecord]);
    setFormBusiness('');
    setFormSubject('');
    setFormNotes('');
    setShowScheduleModal(false);
  };

  const getRecordBadgeStyle = (type) => {
    switch (type) {
      case 'Dispatched':
        return {
          bg: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          text: '#34d399',
          borderLeft: '3px solid #10b981'
        };
      case 'Demo Call':
        return {
          bg: 'rgba(99, 102, 241, 0.15)',
          border: '1px solid rgba(99, 102, 241, 0.4)',
          text: '#818cf8',
          borderLeft: '3px solid #6366f1'
        };
      case 'Follow-up':
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          text: '#fbbf24',
          borderLeft: '3px solid #f59e0b'
        };
      default:
        return {
          bg: 'rgba(148, 163, 184, 0.15)',
          border: '1px solid rgba(148, 163, 184, 0.3)',
          text: '#cbd5e1',
          borderLeft: '3px solid #94a3b8'
        };
    }
  };

  return (
    <div className="glass-panel" style={{
      background: 'rgba(13, 17, 26, 0.95)',
      borderRadius: '20px',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: 'var(--shadow-lg), 0 0 35px rgba(0, 0, 0, 0.5)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      minHeight: 0
    }}>
      
      {/* HEADER SECTION (UNIFIED TOP LINE WITH LIVE SYNC & VIEW SWITCHER) */}
      <div style={{
        padding: '10px 18px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        background: 'rgba(16, 22, 34, 0.7)',
        flexShrink: 0
      }}>
        {/* Left: Title & Date Range */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(99, 102, 241, 0.3)'
              }}>
                <Calendar size={18} color="#fff" />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                Outreach & Lead Schedule Calendar
              </h2>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 42px' }}>
              {selectedLeadFilter 
                ? `Showing scheduled dispatches and follow-ups for: ${selectedLeadFilter.business_name}` 
                : 'Timeline of autonomous cold pitches, queued follow-ups, and booked client discovery calls.'}
            </p>
          </div>

          {/* Date Range Navigation */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '3px 8px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <button
              onClick={() => setSelectedDay(prev => Math.max(1, prev - 1))}
              title="Previous Day"
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#cbd5e1'
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setSelectedDay(prev => Math.min(31, prev + 1))}
              title="Next Day"
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#cbd5e1'
              }}
            >
              <ChevronRight size={14} />
            </button>
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc', margin: '0 6px' }}>
              {currentDateRange}
            </span>
          </div>
        </div>

        {/* Right side helper info & View Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {selectedLeadFilter && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '20px',
              background: 'rgba(99, 102, 241, 0.15)',
              color: '#818cf8',
              fontSize: '0.8rem',
              fontWeight: 600,
              border: '1px solid rgba(99, 102, 241, 0.3)'
            }}>
              <Building2 size={13} /> {selectedLeadFilter.business_name}
              <button 
                onClick={() => setSelectedLeadFilter(null)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#818cf8', padding: '0 4px', fontSize: '1rem', lineHeight: 1 }}
              >
                ×
              </button>
            </span>
          )}

          {/* Live Auto-Sync Active */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '5px 12px',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <span className="beacon-live"></span>
            <span>Live Auto-Sync Active</span>
          </div>

          {/* Top-Right View Switcher Options (Dashboard & Record) */}
          {setCurrentView && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(15, 23, 42, 0.95)',
              padding: '3px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
            }}>
              <button
                onClick={() => setCurrentView('dashboard')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '7px',
                  border: 'none',
                  background: currentView === 'dashboard' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'transparent',
                  color: currentView === 'dashboard' ? '#ffffff' : '#94a3b8',
                  fontWeight: currentView === 'dashboard' ? 700 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: currentView === 'dashboard' ? '0 2px 10px rgba(99, 102, 241, 0.45)' : 'none'
                }}
              >
                <Layers size={14} />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => setCurrentView('record')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '7px',
                  border: 'none',
                  background: currentView === 'record' ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : 'transparent',
                  color: currentView === 'record' ? '#ffffff' : '#94a3b8',
                  fontWeight: currentView === 'record' ? 700 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: currentView === 'record' ? '0 2px 10px rgba(37, 99, 235, 0.45)' : 'none'
                }}
              >
                <Calendar size={14} />
                <span>Record</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MAIN BODY: SIDEBAR + CALENDAR GRID (FIXED VIEWPORT) */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        
        {/* LEFT SIDEBAR (~275px) */}
        <div style={{
          width: '275px',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '10px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          background: 'rgba(10, 14, 23, 0.6)',
          flexShrink: 0,
          overflow: 'hidden'
        }}>
          
          {/* Mini Calendar Card (Compact) */}
          <div style={{
            background: 'rgba(16, 22, 34, 0.8)',
            padding: '8px 10px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            flexShrink: 0
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '5px'
            }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f8fafc' }}>
                October 2026
              </span>
              <div style={{ display: 'flex', gap: '2px' }}>
                <button
                  onClick={() => setSelectedDay(prev => Math.max(1, prev - 7))}
                  title="Previous Week"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '1px' }}
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  onClick={() => setSelectedDay(prev => Math.min(31, prev + 7))}
                  title="Next Week"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '1px' }}
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>

            {/* Days header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              textAlign: 'center',
              fontSize: '0.66rem',
              fontWeight: 700,
              color: 'var(--text-faint)',
              marginBottom: '4px'
            }}>
              <span>S</span>
              <span>M</span>
              <span>T</span>
              <span>W</span>
              <span>T</span>
              <span>F</span>
              <span>S</span>
            </div>

            {/* Days grid (Compact 5-Row Grid) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              rowGap: '2px',
              textAlign: 'center',
              fontSize: '0.68rem'
            }}>
              {miniCalendarDays.map((item, idx) => {
                const isSelected = item.day === selectedDay && item.inMonth;
                const isToday = item.day === 18 && item.inMonth;
                const isVisibleInMain = item.inMonth && daysHeader.some(dh => dh.date === item.day);
                const hasOutreach = item.inMonth && scheduledRecords.some(r => r.day === item.day);

                return (
                  <div
                    key={idx}
                    onClick={() => item.inMonth && setSelectedDay(item.day)}
                    title={item.inMonth ? `Select Oct ${item.day}` : ''}
                    style={{
                      height: '21px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: item.inMonth ? 'pointer' : 'default',
                      color: !item.inMonth ? 'var(--text-faint)' : (isSelected ? '#ffffff' : '#cbd5e1'),
                      fontWeight: isSelected ? 800 : (item.inMonth ? 600 : 400),
                      background: isSelected 
                        ? 'var(--primary)' 
                        : (isVisibleInMain ? 'rgba(99, 102, 241, 0.15)' : 'transparent'),
                      borderRadius: '50%',
                      margin: '0 auto',
                      width: '21px',
                      position: 'relative',
                      boxShadow: isSelected ? '0 0 10px var(--primary-glow)' : 'none',
                      border: isToday && !isSelected ? '1px solid rgba(99, 102, 241, 0.45)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{item.day}</span>
                    {/* The 4 dots indicating which 4 dates are currently visible in the main calendar */}
                    {isVisibleInMain && (
                      <span style={{
                        position: 'absolute',
                        bottom: '1px',
                        width: '3.5px',
                        height: '3.5px',
                        borderRadius: '50%',
                        background: isSelected ? '#ffffff' : '#38bdf8',
                        boxShadow: isSelected ? '0 0 6px rgba(255, 255, 255, 0.9)' : '0 0 6px #38bdf8'
                      }}></span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SEARCH & SELECT LEADS (SCROLLABLE LIST) */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '6px',
              flexShrink: 0
            }}>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                color: 'var(--text-muted)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}>
                DISCOVERED TARGETS ({displayLeads.length})
              </span>
            </div>

            {/* Search Input Box */}
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              marginBottom: '6px',
              flexShrink: 0
            }}>
              <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: '8px' }} />
              <input
                type="text"
                placeholder="Search business or niche..."
                value={searchLead}
                onChange={(e) => setSearchLead(e.target.value)}
                style={{
                  width: '100%',
                  padding: '5px 10px 5px 26px',
                  borderRadius: '7px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(16, 22, 34, 0.8)',
                  fontSize: '0.74rem',
                  color: '#fff',
                  outline: 'none'
                }}
              />
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '6px', flexWrap: 'wrap', flexShrink: 0 }}>
              {['ALL', 'App Development', 'Website Redesign'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '10px',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: activeCategory === cat ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                    color: activeCategory === cat ? '#a5b4fc' : 'var(--text-muted)'
                  }}
                >
                  {cat === 'ALL' ? 'All Niches' : (cat === 'App Development' ? 'Apps' : 'Web')}
                </button>
              ))}
            </div>

            {/* Independent Scrollable Lead list */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              paddingRight: '4px'
            }}>
              {filteredLeadsList.map((l) => {
                const isSelected = selectedLeadFilter && selectedLeadFilter.id === l.id;
                const isApp = l.category === 'App Development';

                return (
                  <div
                    key={l.id}
                    onClick={() => setSelectedLeadFilter(isSelected ? null : l)}
                    style={{
                      padding: '7px 10px',
                      borderRadius: '8px',
                      border: isSelected ? '1.5px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.06)',
                      background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 22, 34, 0.5)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
                        {l.business_name}
                      </span>
                      <span className={`badge ${isApp ? 'badge-app' : 'badge-web'}`} style={{ fontSize: '0.62rem', padding: '2px 6px' }}>
                        {isApp ? 'App' : 'Web'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {l.location && <span>📍 {l.location}</span>}
                      {l.contact_email && <span style={{ color: '#34d399' }}>✉ Email</span>}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

        </div>

        {/* RIGHT: MULTI-DAY TIME SCHEDULE GRID (24 HOURS CYCLE) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, background: 'rgba(7, 9, 14, 0.6)' }}>
          
          {/* 24-HOUR CYCLE TIME SELECTOR TOOLBAR */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            background: 'rgba(16, 22, 34, 0.7)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            flexWrap: 'wrap',
            gap: '8px',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={15} color="#38bdf8" />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                Full 24-Hour Schedule (12:00 AM to 12:00 AM Next Day)
              </span>
            </div>

            {/* Quick Time Period Jump Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: 'All 24 Hours' },
                { id: 'NIGHT', label: '🌙 Night (12 AM–6 AM)' },
                { id: 'MORNING', label: '🌅 Morning (6 AM–12 PM)' },
                { id: 'AFTERNOON', label: '☀️ Afternoon (12 PM–6 PM)' },
                { id: 'EVENING', label: '🌆 Evening (6 PM–12 AM)' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setTimeRangeFilter(p.id)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '8px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: timeRangeFilter === p.id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.06)',
                    color: timeRangeFilter === p.id ? '#ffffff' : 'var(--text-muted)',
                    boxShadow: timeRangeFilter === p.id ? '0 0 12px var(--primary-glow)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar Table Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '115px repeat(4, 1fr)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(16, 22, 34, 0.85)',
            flexShrink: 0
          }}>
            {/* Corner Cell: TIME */}
            <div style={{
              padding: '16px 12px',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: 'var(--text-muted)',
              letterSpacing: '0.08em',
              borderRight: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(10, 14, 23, 0.8)'
            }}>
              TIME (24H)
            </div>

            {/* Days Header */}
            {daysHeader.map((d, index) => {
              const isToday = d.isToday;
              const isSelected = d.isSelected;
              return (
                <div
                  key={index}
                  onClick={() => setSelectedDay(d.date)}
                  title={`Focus on Oct ${d.date}`}
                  style={{
                    padding: '12px 10px',
                    textAlign: 'center',
                    borderRight: index < 3 ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
                    background: isSelected ? 'rgba(99, 102, 241, 0.14)' : (isToday ? 'rgba(99, 102, 241, 0.06)' : 'transparent'),
                    borderTop: isSelected ? '2px solid var(--primary)' : '2px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    color: isSelected ? '#a5b4fc' : (isToday ? '#818cf8' : 'var(--text-muted)')
                  }}>
                    {d.dayName}
                  </span>
                  
                  {isToday ? (
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      boxShadow: '0 0 15px var(--primary-glow)'
                    }}>
                      {d.date}
                    </div>
                  ) : isSelected ? (
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(99, 102, 241, 0.25)',
                      border: '1.5px solid var(--primary)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      boxShadow: '0 0 10px var(--primary-glow)'
                    }}>
                      {d.date}
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc' }}>
                      {d.date}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Time Slot Rows Grid (Full 24-Hour Independently Scrollable Grid) */}
          <div style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            paddingRight: '2px'
          }}>
            {timeSlots.map((timeStr, rIdx) => {
              const isHour = timeStr.endsWith(':00 AM') || timeStr.endsWith(':00 PM') || timeStr.includes('Next Day');
              const isMidnight = timeStr.startsWith('12:00 AM');
              const isNoon = timeStr === '12:00 PM';

              return (
                <div
                  key={rIdx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '115px repeat(4, 1fr)',
                    minHeight: '48px',
                    borderBottom: isHour ? '1px solid rgba(255, 255, 255, 0.08)' : '1px dotted rgba(255, 255, 255, 0.04)',
                    background: isMidnight ? 'rgba(99, 102, 241, 0.05)' : (isNoon ? 'rgba(245, 158, 11, 0.04)' : 'transparent')
                  }}
                >
                  {/* Time label */}
                  <div style={{
                    padding: '6px 10px',
                    fontSize: '0.72rem',
                    fontWeight: isHour ? 800 : 500,
                    color: isHour ? '#f8fafc' : 'var(--text-faint)',
                    borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    background: isHour ? 'rgba(16, 22, 34, 0.6)' : 'rgba(10, 14, 23, 0.3)'
                  }}>
                    {isMidnight && <span>🌙</span>}
                    {isNoon && <span>☀️</span>}
                    <span>{timeStr}</span>
                  </div>

                  {/* 4 Day Columns */}
                  {daysHeader.map((d, cIdx) => {
                    const isToday = d.isToday;
                    const isSelected = d.isSelected;
                    // Find record matching this date & time
                    const record = scheduledRecords.find(a => 
                      a.day === d.date && a.time === timeStr &&
                      (!selectedLeadFilter || a.businessName.toLowerCase().includes(selectedLeadFilter.business_name.toLowerCase()))
                    );

                    const badgeStyle = record ? getRecordBadgeStyle(record.type) : null;

                    return (
                      <div
                        key={cIdx}
                        onClick={() => handleSlotClick(d.date, timeStr)}
                        style={{
                          borderRight: cIdx < 3 ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
                          background: isSelected ? 'rgba(99, 102, 241, 0.05)' : (isToday ? 'rgba(99, 102, 241, 0.02)' : 'transparent'),
                          padding: '4px 6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!record) e.currentTarget.style.background = isSelected ? 'rgba(99, 102, 241, 0.14)' : (isToday ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.04)');
                        }}
                        onMouseLeave={(e) => {
                          if (!record) e.currentTarget.style.background = isSelected ? 'rgba(99, 102, 241, 0.05)' : (isToday ? 'rgba(99, 102, 241, 0.02)' : 'transparent');
                        }}
                      >
                        {record ? (
                          <div style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '8px',
                            padding: '6px 8px',
                            fontSize: '0.74rem',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            background: badgeStyle.bg,
                            border: badgeStyle.border,
                            borderLeft: badgeStyle.borderLeft,
                            color: badgeStyle.text,
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                              <span style={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {record.businessName}
                              </span>
                              <span style={{
                                fontSize: '0.64rem',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: 'rgba(0, 0, 0, 0.3)',
                                fontWeight: 700
                              }}>
                                {record.type}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                              {record.subject}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

        </div>

      </div>

      {/* BOTTOM LEGEND BAR (PINNED) */}
      <div style={{
        padding: '10px 24px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(10, 14, 23, 0.95)',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
        fontSize: '0.78rem',
        color: 'var(--text-muted)',
        flexShrink: 0
      }}>
        <span style={{ fontWeight: 800, color: '#f8fafc', letterSpacing: '0.05em' }}>
          OUTREACH LEGEND:
        </span>

        {/* Dispatched */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></div>
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Autonomous Email Dispatched</span>
        </div>

        {/* Demo Call */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 8px #6366f1' }}></div>
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Client Demo Call / Meeting</span>
        </div>

        {/* Follow-up */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 8px #f59e0b' }}></div>
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Follow-up Queued</span>
        </div>

        {/* Notes/Comment */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MessageSquare size={14} color="#38bdf8" />
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Audit Findings & Notes</span>
        </div>

        {/* Today */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: 'var(--primary)',
            boxShadow: '0 0 8px var(--primary-glow)'
          }}></div>
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Today (Oct 18)</span>
        </div>
      </div>

      {/* SCHEDULE OUTREACH / DEMO MODAL */}
      {showScheduleModal && selectedSlot && (
        <div className="modal-backdrop" onClick={() => setShowScheduleModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: '24px', maxWidth: '480px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                  Schedule Outreach & Follow-up Slot
                </h3>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Target Business / Lead Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tejas Health Care or London Retail"
                  value={formBusiness}
                  onChange={(e) => setFormBusiness(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(0, 0, 0, 0.4)',
                    color: '#fff',
                    fontSize: '0.86rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Scheduled Date
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`${selectedSlot.date} October 2026`}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      background: 'rgba(255, 255, 255, 0.04)',
                      fontSize: '0.84rem',
                      color: 'var(--text-muted)'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Time Slot
                  </label>
                  <input
                    type="text"
                    disabled
                    value={selectedSlot.time}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      background: 'rgba(255, 255, 255, 0.04)',
                      fontSize: '0.84rem',
                      color: 'var(--text-muted)'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Event Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      fontSize: '0.84rem',
                      background: '#161e30',
                      color: '#fff',
                      outline: 'none'
                    }}
                  >
                    <option value="Dispatched">Autonomous Email Dispatch</option>
                    <option value="Demo Call">Client Demo Call / Meeting</option>
                    <option value="Follow-up">Automated Follow-up #1/#2</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Channel
                  </label>
                  <select
                    value={formChannel}
                    onChange={(e) => setFormChannel(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      fontSize: '0.84rem',
                      background: '#161e30',
                      color: '#fff',
                      outline: 'none'
                    }}
                  >
                    <option value="Gmail SMTP">Gmail / SMTP</option>
                    <option value="Google Meet">Google Meet</option>
                    <option value="Zoom Call">Zoom Call</option>
                    <option value="Phone Call">Direct Phone</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Email Subject / Call Agenda
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mobile App Concept & Speed Boost Architecture"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(0, 0, 0, 0.4)',
                    color: '#fff',
                    fontSize: '0.86rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Outreach Notes / Value Prop Hook
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes about client bottlenecks, proposed prototype or follow-up sequence..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(0, 0, 0, 0.4)',
                    color: '#fff',
                    fontSize: '0.84rem',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.84rem' }}
                >
                  Save Outreach Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
