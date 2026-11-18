import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, ArrowDownUp, ArrowRight, Bell, CalendarDays, Check, CircleAlert, Compass, Download, Filter, LayoutDashboard, MapPin, Menu, Plus, Search, Sparkles, Ticket, Users, X } from 'lucide-react';
import { api, listFrom } from './api';
import './styles.css';

const roles = ['Student', 'Organizer', 'Admin'];
const icons = { Student: Compass, Organizer: LayoutDashboard, Admin: Activity };
const dateValue = (e) => e.date || e.start_date || e.starts_at || e.event_date || e.datetime;
const titleValue = (e) => e.title || e.name || 'Campus event';
const idValue = (e) => e.id || e.event_id;
const capacityValue = (e) => Number(e.capacity || e.max_attendees || 0);
const locationValue = (e) => e.location || e.venue || e.place || 'Campus venue';
const categories = ['All events', 'Technology', 'Career', 'Arts & culture', 'Community'];
const pics = [
  'photo-1516321318423-f06f85e504b3', 'photo-1515187029135-18ee286d815b', 'photo-1523580494863-6f3031224c94',
  'photo-1517245386807-bb43f82c33c4', 'photo-1511795409834-ef04bbd61622', 'photo-1528605248644-14dd04022da1',
];
const art = (i) => `https://images.unsplash.com/${pics[i % pics.length]}?auto=format&fit=crop&w=1100&q=85`;

