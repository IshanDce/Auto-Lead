import React, { useState, useEffect } from 'react';
import {
  Zap,
  Globe,
  Smartphone,
  Mail,
  Send,
  RefreshCw,
  Settings,
  Terminal,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Clock,
  Search,
  Sparkles,
  ShieldCheck,
  Building2,
  Phone,
  MapPin,
  Trash2,
  Copy,
  ChevronRight,
  Sliders,
  Play,
  Pause,
  Layers,
  Database,
  Calendar
} from 'lucide-react';
import LeadOutreachRecord from './LeadOutreachRecord';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8001';

export default function App() {
  const [leads, setLeads] = useState([]);
  const [metrics, setMetrics] = useState({
    total_leads: 0,
    total_sent: 0,
    emails_found: 0,
    app_leads: 0,
    web_leads: 0,
    pending_leads: 0
  });
  const [settings, setSettings] = useState({});
  const [logs, setLogs] = useState([]);
  
  // UI States
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [isCrawling, setIsCrawling] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'record'
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isTestingSMTP, setIsTestingSMTP] = useState(false);

  // Show Toast
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Fetch all initial data
  const loadData = async () => {
    try {
      const [leadsRes, metricsRes, settingsRes] = await Promise.all([
        fetch(`${API_BASE}/api/leads`),
        fetch(`${API_BASE}/api/metrics`),
        fetch(`${API_BASE}/api/settings`)
      ]);
      if (leadsRes.ok) setLeads(await leadsRes.json());
      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (settingsRes.ok) setSettings(await settingsRes.json());
    } catch (e) {
      console.error('Failed to load data:', e);
    }
  };

  const loadLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/logs`);
      if (res.ok) setLogs(await res.json());
    } catch (e) {
      console.error('Failed to load logs:', e);
    }
  };

  useEffect(() => {
    loadData();
    // Poll updates every 6 seconds for live crawler events
    const interval = setInterval(() => {
      loadData();
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (showLogsModal) {
      loadLogs();
      const logInterval = setInterval(loadLogs, 3000);
      return () => clearInterval(logInterval);
    }
  }, [showLogsModal]);

  // Sync selected lead changes to edit inputs
  useEffect(() => {
    if (selectedLead) {
      setEditedSubject(selectedLead.pitch_subject || '');
      setEditedBody(selectedLead.pitch_body || '');
    }
  }, [selectedLead]);

  // Lock window and document scrolling when viewing Records screen
  useEffect(() => {
    if (currentView === 'record') {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.height = '100vh';
    } else {
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
      document.body.style.height = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
      document.body.style.height = 'auto';
    };
  }, [currentView]);

  // Actions
  const handleTriggerCrawl = async () => {
    setIsCrawling(true);
    showToast('🚀 Crawling sweep initiated across Google Maps & Freelance boards...');
    try {
      await fetch(`${API_BASE}/api/crawler/trigger`, { method: 'POST' });
      setTimeout(() => {
        loadData();
        setIsCrawling(false);
        showToast('✅ Crawl cycle complete! New leads populated.');
      }, 3500);
    } catch (e) {
      setIsCrawling(false);
      showToast('❌ Crawl error: ' + e.message);
    }
  };

  const handleToggleCrawler = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/crawler/toggle`, { method: 'POST' });
      const data = await res.json();
      setSettings(prev => ({ ...prev, crawler_active: String(data.crawler_active) }));
      showToast(data.crawler_active ? '🟢 24/7 Crawler Engine ACTIVATED' : '⏸️ 24/7 Crawler Engine PAUSED');
    } catch (e) {
      showToast('Failed to toggle crawler');
    }
  };

  const handleToggleAutonomous = async () => {
    const newVal = settings.autonomous_mode === 'true' ? 'false' : 'true';
    try {
      await fetch(`${API_BASE}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { autonomous_mode: newVal } })
      });
      setSettings(prev => ({ ...prev, autonomous_mode: newVal }));
      showToast(newVal === 'true' ? '⚡ 100% Autonomous Auto-Pilot ON: Leads emailed instantly!' : '🛡️ Auto-Pilot OFF: Review mode enabled');
    } catch (e) {
      showToast('Failed to update autonomous mode');
    }
  };

  const handleSeedLeads = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/seed-leads`, { method: 'POST' });
      const data = await res.json();
      loadData();
      showToast(`✨ Successfully imported ${data.seeded} high-converting client leads!`);
    } catch (e) {
      showToast('Failed to seed leads');
    }
  };

  const handleSendEmail = async (leadId) => {
    setIsSending(true);
    try {
      // First save edits if in modal
      if (selectedLead && selectedLead.id === leadId) {
        await fetch(`${API_BASE}/api/leads/${leadId}/update-pitch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pitch_subject: editedSubject, pitch_body: editedBody })
        });
      }

      const res = await fetch(`${API_BASE}/api/leads/${leadId}/send`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('✉️ Cold email dispatched successfully!');
        if (selectedLead && selectedLead.id === leadId) {
          setSelectedLead(data.lead);
        }
      } else {
        showToast('⚠️ Send warning: ' + data.message);
      }
      loadData();
    } catch (e) {
      showToast('Failed to send email: ' + e.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleRegeneratePitch = async (leadId) => {
    setIsRegenerating(true);
    try {
      const res = await fetch(`${API_BASE}/api/leads/${leadId}/generate-pitch`, { method: 'POST' });
      const data = await res.json();
      setEditedSubject(data.subject);
      setEditedBody(data.body);
      showToast('✨ AI pitch refreshed with updated value props!');
      loadData();
    } catch (e) {
      showToast('Failed to regenerate pitch');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDeleteLead = async (leadId) => {
    try {
      await fetch(`${API_BASE}/api/leads/${leadId}`, { method: 'DELETE' });
      showToast('Lead removed');
      if (selectedLead && selectedLead.id === leadId) setSelectedLead(null);
      loadData();
    } catch (e) {
      showToast('Failed to delete lead');
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${API_BASE}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });
      showToast('✅ Settings & SMTP credentials saved!');
      setShowSettingsModal(false);
    } catch (e) {
      showToast('Failed to save settings');
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      showToast('⚠️ Please enter a valid test email address');
      return;
    }
    setIsTestingSMTP(true);
    showToast('📨 Sending test email verification...');
    try {
      // First save current settings to backend
      await fetch(`${API_BASE}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });
      const res = await fetch(`${API_BASE}/api/smtp/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_email: testEmailAddress })
      });
      const data = await res.json();
      if (data.success) {
        showToast('✅ Test email delivered successfully! Check your inbox.');
      } else {
        showToast('❌ SMTP Error: ' + (data.message || 'Delivery failed'));
      }
    } catch (e) {
      showToast('❌ Network error: ' + e.message);
    } finally {
      setIsTestingSMTP(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard: ' + text);
  };

  // Filtered Leads
  const filteredLeads = leads.filter(l => {
    if (activeTab === 'APP' && l.category !== 'App Development') return false;
    if (activeTab === 'WEB' && l.category !== 'Website Redesign') return false;
    if (activeTab === 'SENT' && l.status !== 'SENT') return false;
    if (activeTab === 'PENDING' && l.status === 'SENT') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = l.business_name?.toLowerCase().includes(q);
      const matchEmail = l.contact_email?.toLowerCase().includes(q);
      const matchLoc = l.location?.toLowerCase().includes(q);
      const matchUrl = l.website_url?.toLowerCase().includes(q);
      return matchName || matchEmail || matchLoc || matchUrl;
    }
    return true;
  });

  const isAutonomous = settings.autonomous_mode === 'true';
  const isCrawlerActive = settings.crawler_active === 'true';

  return (
    <div style={{
      height: currentView === 'record' ? '100vh' : 'auto',
      minHeight: '100vh',
      maxHeight: currentView === 'record' ? '100vh' : 'none',
      padding: currentView === 'record' ? '10px 16px' : '24px 32px',
      maxWidth: currentView === 'record' ? '1680px' : '1600px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      overflow: currentView === 'record' ? 'hidden' : 'visible',
      boxSizing: 'border-box'
    }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid var(--primary)',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-lg), 0 0 20px var(--primary-glow)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          <Sparkles size={18} color="var(--primary)" />
          {toastMessage}
        </div>
      )}

      {/* Top navigation shown only in Dashboard view */}
      {currentView === 'dashboard' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '20px',
          paddingBottom: '14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--primary)',
              boxShadow: '0 0 10px var(--primary)'
            }}></div>
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc' }}>
              AutoLead AI Engine • Realtime Dashboard
            </span>
          </div>

          {/* Top-Right Corner: 2 Options (Dashboard & Record) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(15, 23, 42, 0.95)',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
          }}>
            <button
              onClick={() => setCurrentView('dashboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 2px 10px rgba(99, 102, 241, 0.45)'
              }}
            >
              <Layers size={15} />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setCurrentView('record')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                background: 'transparent',
                color: '#94a3b8',
                fontWeight: 500,
                fontSize: '0.86rem',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              <Calendar size={15} />
              <span>Record</span>
            </button>
          </div>
        </div>
      )}

      {currentView === 'record' ? (
        <LeadOutreachRecord leads={leads} currentView={currentView} setCurrentView={setCurrentView} />
      ) : (
        <>
      {/* TOP HEADER */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-cyan) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 24px var(--primary-glow)'
          }}>
            <Zap size={24} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.65rem' }}>AutoLead <span className="gradient-accent">AI</span></h1>
              <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                v2.5 Autonomous
              </span>
              {metrics.database_mode && (
                <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Database size={11} /> {metrics.database_mode}
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              24/7 Continuous Web & App Development Lead Crawler with Autonomous Cold Outreach
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          
          {/* Crawler Switch */}
          <button
            onClick={handleToggleCrawler}
            className={`btn ${isCrawlerActive ? 'btn-emerald' : 'btn-secondary'}`}
            style={{ fontSize: '0.82rem', padding: '8px 14px' }}
          >
            {isCrawlerActive ? (
              <>
                <span className="beacon-live"></span>
                <span>Crawler: 24/7 Active</span>
              </>
            ) : (
              <>
                <Pause size={14} />
                <span>Crawler: Paused</span>
              </>
            )}
          </button>

          {/* Autonomous Mode Toggle */}
          <button
            onClick={handleToggleAutonomous}
            className={`btn ${isAutonomous ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.82rem', padding: '8px 14px' }}
            title="When active, emails are dispatched autonomously without manual approval"
          >
            <ShieldCheck size={16} />
            <span>Auto-Pilot: {isAutonomous ? '100% Autonomous' : 'Review Mode'}</span>
          </button>

          {/* Trigger Sweep Now */}
          <button
            onClick={handleTriggerCrawl}
            disabled={isCrawling}
            className="btn btn-cyber"
            style={{ fontSize: '0.82rem', padding: '8px 14px' }}
          >
            <RefreshCw size={15} className={isCrawling ? 'spin-slow' : ''} />
            <span>{isCrawling ? 'Sweeping...' : 'Sweep Now'}</span>
          </button>

          {/* Live Logs */}
          <button
            onClick={() => setShowLogsModal(true)}
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', padding: '8px 14px' }}
          >
            <Terminal size={15} />
            <span>Logs</span>
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', padding: '8px 14px' }}
          >
            <Settings size={15} />
            <span>Settings</span>
          </button>

          {/* Seed Demo Leads if empty */}
          {leads.length === 0 && (
            <button
              onClick={handleSeedLeads}
              className="btn btn-primary"
              style={{ fontSize: '0.82rem', padding: '8px 14px' }}
            >
              <Sparkles size={15} />
              <span>Seed High-Converting Leads</span>
            </button>
          )}
        </div>
      </header>

      {/* KPI METRICS RIBBON */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        {/* Card 1: Total Leads */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL DISCOVERED</span>
            <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '6px', borderRadius: '8px' }}>
              <Layers size={18} color="var(--primary)" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, margin: '8px 0 4px 0' }}>{metrics.total_leads}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Continuous multi-source sweep
          </div>
        </div>

        {/* Card 2: Valid Emails */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>CONTACTS EXTRACTED</span>
            <div style={{ background: 'rgba(6, 182, 212, 0.15)', padding: '6px', borderRadius: '8px' }}>
              <Mail size={18} color="var(--accent-cyan)" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, margin: '8px 0 4px 0', color: '#38bdf8' }}>{metrics.emails_found}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {metrics.total_leads > 0 ? Math.round((metrics.emails_found / metrics.total_leads) * 100) : 0}% discovery rate
          </div>
        </div>

        {/* Card 3: Autonomous Outreaches */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>AUTONOMOUS SENDS</span>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '6px', borderRadius: '8px' }}>
              <Send size={18} color="var(--accent-emerald)" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, margin: '8px 0 4px 0', color: '#34d399' }}>{metrics.total_sent}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Daily Quota: {metrics.total_sent} / {settings.daily_send_limit || 30} safe sends
          </div>
        </div>

        {/* Card 4: High Value App & Web Leads */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>OPPORTUNITY SPLIT</span>
            <div style={{ background: 'rgba(139, 92, 246, 0.15)', padding: '6px', borderRadius: '8px' }}>
              <Smartphone size={18} color="var(--accent-violet)" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#38bdf8' }}>{metrics.app_leads}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>App Dev</div>
            </div>
            <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '14px' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#c084fc' }}>{metrics.web_leads}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Web Redesign</div>
            </div>
          </div>
        </div>
      </section>

      {/* AUTONOMOUS AUTO-PILOT BANNER */}
      <section className="glass-panel" style={{
        padding: '16px 22px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        background: isAutonomous 
          ? 'linear-gradient(90deg, rgba(99, 102, 241, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)'
          : 'var(--bg-card)',
        border: isAutonomous ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: isAutonomous ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {isAutonomous ? <CheckCircle size={20} color="var(--accent-emerald)" /> : <Clock size={20} color="var(--accent-amber)" />}
          </div>
          <div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700 }}>
              {isAutonomous ? '100% Autonomous Pilot Active: Crawling & Sending in Real-Time' : 'Review & Approval Mode: Drafts generated, manual trigger active'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Target Niches: Dental & Medical Clinics, Real Estate Agencies, Gyms, E-Commerce Brands | Locations: NYC, London, Austin, Toronto
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleSeedLeads}
            className="btn btn-secondary"
            style={{ fontSize: '0.78rem', padding: '6px 12px' }}
          >
            <Sparkles size={14} color="#fbbf24" />
            <span>Inject Sample Leads</span>
          </button>
        </div>
      </section>

      {/* FILTER & SEARCH BAR */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px'
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: `All Leads (${leads.length})` },
            { id: 'APP', label: `📱 App Dev (${metrics.app_leads})` },
            { id: 'WEB', label: `🌐 Website Redesign (${metrics.web_leads})` },
            { id: 'SENT', label: `✅ Sent (${metrics.total_sent})` },
            { id: 'PENDING', label: `⏳ Pending (${metrics.pending_leads})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '0.84rem',
                fontWeight: 600,
                background: activeTab === tab.id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                color: activeTab === tab.id ? '#fff' : 'var(--text-muted)',
                border: activeTab === tab.id ? '1px solid var(--primary-glow)' : '1px solid var(--border-subtle)'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', minWidth: '280px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search leads, niche, city, tech..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '38px', borderRadius: '10px' }}
          />
        </div>
      </div>

      {/* LEADS GRID */}
      {filteredLeads.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', borderRadius: '16px' }}>
          <Building2 size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No leads found in this view</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '460px', margin: '0 auto 20px auto' }}>
            The background crawler is actively searching Google Maps, Reddit, and Freelance networks. You can trigger an immediate sweep or seed instant client leads.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button onClick={handleTriggerCrawl} className="btn btn-cyber">
              <RefreshCw size={15} /> Run Live Sweep Now
            </button>
            <button onClick={handleSeedLeads} className="btn btn-primary">
              <Sparkles size={15} /> Seed High-Converting Leads
            </button>
          </div>
        </div>
      ) : (
        <div className="grid-cards">
          {filteredLeads.map((lead) => {
            const analysis = lead.website_analysis || {};
            const score = analysis.opportunity_score || 85;
            const flags = analysis.audit_flags || [];

            return (
              <div
                key={lead.id}
                className="glass-panel"
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  borderLeft: lead.category === 'App Development' 
                    ? '3px solid var(--accent-cyan)' 
                    : '3px solid var(--accent-violet)'
                }}
              >
                {/* Header: Name + Category */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '1.05rem', lineHeight: 1.3 }}>
                      {lead.business_name}
                    </h3>
                    <span className={`badge ${lead.category === 'App Development' ? 'badge-app' : 'badge-web'}`}>
                      {lead.category === 'App Development' ? '📱 App Dev' : '🌐 Web Dev'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    <span>{lead.source}</span>
                    {lead.location && (
                      <>
                        <span>•</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} /> {lead.location}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Opportunity Score Meter */}
                  <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Digital Opportunity Score</span>
                      <span style={{ fontWeight: 700, color: score > 90 ? '#34d399' : '#38bdf8' }}>{score}% Match</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${score}%`,
                        height: '100%',
                        background: score > 90 ? 'linear-gradient(90deg, #10b981, #06b6d4)' : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                        borderRadius: '3px'
                      }}></div>
                    </div>
                  </div>

                  {/* Audit Findings / Flaws */}
                  {flags.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '12px' }}>
                      {flags.slice(0, 2).map((flag, idx) => (
                        <div key={idx} style={{
                          fontSize: '0.75rem',
                          background: 'rgba(245, 158, 11, 0.08)',
                          color: '#fbbf24',
                          border: '1px solid rgba(245, 158, 11, 0.2)',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <AlertTriangle size={12} />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{flag}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Contact Info */}
                  <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {lead.contact_email ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8' }}>
                          <Mail size={13} /> {lead.contact_email}
                        </span>
                        <button
                          onClick={() => copyToClipboard(lead.contact_email)}
                          style={{ background: 'transparent', padding: '2px', color: 'var(--text-muted)' }}
                          title="Copy Email"
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-faint)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mail size={13} /> Crawling contact page...
                      </span>
                    )}

                    {lead.website_url && (
                      <a
                        href={lead.website_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', textDecoration: 'none' }}
                      >
                        <Globe size={13} />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.website_url}</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Footer: Status + Actions */}
                <div style={{
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  {/* Status Badge */}
                  <div>
                    {lead.status === 'SENT' && <span className="badge badge-sent"><CheckCircle size={11} /> Sent</span>}
                    {lead.status === 'DRAFTED' && <span className="badge badge-drafted"><Clock size={11} /> Pitch Ready</span>}
                    {lead.status === 'DISCOVERED' && <span className="badge badge-discovered"><Search size={11} /> Discovered</span>}
                    {lead.status === 'FAILED' && <span className="badge badge-failed"><AlertTriangle size={11} /> Failed</span>}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setSelectedLead(lead)}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                      title="Inspect Audit & Edit AI Pitch"
                    >
                      <Sparkles size={13} color="var(--primary)" />
                      <span>Review Pitch</span>
                    </button>

                    {lead.status !== 'SENT' && lead.contact_email && (
                      <button
                        onClick={() => handleSendEmail(lead.id)}
                        disabled={isSending}
                        className="btn btn-cyber"
                        style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        title="Send Cold Pitch Now"
                      >
                        <Send size={13} />
                        <span>Shoot</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteLead(lead.id)}
                      style={{ background: 'transparent', color: 'var(--text-faint)', padding: '6px' }}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* LEAD AUDIT & AI PITCH MODAL */}
      {selectedLead && (
        <div className="modal-backdrop" onClick={() => setSelectedLead(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: '28px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ fontSize: '1.4rem' }}>{selectedLead.business_name}</h2>
                  <span className={`badge ${selectedLead.category === 'App Development' ? 'badge-app' : 'badge-web'}`}>
                    {selectedLead.category}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {selectedLead.website_url} • {selectedLead.location || 'Global'}
                </div>
              </div>

              <button
                onClick={() => setSelectedLead(null)}
                style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '6px 12px', color: '#fff' }}
              >
                ✕ Close
              </button>
            </div>

            {/* Technical Audit Summary */}
            <div style={{
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <h4 style={{ fontSize: '0.86rem', color: '#38bdf8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Technical Inspection Findings
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '0.8rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Mobile Responsive: </span>
                  <span style={{ fontWeight: 600, color: selectedLead.website_analysis?.mobile_responsive ? '#34d399' : '#fb7185' }}>
                    {selectedLead.website_analysis?.mobile_responsive ? 'Yes' : 'No Viewport (Poor UX)'}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Native Mobile App: </span>
                  <span style={{ fontWeight: 600, color: selectedLead.website_analysis?.has_mobile_app ? '#34d399' : '#fb7185' }}>
                    {selectedLead.website_analysis?.has_mobile_app ? 'Detected' : 'None (High App Dev Signal)'}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Load Speed: </span>
                  <span style={{ fontWeight: 600 }}>
                    {selectedLead.website_analysis?.load_speed_ms || 1400}ms
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Tech Stack: </span>
                  <span style={{ fontWeight: 600, color: '#c084fc' }}>
                    {(selectedLead.website_analysis?.tech_stack || []).join(', ') || 'Custom Web'}
                  </span>
                </div>
              </div>

              {selectedLead.website_analysis?.audit_flags?.length > 0 && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {selectedLead.website_analysis.audit_flags.map((f, i) => (
                    <div key={i} style={{ fontSize: '0.78rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangle size={13} /> {f}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Pitch Editor */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Personalized Cold Email Pitch</label>
                <button
                  onClick={() => handleRegeneratePitch(selectedLead.id)}
                  disabled={isRegenerating}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  <Sparkles size={12} color="var(--primary)" />
                  <span>{isRegenerating ? 'Rewriting with AI...' : 'Regenerate Pitch'}</span>
                </button>
              </div>

              {/* Subject */}
              <div style={{ marginBottom: '14px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Subject Line:</span>
                <input
                  type="text"
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  style={{ marginTop: '4px', fontWeight: 600 }}
                />
              </div>

              {/* Body */}
              <div style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email Pitch Body:</span>
                <textarea
                  rows={10}
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  style={{ marginTop: '4px', lineHeight: 1.6, fontFamily: 'var(--font-sans)', fontSize: '0.88rem' }}
                />
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Recipient: <strong style={{ color: '#38bdf8' }}>{selectedLead.contact_email || 'No email available'}</strong>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setSelectedLead(null)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={() => handleSendEmail(selectedLead.id)}
                    disabled={isSending || !selectedLead.contact_email}
                    className="btn btn-primary"
                    style={{ padding: '10px 20px' }}
                  >
                    <Send size={16} />
                    <span>{isSending ? 'Dispatching...' : selectedLead.status === 'SENT' ? 'Re-Send Email' : 'Shoot Cold Email Now'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS & SMTP CONFIGURATION MODAL */}
      {showSettingsModal && (
        <div className="modal-backdrop" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Settings size={22} color="var(--primary)" />
                <h2 style={{ fontSize: '1.35rem' }}>AutoLead Configuration & SMTP</h2>
              </div>
              <button onClick={() => setShowSettingsModal(false)} style={{ background: 'transparent', color: '#fff', fontSize: '1.2rem' }}>✕</button>
            </div>

            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Autonomous Mode Toggle */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>100% Fully Autonomous Outreach</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    When enabled, newly discovered leads with valid emails are automatically analyzed and pitched without waiting for approval.
                  </div>
                </div>
                <select
                  value={settings.autonomous_mode || 'true'}
                  onChange={e => setSettings({ ...settings, autonomous_mode: e.target.value })}
                  style={{ width: 'auto', fontWeight: 600 }}
                >
                  <option value="true">Enabled (100% Autonomous)</option>
                  <option value="false">Disabled (Review Mode)</option>
                </select>
              </div>

              {/* Simulation Mode Toggle */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>Sandbox Simulation Mode</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Simulates instant delivery with full activity logs if you want to test before entering live Gmail credentials.
                  </div>
                </div>
                <select
                  value={settings.simulation_mode || 'false'}
                  onChange={e => setSettings({ ...settings, simulation_mode: e.target.value })}
                  style={{ width: 'auto', fontWeight: 600 }}
                >
                  <option value="false">Live SMTP Dispatch</option>
                  <option value="true">Sandbox Simulation (Test)</option>
                </select>
              </div>

              {/* Gmail / SMTP Settings */}
              <div>
                <h4 style={{ fontSize: '0.86rem', color: '#38bdf8', marginBottom: '10px', textTransform: 'uppercase' }}>
                  Email Delivery &amp; SMTP Credentials (Gmail, SendGrid, Brevo, Custom SMTP)
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Sender Display Name</label>
                    <input
                      type="text"
                      placeholder="Alex from Apex Studio"
                      value={settings.from_name || ''}
                      onChange={e => setSettings({ ...settings, from_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Daily Send Limit (Safety)</label>
                    <input
                      type="number"
                      value={settings.daily_send_limit || '30'}
                      onChange={e => setSettings({ ...settings, daily_send_limit: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>SMTP Host Server</label>
                    <input
                      type="text"
                      placeholder="smtp.gmail.com"
                      value={settings.smtp_host || 'smtp.gmail.com'}
                      onChange={e => setSettings({ ...settings, smtp_host: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>SMTP Port</label>
                    <input
                      type="text"
                      placeholder="587"
                      value={settings.smtp_port || '587'}
                      onChange={e => setSettings({ ...settings, smtp_port: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Sender Email / Username</label>
                    <input
                      type="text"
                      placeholder="youremail@gmail.com or api_user"
                      value={settings.smtp_user || ''}
                      onChange={e => setSettings({ ...settings, smtp_user: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Password / App Password / API Key</label>
                    <input
                      type="password"
                      placeholder="16-char App Password or API Key"
                      value={settings.smtp_pass || ''}
                      onChange={e => setSettings({ ...settings, smtp_pass: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '8px', marginBottom: '12px' }}>
                  💡 <strong>Gmail Guide:</strong> Go to Google Account &gt; Security &gt; 2-Step Verification &gt; App Passwords. Generate an App Password for &quot;Mail&quot; and paste it above!
                </div>

                {/* Test Email Verification Box */}
                <div style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
                      Verify Credentials (Send Test Email)
                    </div>
                    <input
                      type="email"
                      placeholder="Enter your personal email to verify..."
                      value={testEmailAddress}
                      onChange={e => setTestEmailAddress(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: '0.8rem', width: '100%' }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendTestEmail}
                    disabled={isTestingSMTP}
                    className="btn btn-secondary"
                    style={{ padding: '8px 16px', fontSize: '0.8rem', alignSelf: 'flex-end', whiteSpace: 'nowrap' }}
                  >
                    {isTestingSMTP ? 'Sending...' : '📨 Send Test'}
                  </button>
                </div>
              </div>

              {/* Google Gemini API Key */}
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Google Gemini API Key (Optional)</label>
                <input
                  type="password"
                  placeholder="AIzaSy... (Leave empty to use high-converting heuristic engine)"
                  value={settings.gemini_api_key || ''}
                  onChange={e => setSettings({ ...settings, gemini_api_key: e.target.value })}
                />
              </div>

              {/* Crawler Sweeping Interval */}
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>24/7 Sweep Interval (Minutes)</label>
                <input
                  type="number"
                  min="3"
                  max="120"
                  value={settings.crawl_interval_minutes || '10'}
                  onChange={e => setSettings({ ...settings, crawl_interval_minutes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowSettingsModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px' }}>
                  Save All Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIVE ACTIVITY LOGS MODAL */}
      {showLogsModal && (
        <div className="modal-backdrop" onClick={() => setShowLogsModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '850px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Terminal size={20} color="var(--accent-emerald)" />
                <h3 style={{ fontSize: '1.2rem' }}>Continuous Crawler & Outreach Logs</h3>
              </div>
              <button onClick={() => setShowLogsModal(false)} style={{ background: 'transparent', color: '#fff', fontSize: '1.1rem' }}>✕</button>
            </div>

            <div style={{
              background: '#04070d',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '16px',
              height: '420px',
              overflowY: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.78rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              {logs.length === 0 ? (
                <div style={{ color: 'var(--text-faint)' }}>Awaiting background crawler events...</div>
              ) : (
                logs.map(log => {
                  let color = '#94a3b8';
                  if (log.level === 'SUCCESS') color = '#34d399';
                  if (log.level === 'WARNING') color = '#fbbf24';
                  if (log.level === 'ERROR') color = '#fb7185';

                  return (
                    <div key={log.id} style={{ display: 'flex', gap: '8px', lineHeight: 1.4 }}>
                      <span style={{ color: 'var(--text-faint)' }}>[{log.timestamp.split('T')[1]?.slice(0, 8)}]</span>
                      <span style={{ color: 'var(--primary)', fontWeight: 600 }}>[{log.module}]</span>
                      <span style={{ color }}>{log.message}</span>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Auto-refreshes every 3 seconds</span>
              <button onClick={loadLogs} className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.78rem' }}>
                <RefreshCw size={12} /> Refresh Logs
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