function App() {
  const [role, setRole] = useState('Student');
  const [page, setPage] = useState('Explore events');
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All events');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState(null);
  const [modal, setModal] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', location: '', capacity: '', description: '' });

  const notify = (message, kind = 'ok') => { setNotice({ message, kind }); window.setTimeout(() => setNotice(null), 4200); };
  const loadEvents = useCallback(async () => {
    setLoading(true);
    try { setEvents(listFrom(await api.events())); }
    catch (error) { setEvents([]); notify(`Could not load events: ${error.message}`, 'error'); }
    finally { setLoading(false); }
  }, []);
  const loadRegistrations = useCallback(async () => {
    try { setRegistrations(listFrom(await api.myRegistrations())); }
    catch (error) { setRegistrations([]); notify(`Could not load registrations: ${error.message}`, 'error'); }
  }, []);
  useEffect(() => { loadEvents(); loadRegistrations(); }, [loadEvents, loadRegistrations]);
  useEffect(() => { if (page === 'My registrations') loadRegistrations(); }, [page, loadRegistrations]);

  const myEventIds = useMemo(() => new Set(registrations.map(r => String(r.event_id || r.event?.id || r.id))), [registrations]);
  const filteredEvents = useMemo(() => events.filter(e => {
    const text = `${titleValue(e)} ${e.description || ''} ${e.category || e.track || ''} ${locationValue(e)}`.toLowerCase();
    const cat = category === 'All events' || `${e.category || e.track || ''}`.toLowerCase().includes(category.split(' ')[0].toLowerCase());
    return text.includes(query.toLowerCase()) && cat;
  }), [events, query, category]);
  const goRole = (next) => {
    setRole(next); setPage(next === 'Student' ? 'Explore events' : `${next} overview`); setMobileNav(false);
  };
  const goPage = (next) => { setPage(next); setMobileNav(false); };

  async function register(event) {
    const id = idValue(event);
    if (!id) return notify('This event has no ID, so registration is unavailable.', 'error');
    setBusy(String(id));
    try { await api.register(id); notify('You’re registered. Your campus pass is ready.'); await loadRegistrations(); }
    catch (error) { notify(error.status === 409 ? 'You’re already registered for this event.' : `Registration failed: ${error.message}`, 'error'); }
    finally { setBusy(''); }
  }
  async function showAttendees(event) {
    setSelected(event); setAttendees([]);
    try { setAttendees(listFrom(await api.attendees(idValue(event)))); }
    catch (error) { notify(`Could not load attendee list: ${error.message}`, 'error'); }
  }
  function exportCsv() {
    const rows = [['Event', 'Date', 'Location', 'Status'], ...events.map(e => [titleValue(e), dateValue(e) || '', locationValue(e), e.status || 'Upcoming'])];
    const csv = rows.map(row => row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = 'campusconnect-events.csv'; link.click(); URL.revokeObjectURL(link.href);
  }
  async function submitEvent(e) {
    e.preventDefault();
    notify('Event creation is not available in the supplied API endpoints.', 'error');
    setModal(false);
  }

  const navItems = role === 'Student' ? [['Explore events', Compass], ['My registrations', Ticket]] : role === 'Organizer' ? [['Organizer overview', LayoutDashboard], ['My events', CalendarDays]] : [['Admin overview', Activity], ['Events', CalendarDays], ['Attendees', Users]];
  const heading = page === 'Explore events' ? 'Find your next moment' : page === 'My registrations' ? 'Your campus passes' : page;
  const isExplore = page === 'Explore events';
  const pageEvents = page === 'My registrations' ? events.filter(e => myEventIds.has(String(idValue(e)))) : filteredEvents;
  const totalSeats = events.reduce((sum, e) => sum + Math.max(0, capacityValue(e)), 0);

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <a className="brand" href="#top" onClick={() => goPage(role === 'Student' ? 'Explore events' : `${role} overview`)}><span className="brand-mark"><Sparkles size={19}/></span><span>campus<span className="brand-light">connect</span></span></a>
      <div className="workspace-label">WORKSPACE</div>
      <button className="role-switch" onClick={() => goRole(roles[(roles.indexOf(role) + 1) % roles.length])}><span className={`role-dot ${role.toLowerCase()}`}></span><span><small>ACTIVE VIEW</small><b>{role} dashboard</b></span><ArrowDownUp size={16}/></button>
      <div className="side-caption">MENU</div>
      <nav className="side-nav">{navItems.map(([label, Icon]) => <button key={label} className={`nav-link ${page.toLowerCase() === label.toLowerCase() ? 'active' : ''}`} onClick={() => goPage(label)}><Icon size={18}/>{label}<ArrowRight className="nav-arrow" size={14}/></button>)}</nav>
      <div className="sidebar-bottom"><div className="campus-card"><div className="campus-icon"><Sparkles size={16}/></div><b>Your campus, in motion.</b><p>Discover people, ideas and experiences happening around you.</p><button onClick={() => goPage('Explore events')}>Explore events <ArrowRight size={14}/></button></div><div className="profile"><div className="avatar">{role === 'Student' ? 'S' : role[0]}</div><div><b>{role === 'Student' ? 'Campus guest' : `${role} workspace`}</b><small>Anonymous session</small></div><span className="online-dot"/></div></div>
    </aside>
    {mobileNav && <button className="scrim" onClick={() => setMobileNav(false)} aria-label="Close menu"/>}
    <main className="main-area" id="top">
      <header className="topbar"><button className="mobile-menu icon-button" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={20}/></button><div className="breadcrumb">Workspace <span>/</span> <b>{page}</b></div><div className="top-actions"><label className="top-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search events..."/><kbd>⌘ K</kbd></label><button className="icon-button notification" onClick={() => notify('You’re all caught up.')} aria-label="Notifications"><Bell size={18}/><i/></button><div className="mini-avatar">{role[0]}</div></div></header>
      <div className="content">
        <div className="welcome-row"><div><div className="eyebrow"><span className="live-dot"/> YOUR CAMPUS, CONNECTED</div><h1>{heading}<span className="title-period">.</span></h1><p className="subtitle">{isExplore ? 'Good things happen when we show up. See what’s happening around campus.' : page === 'My registrations' ? 'All the events you’re looking forward to, gathered in one place.' : 'A clear view of the events bringing your campus community together.'}</p></div><div className="header-date"><CalendarDays size={17}/><span>{new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())}</span></div></div>
        {isExplore && <section className="hero"><div className="hero-copy"><span className="hero-kicker"><Sparkles size={14}/> THE CAMPUS CALENDAR</span><h2>Make room for<br/><em>something new.</em></h2><p>From late-night ideas to new-found friends, find the moments that make campus feel like yours.</p><button className="button-primary" onClick={() => document.getElementById('event-grid')?.scrollIntoView({ behavior: 'smooth' })}>Explore what’s on <ArrowRight size={16}/></button><div className="hero-proof"><div className="proof-avatars"><span>A</span><span>M</span><span>J</span></div><span>Good company is already here</span></div></div><div className="hero-visual"><div className="hero-image"/><div className="floating-note"><span className="note-icon"><CalendarDays size={17}/></span><span><b>Happening on campus</b><small>{events.length || 'New'} ways to get involved</small></span><span className="note-pulse"/></div><div className="image-tag">MAKE IT A DAY TO REMEMBER <Sparkles size={13}/></div></div></section>}
        <section className="stats-row"><Stat icon={CalendarDays} label="ON THE CALENDAR" value={events.length} accent="purple"/><Stat icon={Users} label="CAMPUS CAPACITY" value={totalSeats || '—'} accent="mint"/><Stat icon={Ticket} label="YOUR PASSES" value={registrations.length} accent="peach"/><div className="stat-aside"><span className="stat-spark">✳</span><span>Find your people.<br/><b>Find your thing.</b></span></div></section>
        <section className="events-section" id="event-grid"><div className="section-heading"><div><div className="eyebrow muted-eyebrow">A LITTLE SOMETHING FOR EVERYONE</div><h2>{page === 'My registrations' ? 'Saved for you' : 'Coming up on campus'}</h2></div><button className="text-link" onClick={() => goPage('My registrations')}>My registrations <ArrowRight size={15}/></button></div>
          <div className="filter-bar"><div className="category-tabs">{categories.map(c => <button key={c} className={category === c ? 'selected' : ''} onClick={() => setCategory(c)}>{c}</button>)}</div><button className="filter-button" onClick={() => setCategory(category === 'All events' ? 'Technology' : 'All events')}><Filter size={15}/> <span>Filter</span></button></div>
          {loading ? <div className="empty-state"><div className="loading-orbit"/><b>Finding your next campus moment...</b><span>Waking up the event calendar</span></div> : pageEvents.length ? <div className="event-grid">{pageEvents.map((event, index) => <EventCard key={idValue(event) || index} event={event} index={index} registered={myEventIds.has(String(idValue(event)))} busy={busy} onRegister={register} onDetails={setSelected}/>)}</div> : <div className="empty-state"><div className="empty-icon"><CalendarDays size={23}/></div><b>{events.length ? 'Nothing here just yet' : 'The calendar is taking a breather'}</b><span>{events.length ? 'Try another category or search.' : 'Check back soon for campus events.'}</span><button className="button-secondary" onClick={loadEvents}>Refresh events</button></div>}
        </section>
        {role !== 'Student' && <section className="ops-panel"><div className="ops-title"><span className="ops-icon"><Activity size={17}/></span><div><b>{role} tools</b><small>Available actions for this workspace</small></div><span className="api-pill"><span className="live-dot"/> API connected</span></div><div className="ops-actions"><button onClick={loadEvents}><CalendarDays size={17}/><span><b>Refresh event list</b><small>GET /api/events</small></span><ArrowRight size={16}/></button><button onClick={exportCsv}><Download size={17}/><span><b>Export event list</b><small>Download a CSV snapshot</small></span><ArrowRight size={16}/></button>{role === 'Organizer' && <button onClick={() => setModal(true)}><Plus size={17}/><span><b>Create an event</b><small>Event creation endpoint unavailable</small></span><ArrowRight size={16}/></button>}</div></section>}
        <footer className="footer"><span>Made for the moments between classes <span className="footer-heart">✳</span></span><span>CampusConnect <i/> Built for campus life</span></footer>
      </div>
    </main>
    {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><div className="event-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setSelected(null)} aria-label="Close"><X size={18}/></button><div className="modal-photo" style={{ backgroundImage: `url(${art(events.indexOf(selected) < 0 ? 0 : events.indexOf(selected))})` }}/><div className="modal-body"><span className="event-tag">{selected.category || selected.track || 'CAMPUS EVENT'}</span><h2>{titleValue(selected)}</h2><p>{selected.description || 'Join your campus community for this upcoming event. Details and updates will be shared by the event organizer.'}</p><div className="detail-line"><CalendarDays size={16}/>{dateValue(selected) ? new Date(dateValue(selected)).toLocaleString() : 'Date to be announced'}</div><div className="detail-line"><MapPin size={16}/>{locationValue(selected)}</div><div className="modal-actions">{myEventIds.has(String(idValue(selected))) ? <button className="button-registered" disabled><Check size={16}/> You’re registered</button> : <button className="button-primary" disabled={busy === String(idValue(selected))} onClick={() => register(selected)}>{busy === String(idValue(selected)) ? 'Registering…' : 'Register for event'} <ArrowRight size={16}/></button>}<button className="button-secondary" onClick={() => { setSelected(null); showAttendees(selected); }}>Attendee list <Users size={15}/></button></div></div></div></div>}
    {selected && attendees.length > 0 && <div className="modal-backdrop attendees-overlay" onClick={() => setAttendees([])}><div className="attendee-panel" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setAttendees([])}><X size={18}/></button><span className="eyebrow muted-eyebrow">EVENT ROSTER</span><h2>Attendees</h2><p>{titleValue(selected)}</p>{attendees.map((a, i) => <div className="attendee-row" key={a.id || i}><span className="avatar">{(a.name || a.email || `G${i + 1}`)[0].toUpperCase()}</span><span><b>{a.name || a.email || `Guest ${i + 1}`}</b><small>{a.created_at ? new Date(a.created_at).toLocaleDateString() : 'Registered guest'}</small></span><Check size={16}/></div>)}</div></div>}
    {modal && <div className="modal-backdrop" onClick={() => setModal(false)}><form className="create-modal" onSubmit={submitEvent} onClick={e => e.stopPropagation()}><button type="button" className="modal-close" onClick={() => setModal(false)}><X size={18}/></button><span className="eyebrow muted-eyebrow">BRING PEOPLE TOGETHER</span><h2>Create an event</h2><p>The deployed API currently provides browse and registration routes only.</p>{Object.entries(newEvent).map(([key, value]) => <label key={key}>{key === 'title' ? 'Event title' : key === 'date' ? 'Date & time' : key[0].toUpperCase() + key.slice(1)}<input type={key === 'date' ? 'datetime-local' : key === 'capacity' ? 'number' : 'text'} value={value} onChange={e => setNewEvent({ ...newEvent, [key]: e.target.value })} required={key === 'title'}/></label>)}<button className="button-primary" type="submit">Save event <ArrowRight size={16}/></button></form></div>}
    {notice && <div className={`toast ${notice.kind}`}><span>{notice.kind === 'error' ? <CircleAlert size={18}/> : <Check size={18}/>}</span>{notice.message}<button onClick={() => setNotice(null)}><X size={16}/></button></div>}
  </div>;
}

function Stat({ icon: Icon, label, value, accent }) { return <div className="stat"><div className={`stat-icon ${accent}`}><Icon size={17}/></div><div><span>{label}</span><b>{value}</b></div></div>; }
function EventCard({ event, index, registered, busy, onRegister, onDetails }) {
  const capacity = capacityValue(event), taken = Number(event.registered_count || event.attendee_count || event.registrations_count || 0);
  const eventStatus = event.status?.toLowerCase();
  const full = eventStatus === 'full' || eventStatus === 'closed' || (capacity > 0 && taken >= capacity);
  const category = event.category || event.track || ['Technology', 'Community', 'Arts & culture', 'Career'][index % 4];
  return <article className="event-card"><button className="event-image" style={{ backgroundImage: `url(${art(index)})` }} onClick={() => onDetails(event)} aria-label={`View ${titleValue(event)}`}><span className="event-tag">{category}</span><span className="image-arrow"><ArrowRight size={17}/></span></button><div className="event-info"><div className="event-meta"><span><CalendarDays size={14}/>{dateValue(event) ? new Date(dateValue(event)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Date coming soon'}</span><span className={full ? 'status-full' : 'status-open'}><i/>{eventStatus === 'closed' ? 'CLOSED' : full ? 'FULL' : 'OPEN'}</span></div><h3>{titleValue(event)}</h3><div className="venue"><MapPin size={14}/>{locationValue(event)}</div><p className="event-description">{event.description || 'A chance to connect, learn something new and be part of the campus community.'}</p><div className="card-bottom"><span className="capacity"><Users size={14}/>{capacity ? `${Math.max(0, capacity - taken)} spots left` : 'Campus community'}</span>{registered ? <button className="registered-pill" disabled><Check size={14}/> Joined</button> : <button className="join-button" disabled={full || busy === String(idValue(event))} onClick={() => onRegister(event)}>{busy === String(idValue(event)) ? 'Joining…' : full ? 'At capacity' : 'Join event'} {!full && <ArrowRight size={14}/>}</button>}</div></div></article>;
}

createRoot(document.getElementById('root')).render(<App/>);
