/* ============================================================
   APPELLO EA Academy — canonical fictional data
   EVERY person, company, message, date, and number in this file is
   invented for training. The seed is rebuilt on demand by Reset.
   ============================================================ */
(function () {
  'use strict';

  const ME = {
    name: 'Elizabeth Hale',
    firstName: 'Elizabeth',
    email: 'elizabeth.hale@appello.com',
    phone: '+1 212 555 0198',
    title: 'Executive Assistant to the CEO',
    company: 'APPELLO',
    timezone: 'America/New_York',
    timezoneLabel: 'New York (ET)'
  };

  const COMPANY = {
    name: 'APPELLO',
    short: 'APPELLO',
    industry: 'Design, infrastructure, and advisory',
    hq: '200 Hudson Street, New York, NY',
    timezone: 'America/New_York',
    fiscalYear: 'FY27',
    simulationDate: '2026-11-09',
    simulationWeek: 'November 9–13, 2026'
  };

  /* 12 teammates, 8 clients, 5 vendors — each with a real-feeling context. */
  const CONTACTS = [
    { id: 'alexandra', name: 'Alexandra Morgan', title: 'Chief Executive Officer', company: 'APPELLO', email: 'alexandra.morgan@appello.com', phone: '+1 212 555 0144', timezone: 'America/New_York', timezoneLabel: 'New York (ET)', work: '07:30–19:00', style: 'Direct and time-poor. Lead with the decision, then the detail. She prefers three bullets over three paragraphs.', type: 'executive', tone: 2, notes: 'Coffee: oat latte, no sugar. Do not schedule before 08:00. Protect 30 minutes after board meetings for debrief. Calls Elizabeth "E." when moving fast.' },
    { id: 'daniel', name: 'Daniel Kim', title: 'Chief of Staff', company: 'APPELLO', email: 'daniel.kim@appello.com', phone: '+1 212 555 0161', timezone: 'America/New_York', timezoneLabel: 'New York (ET)', work: '08:00–18:30', style: 'Calm, strategic, and collaborative. Appreciates context and a clear recommendation.', type: 'team', tone: 1, notes: 'Alexandra’s main thought partner. Co-owns the board run-of-show. Prefers short written briefs before a live discussion.' },
    { id: 'priya', name: 'Priya Raman', title: 'VP, Operations', company: 'APPELLO', email: 'priya.raman@appello.com', phone: '+44 20 7946 0322', timezone: 'Europe/London', timezoneLabel: 'London (GMT)', work: '08:30–18:00', style: 'Structured and precise. Sends labelled documents and expects the same. Polite but direct.', type: 'team', tone: 3, notes: 'Based in London. Leads Q4 operations and the Helio Energy RFP. On leave the afternoon of Nov 13.' },
    { id: 'marcus', name: 'Marcus Chen', title: 'Chief Financial Officer', company: 'APPELLO', email: 'marcus.chen@appello.com', phone: '+1 415 555 0188', timezone: 'America/Los_Angeles', timezoneLabel: 'San Francisco (PT)', work: '07:00–17:00', style: 'Analytical and exact. Wants numbers sourced and variance explained. Dislikes surprises.', type: 'team', tone: 6, notes: 'San Francisco. Board financial pack owner. Expense cut-off is noon PT on the 10th. Ask for “the one-line story” on any variance.' },
    { id: 'sofia', name: 'Sofia Alvarez', title: 'VP, Marketing & Communications', company: 'APPELLO', email: 'sofia.alvarez@appello.com', phone: '+52 55 5555 0190', timezone: 'America/Mexico_City', timezoneLabel: 'Mexico City (CST)', work: '09:00–19:00', style: 'Warm, expressive, quick to react. A voice note is often faster than email.', type: 'team', tone: 2, notes: 'Mexico City. Owns press and the APPELLO @ 10 anniversary. Needs approved talking points 48 hours before any press moment.' },
    { id: 'liam', name: 'Liam O’Connor', title: 'Director, Board Relations', company: 'APPELLO', email: 'liam.oconnor@appello.com', phone: '+353 1 555 0117', timezone: 'Europe/Dublin', timezoneLabel: 'Dublin (GMT)', work: '08:00–17:30', style: 'Formal, meticulous, and discreet. Check names and titles twice.', type: 'team', tone: 4, notes: 'Dublin. Runs the Nov 12 board meeting and the board dinner. Board materials freeze at 17:00 ET on Nov 11. Extremely particular about attendee titles.' },
    { id: 'naomi', name: 'Naomi Brooks', title: 'Head of People', company: 'APPELLO', email: 'naomi.brooks@appello.com', phone: '+1 312 555 0133', timezone: 'America/Chicago', timezoneLabel: 'Chicago (CT)', work: '08:30–18:00', style: 'Friendly and candid. Appreciates a human note before the ask.', type: 'team', tone: 5, notes: 'Chicago. Board people update owner. Will flag any conversion with an employee before it lands. Collects board dinner dietary needs.' },
    { id: 'ethan', name: 'Ethan Park', title: 'Director, Information Technology', company: 'APPELLO', email: 'ethan.park@appello.com', phone: '+1 206 555 0174', timezone: 'America/Los_Angeles', timezoneLabel: 'Seattle (PT)', work: '08:00–18:00', style: 'Informal and efficient. Short messages, links, no ceremony.', type: 'team', tone: 7, notes: 'Seattle. Handles devices, access, and meeting-room AV. Please use the IT portal for new requests.' },
    { id: 'aisha', name: 'Aisha Bello', title: 'Executive Producer, Events', company: 'APPELLO', email: 'aisha.bello@appello.com', phone: '+234 1 555 0156', timezone: 'Africa/Lagos', timezoneLabel: 'Lagos (WAT)', work: '09:00–18:00', style: 'Energetic, visual, and fast. Sends options and drafts, rarely a blank page.', type: 'team', tone: 8, notes: 'Lagos. Runs the APPELLO @ 10 gala and board dinner logistics. Seating chart v4 is current; v3 is obsolete.' },
    { id: 'takeshi', name: 'Takeshi Sato', title: 'Head of APAC', company: 'APPELLO', email: 'takeshi.sato@appello.com', phone: '+81 3 5555 0102', timezone: 'Asia/Tokyo', timezoneLabel: 'Tokyo (JST)', work: '08:00–17:00', style: 'Formal and considerate. Uses full sentences and thanks people explicitly.', type: 'team', tone: 6, notes: 'Tokyo. Joins meetings remotely unless travelling. APAC board update is due Nov 10. Prefers documents in advance rather than on-screen reading.' },
    { id: 'clara', name: 'Clara Jensen', title: 'General Counsel', company: 'APPELLO', email: 'clara.jensen@appello.com', phone: '+45 33 555 016', timezone: 'Europe/Copenhagen', timezoneLabel: 'Copenhagen (CET)', work: '08:00–17:00', style: 'Cautious and exact. Never speculate; ask for the source.', type: 'team', tone: 4, notes: 'Copenhagen. Advises on Project Atlas and the Vela Retail NDA. Anything marked privileged stays inside the exec office.' },
    { id: 'ben', name: 'Ben Carter', title: 'Facilities Lead', company: 'APPELLO', email: 'ben.carter@appello.com', phone: '+1 212 555 0120', timezone: 'America/New_York', timezoneLabel: 'New York (ET)', work: '07:00–16:00', style: 'Pragmatic and plain-spoken. A text is fine for room issues.', type: 'team', tone: 7, notes: 'New York. Controls meeting rooms, AV, catering access, and visitor passes. Boardroom A is the only room with the permanent video wall.' },

    { id: 'isabel', name: 'Isabel Rossi', title: 'Chief Executive Officer', company: 'Vela Retail Group', email: 'isabel.rossi@velaretail.example', phone: '+39 02 5555 0141', timezone: 'Europe/Rome', timezoneLabel: 'Milan (CET)', work: '09:00–18:30', style: 'Relationship-first. Appreciates warmth and a personal note. English is her third language, so keep it clear.', type: 'client', tone: 2, notes: 'Vela Retail Group. CEO sponsor of Project Atlas. Prefers coffee to a conference room. Allergic to shellfish. Time zone: Milan, 6 hours ahead of New York.' },
    { id: 'james', name: 'James Whitfield', title: 'Chief Operating Officer', company: 'Ardent Health', email: 'james.whitfield@ardenthealth.example', phone: '+44 20 7946 0178', timezone: 'Europe/London', timezoneLabel: 'London (GMT)', work: '08:00–17:30', style: 'Formal and data-focused. Expects an agenda and a decision log.', type: 'client', tone: 6, notes: 'Ardent Health. Leads the partnership workstream with Priya. Quarterly business review is Nov 19 in London. Declines meetings without an agenda.' },
    { id: 'mei', name: 'Mei Lin', title: 'VP, Procurement', company: 'Helio Energy', email: 'mei.lin@helioenergy.example', phone: '+65 6555 0193', timezone: 'Asia/Singapore', timezoneLabel: 'Singapore (SGT)', work: '08:30–18:00', style: 'Direct and efficient. One question, one answer, one deadline.', type: 'client', tone: 3, notes: 'Helio Energy. RFP for the APAC operations redesign is due Nov 13 at 17:00 SGT. She will not extend the deadline.' },
    { id: 'ahmed', name: 'Ahmed Al-Rashid', title: 'Managing Director', company: 'Crescent Capital', email: 'ahmed.alrashid@crescentcap.example', phone: '+971 4 555 0122', timezone: 'Asia/Dubai', timezoneLabel: 'Dubai (GST)', work: '09:00–18:00', style: 'Relationship-first and formal. Begin with a greeting; never open with a demand.', type: 'client', tone: 5, notes: 'Crescent Capital. Dubai visit is Nov 18. Prefers meetings after 10:00. Does not take calls during Friday prayers.' },
    { id: 'gabriela', name: 'Gabriela Santos', title: 'Founder & CEO', company: 'Atlas Foods', email: 'gabriela.santos@atlasfoods.example', phone: '+55 11 5555 0177', timezone: 'America/Sao_Paulo', timezoneLabel: 'São Paulo (BRT)', work: '08:00–19:00', style: 'Creative and fast. Responds well to options and visuals. Sometimes sends three thoughts in one message.', type: 'client', tone: 8, notes: 'Atlas Foods. Exploring a APPELLO brand system for their 2027 launch. Prefers WhatsApp-style quick replies; all formal decisions still need email.' },
    { id: 'noah', name: 'Noah Williams', title: 'SVP, Corporate Banking', company: 'Meridian Bank', email: 'noah.williams@meridianbank.example', phone: '+1 212 555 0111', timezone: 'America/New_York', timezoneLabel: 'New York (ET)', work: '08:00–18:00', style: 'Skeptical and precise. Bring evidence. “Trust me” is not a data point.', type: 'client', tone: 6, notes: 'Meridian Bank. Reviews board financial materials from a lender’s perspective. Needs final pack two business days in advance.' },
    { id: 'elena', name: 'Elena Petrova', title: 'Board Chair, Corvus Foundation', company: 'Corvus Foundation', email: 'elena.petrova@corvusfoundation.example', phone: '+49 30 5555 0168', timezone: 'Europe/Berlin', timezoneLabel: 'Berlin (CET)', work: '09:00–17:00', style: 'Formal and exacting. Address her as “Dr. Petrova” until invited otherwise.', type: 'client', tone: 4, notes: 'Corvus Foundation. Chairs the foundation board and attends the APPELLO board dinner. Vegetarian. Needs printed materials; no tablets.' },
    { id: 'ravi', name: 'Ravi Patel', title: 'Product Lead', company: 'Kite Mobility', email: 'ravi.patel@kitemobility.example', phone: '+1 416 555 0185', timezone: 'America/Toronto', timezoneLabel: 'Toronto (ET)', work: '09:00–18:00', style: 'Collaborative and enthusiastic. Brings product examples and asks good follow-up questions.', type: 'client', tone: 1, notes: 'Kite Mobility. Pilot review originally Nov 12; he has asked to avoid a board-day clash. Prefers Thursday afternoon or Friday morning.' },

    { id: 'hannah', name: 'Hannah Liu', title: 'Account Director', company: 'Evergreen AV', email: 'hannah.liu@evergreenav.example', phone: '+1 213 555 0149', timezone: 'America/Los_Angeles', timezoneLabel: 'Los Angeles (PT)', work: '08:00–17:00', style: 'Responsive and detail-oriented. Confirms every request in writing.', type: 'vendor', tone: 3, notes: 'Evergreen AV. Boardroom A AV rehearsal booked for Nov 10 at 14:00. Invoice must reference PO NSM-4471. Do not approve extra labor without Ben.' },
    { id: 'omar', name: 'Omar Haddad', title: 'Sales Manager', company: 'Skyline Travel', email: 'omar.haddad@skylinetravel.example', phone: '+971 4 555 0186', timezone: 'Asia/Dubai', timezoneLabel: 'Dubai (GST)', work: '09:00–19:00', style: 'Proactive and informal. Sends options with clear deadlines and pricing.', type: 'vendor', tone: 5, notes: 'Skyline Travel. Holds the three-city itinerary: London → Dubai → Singapore, Nov 16–21. Ticket deadline is Nov 10 at 17:00 GST. Quote 3-city-8814.' },
    { id: 'fiona', name: 'Fiona MacLeod', title: 'Events Lead', company: 'The Glasshouse', email: 'fiona.macleod@glasshouse.example', phone: '+1 212 555 0138', timezone: 'America/New_York', timezoneLabel: 'New York (ET)', work: '09:00–18:00', style: 'Polished and direct. Sends menus and floor plans; expects decisions by the date stated.', type: 'vendor', tone: 8, notes: 'The Glasshouse. Board dinner venue Nov 12 at 18:30. Final counts due Nov 10 at 12:00. Seafood allergy at table 2 must be flagged.' },
    { id: 'victor', name: 'Victor Ramos', title: 'Print Manager', company: 'Ink & Grain', email: 'victor.ramos@inkandgrain.example', phone: '+52 55 5555 0128', timezone: 'America/Mexico_City', timezoneLabel: 'Mexico City (CST)', work: '08:00–18:00', style: 'Practical and deadline-driven. Asks for one consolidated approval, not piecemeal changes.', type: 'vendor', tone: 7, notes: 'Ink & Grain. Board pack print run: 14 sets, color, tabbed, delivered to reception by 17:00 Nov 11. Proofs due Nov 9 at 15:00 CT.' },
    { id: 'grace', name: 'Grace Okafor', title: 'Catering Director', company: 'Juniper & Sage', email: 'grace.okafor@juniperandsage.example', phone: '+44 20 7946 0159', timezone: 'Europe/London', timezoneLabel: 'London (GMT)', work: '08:00–17:00', style: 'Warm and detail-minded. Needs dietary counts 48 hours ahead.', type: 'vendor', tone: 3, notes: 'Juniper & Sage. Catering for the London client day Nov 17. Two vegetarian, one gluten-free, one shellfish allergy (Isabel). Final count by Nov 15.' }
  ];

  const CONTACT_BY_ID = Object.fromEntries(CONTACTS.map(c => [c.id, c]));
  const CONTACT_BY_EMAIL = Object.fromEntries(CONTACTS.map(c => [c.email, c]));
  function contact(id) { return CONTACT_BY_ID[id] || null; }
  function personAddress(id) {
    if (id === 'me') return { name: ME.name, email: ME.email };
    const c = CONTACT_BY_ID[id];
    return c ? { name: c.name, email: c.email } : { name: String(id || ''), email: String(id || '') };
  }
  function addressByEmail(email) {
    return CONTACT_BY_EMAIL[email] || { name: email.split('@')[0].replace(/[._]/g, ' '), email };
  }

  const ROOMS = [
    { id: 'boardroom-a', name: 'Boardroom A', floor: '12th floor', capacity: 18, video: true, phone: '+1 212 555 4401', notes: 'Permanent video wall and board table. Best for board meetings and client presentations.' },
    { id: 'boardroom-b', name: 'Boardroom B', floor: '12th floor', capacity: 10, video: true, phone: '+1 212 555 4402', notes: 'Smaller room with two displays. Good for press prep and working sessions.' },
    { id: 'exec-suite', name: 'Executive Suite', floor: '14th floor', capacity: 6, video: false, phone: '+1 212 555 4410', notes: 'Quiet room next to Alexandra’s office. No permanent video; portable screen available.' },
    { id: 'hudson', name: 'Hudson Room', floor: '11th floor', capacity: 12, video: true, phone: '+1 212 555 4415', notes: 'Client-friendly room with natural light. Catering permitted.' },
    { id: 'focus-1', name: 'Focus Room 1', floor: '11th floor', capacity: 3, video: false, phone: '', notes: 'Single-screen room for focused calls.' },
    { id: 'glasshouse', name: 'The Glasshouse — Event Space', floor: 'Off-site', capacity: 80, video: true, phone: '+1 212 555 7788', notes: 'Off-site venue for board dinner and the anniversary gala.' }
  ];

  const TIMEZONES = [
    { id: 'America/New_York', label: 'New York', abbr: 'ET', country: 'United States' },
    { id: 'America/Los_Angeles', label: 'San Francisco', abbr: 'PT', country: 'United States' },
    { id: 'America/Chicago', label: 'Chicago', abbr: 'CT', country: 'United States' },
    { id: 'America/Mexico_City', label: 'Mexico City', abbr: 'CST', country: 'Mexico' },
    { id: 'America/Sao_Paulo', label: 'São Paulo', abbr: 'BRT', country: 'Brazil' },
    { id: 'America/Toronto', label: 'Toronto', abbr: 'ET', country: 'Canada' },
    { id: 'Europe/London', label: 'London', abbr: 'GMT', country: 'United Kingdom' },
    { id: 'Europe/Dublin', label: 'Dublin', abbr: 'GMT', country: 'Ireland' },
    { id: 'Europe/Berlin', label: 'Berlin', abbr: 'CET', country: 'Germany' },
    { id: 'Europe/Copenhagen', label: 'Copenhagen', abbr: 'CET', country: 'Denmark' },
    { id: 'Europe/Rome', label: 'Milan', abbr: 'CET', country: 'Italy' },
    { id: 'Africa/Lagos', label: 'Lagos', abbr: 'WAT', country: 'Nigeria' },
    { id: 'Asia/Dubai', label: 'Dubai', abbr: 'GST', country: 'United Arab Emirates' },
    { id: 'Asia/Singapore', label: 'Singapore', abbr: 'SGT', country: 'Singapore' },
    { id: 'Asia/Tokyo', label: 'Tokyo', abbr: 'JST', country: 'Japan' },
    { id: 'UTC', label: 'UTC', abbr: 'UTC', country: 'Coordinated Universal Time' }
  ];

  /* ------------------------------ calendar ------------------------------ */
  // Event times are stored as wall-clock strings in Alexandra's home time zone
  // (New York) so the training day is deterministic regardless of the learner's
  // real-world clock. The UI converts for other zones.
  const CALENDAR_EVENTS = [
    { id: 'evt-standup', title: 'Executive leadership stand-up', date: '2026-11-09', start: '08:30', end: '09:00', tz: 'America/New_York', type: 'meeting', location: 'Teamspace', teams: true, room: null, organizer: 'daniel', attendees: ['alexandra', 'daniel', 'priya', 'marcus', 'sofia'], note: 'Weekly pulse. Each leader brings one decision and one risk.', category: 'Leadership', recurrence: { freq: 'weekly', until: '2026-12-14' } },
    { id: 'evt-desk-review', title: 'CEO desk review', date: '2026-11-09', start: '09:30', end: '10:00', tz: 'America/New_York', type: 'meeting', location: 'Executive Suite', teams: false, room: 'exec-suite', organizer: 'alexandra', attendees: ['alexandra', 'me'], note: 'Daily priorities with Elizabeth. Bring the overnight inbox digest and three decisions.', category: 'Executive', recurrence: { freq: 'daily', until: '2026-11-13' } },
    { id: 'evt-board-pack-review', title: 'Board pack final review', date: '2026-11-09', start: '11:00', end: '12:00', tz: 'America/New_York', type: 'meeting', location: 'Boardroom A', teams: true, room: 'boardroom-a', organizer: 'liam', attendees: ['alexandra', 'liam', 'daniel', 'marcus', 'clara'], note: 'Final pass on the board narrative. Clara will flag the Atlas disclosure language.', category: 'Board', recurrence: null },
    { id: 'evt-lunch-hold', title: 'Lunch hold — no meeting', date: '2026-11-09', start: '13:00', end: '13:30', tz: 'America/New_York', type: 'focus', location: 'Executive Suite', teams: false, room: 'exec-suite', organizer: 'alexandra', attendees: ['alexandra'], note: 'Protected. Do not book over this without asking Elizabeth.', category: 'Focus', recurrence: null },
    { id: 'evt-vela-checkin', title: 'Project Atlas — Vela check-in', date: '2026-11-09', start: '14:00', end: '15:00', tz: 'America/New_York', type: 'meeting', location: 'Teamspace', teams: true, room: null, organizer: 'daniel', attendees: ['alexandra', 'daniel', 'marcus', 'isabel'], note: 'Isabel joins from Milan. Agenda: integration milestones, brand governance, and the Nov 20 gala preview.', category: 'Client', recurrence: null },
    { id: 'evt-press-prep', title: 'Press prep — APPELLO @ 10', date: '2026-11-09', start: '15:30', end: '16:00', tz: 'America/New_York', type: 'meeting', location: 'Boardroom B', teams: false, room: 'boardroom-b', organizer: 'sofia', attendees: ['alexandra', 'sofia'], note: 'Two approved messages. Sofia will bring the final Q&A sheet.', category: 'Press', recurrence: null },

    { id: 'evt-ardent', title: 'Ardent Health partnership review', date: '2026-11-10', start: '09:00', end: '10:00', tz: 'America/New_York', type: 'meeting', location: 'Teamspace', teams: true, room: null, organizer: 'priya', attendees: ['alexandra', 'priya', 'james'], note: 'QBR preparation. James expects the decision log from October.', category: 'Client', recurrence: null },
    { id: 'evt-board-preread', title: 'Board pre-read with Liam & Clara', date: '2026-11-10', start: '10:30', end: '11:30', tz: 'America/New_York', type: 'meeting', location: 'Boardroom A', teams: true, room: 'boardroom-a', organizer: 'liam', attendees: ['alexandra', 'liam', 'clara'], note: 'Walk the board narrative and legal language line by line.', category: 'Board', recurrence: null },
    { id: 'evt-legal-review', title: 'Legal review — Atlas disclosure', date: '2026-11-10', start: '11:15', end: '11:45', tz: 'America/New_York', type: 'meeting', location: 'Boardroom A', teams: true, room: 'boardroom-a', organizer: 'clara', attendees: ['alexandra', 'clara'], note: 'Privileged. Clara needs a yes/no on disclosure before the board pack is frozen.', category: 'Legal', recurrence: null },
    { id: 'evt-client-lunch', title: 'Client lunch — Mei Lin (Helio)', date: '2026-11-10', start: '12:00', end: '13:30', tz: 'America/New_York', type: 'meal', location: 'The Glasshouse', teams: false, room: 'glasshouse', organizer: 'alexandra', attendees: ['alexandra', 'mei', 'priya'], note: 'Relationship lunch before the RFP deadline. Mei is in Singapore this week; join by Teamspace? Confirm.', category: 'Client', recurrence: null },
    { id: 'evt-av-call', title: 'AV walkthrough — Hannah (Evergreen)', date: '2026-11-10', start: '12:30', end: '13:00', tz: 'America/New_York', type: 'call', location: 'Teamspace', teams: true, room: null, organizer: 'ben', attendees: ['alexandra', 'ben', 'hannah'], note: 'Boardroom A rehearsal. Ben can cover the technical check if Alexandra is at lunch.', category: 'Vendor', recurrence: null },
    { id: 'evt-budget-review', title: 'Budget review with Marcus', date: '2026-11-10', start: '14:00', end: '15:00', tz: 'America/New_York', type: 'meeting', location: 'Executive Suite', teams: true, room: 'exec-suite', organizer: 'marcus', attendees: ['alexandra', 'marcus'], note: 'Q4 variance and the one-line story for the board. Marcus is in San Francisco.', category: 'Finance', recurrence: null },
    { id: 'evt-investor-call', title: 'Investor call — Ahmed (Crescent)', date: '2026-11-10', start: '14:30', end: '15:00', tz: 'America/New_York', type: 'call', location: 'Teamspace', teams: true, room: null, organizer: 'alexandra', attendees: ['alexandra', 'ahmed'], note: 'Ahmed requested a 30-minute check-in before the Dubai trip. He is 9 hours ahead.', category: 'Client', recurrence: null },
    { id: 'evt-travel-brief', title: '3-city travel briefing', date: '2026-11-10', start: '16:00', end: '16:30', tz: 'America/New_York', type: 'meeting', location: 'Focus Room 1', teams: false, room: 'focus-1', organizer: 'me', attendees: ['alexandra', 'me', 'aisha'], note: 'Review London, Dubai, Singapore itinerary and budget before ticket deadline.', category: 'Travel', recurrence: null },
    { id: 'evt-isabel-coffee', title: 'Coffee with Isabel Rossi', date: '2026-11-10', start: '16:00', end: '16:45', tz: 'America/New_York', type: 'meal', location: 'Lobby Café', teams: false, room: null, organizer: 'alexandra', attendees: ['alexandra', 'isabel'], note: 'Isabel is in New York briefly. She prefers a café table over a conference room.', category: 'Client', recurrence: null },
    { id: 'evt-press-prep-2', title: 'Press prep — follow-up', date: '2026-11-10', start: '17:00', end: '17:30', tz: 'America/New_York', type: 'meeting', location: 'Boardroom B', teams: false, room: 'boardroom-b', organizer: 'sofia', attendees: ['alexandra', 'sofia'], note: 'Final Q&A rehearsal.', category: 'Press', recurrence: null },
    { id: 'evt-venue-call', title: 'Venue call — Fiona (Glasshouse)', date: '2026-11-10', start: '17:15', end: '17:45', tz: 'America/New_York', type: 'call', location: 'Teamspace', teams: true, room: null, organizer: 'aisha', attendees: ['alexandra', 'aisha', 'fiona'], note: 'Board dinner final counts and menu decisions.', category: 'Vendor', recurrence: null },

    { id: 'evt-board-dry-run', title: 'Board dry run', date: '2026-11-11', start: '09:00', end: '10:00', tz: 'America/New_York', type: 'meeting', location: 'Boardroom A', teams: true, room: 'boardroom-a', organizer: 'daniel', attendees: ['alexandra', 'daniel', 'liam', 'marcus', 'clara'], note: 'Full run-through. Print proofs due the same afternoon.', category: 'Board', recurrence: null },
    { id: 'evt-av-walkthrough', title: 'Boardroom A AV rehearsal', date: '2026-11-11', start: '12:00', end: '12:30', tz: 'America/New_York', type: 'meeting', location: 'Boardroom A', teams: false, room: 'boardroom-a', organizer: 'ben', attendees: ['alexandra', 'ben', 'hannah'], note: 'Evergreen AV checks cameras, microphones, and the backup laptop.', category: 'Vendor', recurrence: null },
    { id: 'evt-deep-work', title: 'Deep work — board narrative', date: '2026-11-11', start: '15:00', end: '16:00', tz: 'America/New_York', type: 'focus', location: 'Executive Suite', teams: false, room: 'exec-suite', organizer: 'alexandra', attendees: ['alexandra'], note: 'Protected thinking time. Elizabeth should hold all non-urgent requests.', category: 'Focus', recurrence: null },
    { id: 'evt-board-meeting', title: 'Q3 Board Meeting', date: '2026-11-12', start: '08:00', end: '12:00', tz: 'America/New_York', type: 'board', location: 'Boardroom A', teams: true, room: 'boardroom-a', organizer: 'liam', attendees: ['alexandra', 'daniel', 'marcus', 'liam', 'clara', 'priya', 'elena', 'noah'], note: 'Formal board meeting. Materials frozen. Hybrid dial-in for Takeshi and Elena.', category: 'Board', recurrence: null },
    { id: 'evt-board-debrief', title: 'Board debrief (protected)', date: '2026-11-12', start: '12:00', end: '12:30', tz: 'America/New_York', type: 'focus', location: 'Executive Suite', teams: false, room: 'exec-suite', organizer: 'alexandra', attendees: ['alexandra', 'daniel'], note: 'Do not schedule over this. Notes feed the follow-up email and action tracker.', category: 'Focus', recurrence: null },
    { id: 'evt-board-dinner', title: 'Board dinner — The Glasshouse', date: '2026-11-12', start: '18:30', end: '21:00', tz: 'America/New_York', type: 'meal', location: 'The Glasshouse', teams: false, room: 'glasshouse', organizer: 'liam', attendees: ['alexandra', 'elena', 'noah', 'liam', 'daniel', 'marcus', 'clara', 'priya'], note: 'Private dining room. Isabel joins as guest of Alexandra. Vegetarian menu for Dr. Petrova.', category: 'Board', recurrence: null },
    { id: 'evt-finance-signoff', title: 'Q4 finance sign-off', date: '2026-11-13', start: '10:00', end: '11:00', tz: 'America/New_York', type: 'meeting', location: 'Teamspace', teams: true, room: null, organizer: 'marcus', attendees: ['alexandra', 'marcus'], note: 'Final sign-off before the numbers are locked for the board.', category: 'Finance', recurrence: null },
    { id: 'evt-helio-rfp', title: 'Helio RFP — final submission', date: '2026-11-13', start: '14:00', end: '15:00', tz: 'America/New_York', type: 'deadline', location: 'Teamspace', teams: true, room: null, organizer: 'priya', attendees: ['alexandra', 'priya', 'mei'], note: 'Submission due 17:00 SGT. Final internal check at 14:00 ET.', category: 'Client', recurrence: null },
    { id: 'evt-travel-depart', title: 'Travel: depart New York (LHR)', date: '2026-11-16', start: '18:20', end: '06:30', tz: 'America/New_York', type: 'travel', location: 'JFK Terminal 4', teams: false, room: null, organizer: 'me', attendees: ['alexandra', 'me'], note: 'BA178 overnight to London. Car service pickup at 15:30.', category: 'Travel', recurrence: null },
    { id: 'evt-london-day', title: 'London client day — Ardent Health', date: '2026-11-17', start: '09:00', end: '16:00', tz: 'Europe/London', type: 'meeting', location: 'Ardent Health, 1 Poultry', teams: false, room: null, organizer: 'priya', attendees: ['alexandra', 'priya', 'james'], note: 'QBR with James Whitfield. Lunch catered by Juniper & Sage.', category: 'Travel', recurrence: null },
    { id: 'evt-dubai-day', title: 'Dubai client day — Crescent Capital', date: '2026-11-18', start: '10:00', end: '15:00', tz: 'Asia/Dubai', type: 'meeting', location: 'Crescent Capital, DIFC', teams: false, room: null, organizer: 'alexandra', attendees: ['alexandra', 'ahmed'], note: 'Relationship meetings. No calls over lunch. Friday prayers from 12:30.', category: 'Travel', recurrence: null },
    { id: 'evt-singapore-day', title: 'Singapore — Helio RFP close-out', date: '2026-11-19', start: '09:30', end: '14:00', tz: 'Asia/Singapore', type: 'meeting', location: 'Helio Energy, Marina Bay', teams: false, room: null, organizer: 'priya', attendees: ['alexandra', 'priya', 'mei', 'takeshi'], note: 'Takeshi joins from Tokyo. RFP is already submitted; this is a relationship close-out.', category: 'Travel', recurrence: null },
    { id: 'evt-return-flight', title: 'Travel: return to New York', date: '2026-11-20', start: '23:55', end: '08:30', tz: 'Asia/Singapore', type: 'travel', location: 'SIN Terminal 3', teams: false, room: null, organizer: 'me', attendees: ['alexandra', 'me'], note: 'Singapore → New York via Frankfurt. Arrives Nov 21.', category: 'Travel', recurrence: null },
    { id: 'evt-gala', title: 'APPELLO @ 10 Anniversary Gala', date: '2026-11-20', start: '18:30', end: '23:00', tz: 'America/New_York', type: 'event', location: 'The Glasshouse', teams: false, room: 'glasshouse', organizer: 'aisha', attendees: ['alexandra', 'daniel', 'sofia', 'aisha', 'isabel', 'elena'], note: 'Black tie. Alexandra’s remarks at 20:15. Seating chart v4 is the source of truth.', category: 'Event', recurrence: null }
  ];

  /* ------------------------------- mail -------------------------------- */
  const EMAIL_GROUPS = {
    inbox: 'Inbox', flagged: 'Flagged', sent: 'Sent', drafts: 'Drafts',
    archive: 'Archive', deleted: 'Deleted', scheduled: 'Scheduled'
  };

  function sender(id) {
    if (id === 'me') return { name: ME.name, email: ME.email };
    const c = CONTACT_BY_ID[id];
    if (c) return { name: c.name, email: c.email, title: c.title, company: c.company };
    if (id && id.includes('@')) return { name: id.split('@')[0], email: id };
    return { name: 'APPELLO', email: 'hello@appello.com' };
  }

  function email(o) {
    const [date, time] = o.at.split('T');
    const from = o.from && o.from.includes('@') ? sender(o.from) : sender(o.fromId || o.from || 'appello');
    return {
      id: o.id,
      folder: o.folder || 'inbox',
      from,
      to: (o.to || [ME.email]).map(e => e === 'me' ? ME.email : e),
      cc: (o.cc || []).map(e => e === 'me' ? ME.email : e),
      bcc: (o.bcc || []).map(e => e === 'me' ? ME.email : e),
      subject: o.subject || '',
      body: o.body || '',
      date,
      time,
      at: o.at,
      read: o.read !== undefined ? o.read : true,
      flagged: !!o.flagged,
      attachments: o.attachments || [],
      labels: o.labels || [],
      priority: o.priority || 'normal',
      threadId: o.threadId || o.id,
      deletedFrom: o.deletedFrom || null,
      scheduledFor: o.scheduledFor || null,
      snoozedUntil: o.snoozedUntil || null,
      signatureOn: o.signatureOn !== false,
      ruleNote: o.ruleNote || null
    };
  }

  const signature = `Best regards,\n\nElizabeth Hale\nExecutive Assistant to Alexandra Morgan\nAPPELLO\n+1 212 555 0198 · elizabeth.hale@appello.com`;

  const INBOX_EMAILS = [
    email({
      id: 'm01', from:'alexandra', to:['me'], at:'2026-11-09T07:42', read:false, flagged:true,
      subject:'Board pack: final pass before Thursday',
      labels:['Board','Action'], priority:'high',
      body:`Morning Elizabeth,\n\nI need the final board pack in my hands by Wednesday at 5:00 PM. Three things matter most:\n\n1. The financial variance page must show the one-line story, not just the numbers. Marcus owns the wording.\n2. Clara needs to approve the Atlas disclosure language. Do not publish the pack until she replies in writing.\n3. Dr. Petrova requires a printed set. Please coordinate with Victor at Ink & Grain.\n\nIf any of those three is at risk, tell me by 3:00 PM today, not Thursday morning.\n\nAlexandra`
    }),
    email({
      id:'m02', from:'daniel', to:['me'], cc:['alexandra','liam'], at:'2026-11-09T07:58', read:false, flagged:true,
      subject:'Board run-of-show — v6 attached',
      attachments:[{name:'Board Run of Show v6.docx', kind:'doc', size:'148 KB'}],
      labels:['Board'], priority:'high',
      body:`Hi Elizabeth,\n\nAttached is v6 of the run-of-show. Changes from v5: the CFO update moves to 09:35, Dr. Petrova's governance item moves to 10:10, and we added a 10-minute press boundary at 11:30.\n\nPlease use v6 for the printed packs. V5 should be considered obsolete.\n\nCan you confirm the room is set for 12 in-person and 4 hybrid?\n\nDaniel`
    }),
    email({
      id:'m03', from:'priya', to:['me','marcus'], at:'2026-11-09T08:06', read:false,
      subject:'Q4 operations numbers for the board',
      attachments:[{name:'Q4 Ops Board Summary.xlsx', kind:'sheet', size:'86 KB'}],
      labels:['Board','Finance'], priority:'normal',
      body:`Elizabeth,\n\nHere is the Q4 operations summary. Page 2 has the APAC capacity assumptions you asked about. Please do not alter the narrative column — Marcus and I need to keep it aligned with finance.\n\nOne flag: the Singapore utilisation figure is provisional until Takeshi confirms the final headcount on Tuesday. I have marked it in amber.\n\nPriya\n\nPriya Raman\nVP, Operations | APPELLO`
    }),
    email({
      id:'m04', from:'marcus', to:['me'], at:'2026-11-09T08:19', read:false, flagged:true,
      subject:'Budget variance — one-line story',
      labels:['Board','Finance'], priority:'high',
      body:`Elizabeth,\n\nFor the board deck, the story is: “Travel is 6% over plan because the three-city client tour moved from Q1 to Q4; the offset is lower external event spend.” If we present the variance without that sentence, the board will assume we lost control of the budget.\n\nPlease put the sentence on the variance page and nowhere else. I do not want it repeated in the CEO summary.\n\nMarcus\n\nSent from my phone while boarding.`
    }),
    email({
      id:'m05', from:'liam', to:['me'], cc:['daniel'], at:'2026-11-09T08:28', read:false,
      subject:'Board attendee list — 11 confirmed',
      attachments:[{name:'Board Attendee Tracker.xlsx', kind:'sheet', size:'42 KB'},{name:'Board Dinner Seating v2.pdf', kind:'doc', size:'920 KB'}],
      labels:['Board'], priority:'normal',
      body:`Dear Elizabeth,\n\nEleven attendees are now confirmed for Thursday. The current tracker is attached. Please note that Dr. Petrova is vegetarian and requested a printed set. Mr. Williams prefers to receive financial materials 48 hours in advance; they were sent Friday, so we are compliant.\n\nI will need the final names and titles for the place cards by Tuesday at 12:00.\n\nKind regards,\nLiam O'Connor\nDirector, Board Relations`
    }),
    email({
      id:'m06', from:'sofia', to:['me'], at:'2026-11-09T08:40', read:false,
      subject:'Two approved messages for the press moment',
      labels:['Press'], priority:'normal',
      body:`Hola Elizabeth!\n\nI have approval for two messages for the anniversary press moment:\n\n• “Ten years of building what matters — with the clients who trusted us first.”\n• “Our next decade is about making complex systems feel simple for the people who use them.”\n\nPlease do not let anyone add a third message. Every extra line becomes a headline we do not control.\n\nCan you put these in the run-of-show and print a small card for Alexandra? Large type. She will be standing.\n\nThank you,\nSofia`
    }),
    email({
      id:'m07', from:'clara', to:['me'], cc:['alexandra','daniel'], at:'2026-11-09T08:52', read:false, flagged:true,
      subject:'Privileged: Atlas disclosure language',
      labels:['Legal','Board','Confidential'], priority:'high',
      body:`Elizabeth,\n\nPrivileged and confidential — do not forward outside the executive office.\n\nI am reviewing the sentence on page 14 of the board pack. It currently says the Atlas integration is “complete.” That is not accurate and creates disclosure risk. The proposed language is:\n\n“The Atlas integration is on track, with two workstreams remaining in validation.”\n\nPlease hold the pack until I confirm. I expect to send a clean approval by Tuesday 17:00 ET.\n\nClara Jensen\nGeneral Counsel`
    }),
    email({
      id:'m08', from:'isabel', to:['me'], cc:['daniel'], at:'2026-11-09T09:03', read:false,
      subject:'A coffee this week?',
      labels:['Client','Atlas'], priority:'normal',
      body:`Dear Elizabeth,\n\nI am in New York briefly on Tuesday and would love 30 minutes with Alexandra. A coffee in the lobby would be perfect — nothing formal.\n\nI know her day is full. If Tuesday does not work, please tell me honestly and we will find another moment when I am next in New York.\n\nWith warm regards,\nIsabel`
    }),
    email({
      id:'m09', from:'james', to:['me','priya'], at:'2026-11-09T09:14', read:false,
      subject:'Ardent QBR — agenda and decision log',
      labels:['Client'], priority:'normal',
      body:`Elizabeth,\n\nFor our London meeting on the 17th, please ensure the following are included:\n\n• The October decision log\n• The revised implementation timeline\n• A clear owner for the data migration workstream\n\nI would like the pre-read by Friday the 13th. I do not join meetings without an agenda, and I prefer to read in advance rather than on screen.\n\nRegards,\nJames Whitfield`
    }),
    email({
      id:'m10', from:'mei', to:['me','priya'], at:'2026-11-09T09:26', read:false, flagged:true,
      subject:'Helio RFP — submission deadline',
      labels:['Client','Deadline'], priority:'high',
      body:`Elizabeth,\n\nA reminder that the RFP closes on 13 November at 17:00 Singapore time. We will not extend the deadline.\n\nPlease confirm the final submission owner and that the signed cover page is included. I do not need a lengthy cover note; I need the complete document.\n\nMei Lin\nVP, Procurement, Helio Energy`
    }),
    email({
      id:'m11', from:'ahmed', to:['me'], at:'2026-11-09T09:38', read:false,
      subject:'Dubai visit — schedule and greeting',
      labels:['Client','Travel'], priority:'normal',
      body:`Dear Elizabeth,\n\nI look forward to welcoming Alexandra to Dubai on 18 November. Please note that our offices observe a quieter period around midday. A 10:00 start would be ideal.\n\nIt would be a pleasure to arrange lunch afterwards. Please let me know any dietary requirements for Alexandra and your team.\n\nWith respect,\nAhmed Al-Rashid`
    }),
    email({
      id:'m12', from:'gabriela', to:['me'], at:'2026-11-09T09:51', read:true,
      subject:'Atlas Foods visual direction — quick look?',
      labels:['Client'], priority:'normal',
      body:`Elizabeth!!\n\nI saw the first visual direction for our 2027 launch and I am genuinely excited. Could Alexandra and I steal 20 minutes on Thursday afternoon? I know it is board day, so if that is impossible, Friday morning also works.\n\nI am sending three ideas in one email, I know, I know. The second one is my favourite.\n\nAbraço,\nGabriela`
    }),
    email({
      id:'m13', from:'noah', to:['me'], at:'2026-11-09T10:02', read:false,
      subject:'Board materials — lender review',
      labels:['Board','Client'], priority:'normal',
      body:`Elizabeth,\n\nI received the financial pack Friday. Thank you. I will review it Tuesday and send questions Wednesday morning. Please make sure the pack I receive is final; I would rather wait than receive three versions.\n\nOne item: the covenant schedule attached is from FY26. It should be FY27. Please have that corrected before the board meeting.\n\nNoah Williams\nMeridian Bank`
    }),
    email({
      id:'m14', from:'elena', to:['me','liam'], at:'2026-11-09T10:16', read:false,
      subject:'Board dinner — printed materials',
      labels:['Board','Dinner'], priority:'normal',
      body:`Dear Elizabeth,\n\nI look forward to the board dinner. I would be grateful for a printed copy of the governance committee minutes and the final agenda at my place setting. I do not use a tablet at dinners.\n\nPlease also confirm that the vegetarian menu is available. I trust Liam has shared my dietary needs.\n\nSincerely,\nDr. Elena Petrova`
    }),
    email({
      id:'m15', from:'ravi', to:['me'], at:'2026-11-09T10:29', read:true,
      subject:'Pilot review — can we move it?',
      labels:['Client'], priority:'normal',
      body:`Hi Elizabeth,\n\nThe Kite Mobility pilot review is currently on Thursday the 12th. I now have a board commitment that day. Could we move to Thursday afternoon or Friday morning? I am flexible on the time but not on the day.\n\nThanks,\nRavi`
    }),
    email({
      id:'m16', from:'hannah', to:['me','ben'], at:'2026-11-09T10:41', read:true,
      subject:'AV rehearsal confirmation — Boardroom A',
      labels:['Vendor','Board'], priority:'normal',
      attachments:[{name:'Evergreen AV Rehearsal Confirmation.pdf', kind:'doc', size:'212 KB'}],
      body:`Hi Elizabeth,\n\nConfirming the AV rehearsal in Boardroom A on 11 November at 12:00. We will test the room camera, ceiling microphones, confidence monitor, and the backup laptop. The rehearsal is 30 minutes and does not require Alexandra for the technical checks; Ben can sign off.\n\nI have attached the confirmation. Invoice will follow separately and must reference PO NSM-4471.\n\nBest,\nHannah`
    }),
    email({
      id:'m17', from:'omar', to:['me'], at:'2026-11-09T10:55', read:false, flagged:true,
      subject:'Three-city itinerary — ticket deadline tomorrow',
      labels:['Travel','Vendor'], priority:'high',
      attachments:[{name:'Skyline 3-City Quote 8814.pdf', kind:'doc', size:'348 KB'}],
      body:`Elizabeth,\n\nI have held the following:\n\n• Nov 16: JFK → LHR, BA178, business\n• Nov 18: LHR → DXB, EK2, business\n• Nov 19: DXB → SIN, EK404, business\n• Nov 20: SIN → JFK via FRA, business\n\nTotal held fare: $21,650. Ticketing deadline is 10 November 17:00 Dubai time. After that, the fare can change.\n\nI also have hotel holds in all three cities. Please confirm the budget and I will issue the tickets.\n\nOmar\nSkyline Travel | Quote 3-city-8814`
    }),
    email({
      id:'m18', from:'fiona', to:['me','aisha'], at:'2026-11-09T11:08', read:false,
      subject:'Board dinner — final menu and count',
      labels:['Vendor','Dinner'], priority:'normal',
      attachments:[{name:'Glasshouse Board Dinner Menu.pdf', kind:'doc', size:'1.2 MB'}],
      body:`Dear Elizabeth,\n\nThe final menu options are attached. We need the guaranteed count by Tuesday at 12:00 and any allergy notes in writing. I currently show 14 guests plus Alexandra.\n\nPlease note that table 2 has a shellfish allergy. Our kitchen treats that as a serious requirement and will prepare separately.\n\nWarm regards,\nFiona MacLeod\nThe Glasshouse`
    }),
    email({
      id:'m19', from:'victor', to:['me'], at:'2026-11-09T11:21', read:false,
      subject:'Board pack print proofs — approval needed',
      labels:['Vendor','Board'], priority:'normal',
      attachments:[{name:'Ink & Grain Proofs v2.pdf', kind:'doc', size:'2.4 MB'}],
      body:`Elizabeth,\n\nThe v2 proofs are attached. Please give me one consolidated set of changes by 15:00 Mexico City time today. That is the last window that protects the Thursday delivery.\n\nWe are printing 14 sets, colour, tabbed, in the board folder. Delivery to the 12th floor reception by 17:00 Wednesday.\n\nVictor`
    }),
    email({
      id:'m20', from:'grace', to:['me'], at:'2026-11-09T11:36', read:true,
      subject:'London client day catering — counts',
      labels:['Vendor','Travel'], priority:'normal',
      body:`Hi Elizabeth,\n\nFor the London client day on 17 November, I have 12 confirmed. Please send final dietary counts by 15 November. Current notes: two vegetarian, one gluten-free, one shellfish allergy.\n\nWould you like coffee on arrival and again at 14:30? It is a long day.\n\nWarmly,\nGrace`
    }),
    email({
      id:'m21', from:'naomi', to:['me'], at:'2026-11-09T11:48', read:true,
      subject:'Board people update — two additions',
      labels:['Board','People'], priority:'normal',
      attachments:[{name:'People Board Update.docx', kind:'doc', size:'240 KB'}],
      body:`Elizabeth,\n\nTwo additions for the board people update: the new APAC operations lead starts Dec 1, and the internal mobility programme has three confirmed placements. Please keep the second confidential until the individuals have been told on Friday.\n\nI have put the final copy in the shared board folder. No need to reply unless something looks wrong.\n\nNaomi`
    }),
    email({
      id:'m22', from:'ethan', to:['me'], at:'2026-11-09T12:02', read:true,
      subject:'MFA reset complete — all exec office devices',
      labels:['IT'], priority:'normal',
      body:`Elizabeth,\n\nAll executive office devices have been moved to the new MFA policy. Alexandra's laptop may ask for a second factor once. If she sees a sign-in prompt during the board meeting, call the service desk and reference ticket IT-8842. Do not approve a push you did not initiate.\n\nEthan`
    }),
    email({
      id:'m23', from:'aisha', to:['me'], at:'2026-11-09T12:15', read:false,
      subject:'Gala seating chart v4 — use this one',
      labels:['Event'], priority:'normal',
      attachments:[{name:'APPELLO Gala Seating v4.xlsx', kind:'sheet', size:'74 KB'},{name:'Gala Run of Show v9.docx', kind:'doc', size:'310 KB'}],
      body:`Elizabeth,\n\nSeating chart v4 is attached. V3 is obsolete because we moved the Corvus table away from the speaker riser. Alexandra is at table 1 with Isabel and Dr. Petrova.\n\nCan you check that all executive office names match the board tracker? I do not want a place card with the wrong title.\n\nAisha`
    }),
    email({
      id:'m24', from:'takeshi', to:['me'], at:'2026-11-09T12:30', read:true,
      subject:'APAC dial-in details and board update',
      labels:['Board','APAC'], priority:'normal',
      body:`Dear Elizabeth,\n\nThank you for the agenda. I will join the board meeting remotely from Tokyo. Please find my dial-in details below. My board update is due by end of day Tuesday; I will send the final version to you and Liam.\n\nI appreciate the care you take with the time difference. A 22:00 Tokyo start is manageable for a board meeting, but please do not schedule additional calls after it.\n\nWith thanks,\nTakeshi Sato`
    }),
    email({
      id:'m25', from:'ben', to:['me'], at:'2026-11-09T12:46', read:true,
      subject:'Boardroom A setup and visitor passes',
      labels:['Facilities','Board'], priority:'normal',
      body:`Elizabeth,\n\nBoardroom A will be set for 12 in-person and four hybrid, as requested. I have added two extra microphones and tested the video wall. Visitor passes for Dr. Petrova and Mr. Williams are ready at reception. Isabel Rossi is on the visitor list for Tuesday.\n\nOne issue: the room is double-booked at 16:00 Tuesday for the travel briefing and Isabel's coffee. You will need to move one.\n\nBen`
    }),
    email({
      id:'m26', from:'alexandra', to:['me'], at:'2026-11-09T13:02', read:false, flagged:true, priority:'high',
      subject:'NEW: Move Isabel to 3:00 PM Tuesday',
      labels:['Urgent','Client'], priority:'high',
      body:`J,\n\nIsabel has to move her coffee to 3:00 PM on Tuesday. Her flight changed. Please make it happen without disturbing the budget review. Confirm to Isabel in writing and put it on my calendar. If there is a conflict, tell me the trade-off in one sentence.\n\nThis is time-sensitive.\n\nA`
    }),
    email({
      id:'m27', from:'alexandra', to:['me'], at:'2026-11-09T13:14', read:true,
      subject:'Signature and out-of-office standards',
      labels:['Executive'], priority:'normal',
      body:`Elizabeth,\n\nFor client-facing email, use the full signature with your title and my office line. For internal one-liners, the short signature is fine. When I travel, set my out-of-office at least 24 hours before departure and include the name of the person covering urgent matters.\n\nThis is not bureaucracy. It is how people know what to expect from us.\n\nA`
    }),
    email({
      id:'m28', from:'daniel', to:['me'], at:'2026-11-09T13:27', read:true,
      subject:'Handover note for Tuesday afternoon',
      labels:['Internal'], priority:'normal',
      body:`Elizabeth,\n\nI will be in back-to-back meetings from 14:00 Tuesday. If Alexandra needs a decision, use the one-line brief format and copy me. For anything involving Isabel or the board pack, call me rather than email.\n\nAlso: the AV walkthrough at 12:30 can be covered by Ben. Alexandra does not need to attend if the client lunch runs long.\n\nDaniel`
    }),
    email({
      id:'m29', from:'priya', to:['me'], at:'2026-11-09T13:39', read:true,
      subject:'Vendor scorecard — Evergreen AV',
      labels:['Vendor','Ops'], priority:'normal',
      body:`Elizabeth,\n\nEvergreen AV scored 4.6/5 this quarter, with a note about invoice timing. Could you ask Hannah to send invoices within five business days of delivery? It is a small process fix that makes month-end much cleaner.\n\nNo urgency. This can wait until after the board meeting.\n\nPriya`
    }),
    email({
      id:'m30', from:'marcus', to:['me'], at:'2026-11-09T13:52', read:false,
      subject:'Expense cut-off — noon PT tomorrow',
      labels:['Finance'], priority:'normal',
      body:`Elizabeth,\n\nReminder: Q4 expense submissions close at noon Pacific tomorrow. Alexandra has three outstanding receipts from the London trip and one from the client dinner. Please upload them before the cut-off. If the receipts are missing, send me a one-line explanation rather than an empty row.\n\nMarcus`
    }),
    email({
      id:'m31', from:'liam', to:['me','aisha'], at:'2026-11-09T14:06', read:true,
      subject:'Board dinner place cards and titles',
      labels:['Board','Dinner'], priority:'normal',
      body:`Dear Elizabeth,\n\nPlease use the following titles on place cards: Dr. Elena Petrova (Board Chair, Corvus Foundation), Mr. Noah Williams (SVP, Corporate Banking, Meridian Bank), Ms. Isabel Rossi (CEO, Vela Retail Group).\n\nAccuracy matters here. We can fix a menu; we cannot un-print a room full of place cards.\n\nLiam`
    }),
    email({
      id:'m32', from:'sofia', to:['me'], at:'2026-11-09T14:18', read:true,
      subject:'Press request — reporter follow-up',
      labels:['Press'], priority:'normal',
      body:`Elizabeth,\n\nA reporter from Business Weekend asked for a 10-minute comment after the anniversary. We have not agreed to an interview. Please do not confirm anything. I will decide tomorrow morning after the board pack is settled.\n\nIf they call, take a message and say we will respond in writing.\n\nSofia`
    }),
    email({
      id:'m33', from:'clara', to:['me'], at:'2026-11-09T14:31', read:false,
      subject:'NDA for the Dubai meeting',
      labels:['Legal','Travel'], priority:'normal',
      attachments:[{name:'Crescent Mutual NDA — final.pdf', kind:'doc', size:'480 KB'}],
      body:`Elizabeth,\n\nAttached is the mutual NDA for the Crescent Capital meeting. Ahmed's team has already signed their side. Please print two copies for Dubai and keep the executed version in the travel folder after signature.\n\nDo not send the document to the client again; they have the countersigned copy.\n\nClara`
    }),
    email({
      id:'m34', from:'isabel', to:['me'], at:'2026-11-09T14:44', read:true,
      subject:'Thank you for the Atlas preview',
      labels:['Client','Atlas'], priority:'normal',
      body:`Dear Elizabeth,\n\nThank you for arranging the Atlas preview last week. Alexandra's note about listening before designing stayed with me. It is rare to hear a CEO say that and mean it.\n\nI look forward to Tuesday. Please do not go to any trouble; a coffee is enough.\n\nWarmly,\nIsabel`
    }),
    email({
      id:'m35', from:'james', to:['me'], at:'2026-11-09T14:57', read:false,
      subject:'Reschedule: Ardent pre-read',
      labels:['Client'], priority:'normal',
      body:`Elizabeth,\n\nI need to move our pre-read call from Wednesday to Friday at 09:00 London time. I am travelling Thursday and cannot guarantee a reliable connection.\n\nPlease confirm. If Friday does not work for Alexandra, propose two alternatives and I will choose.\n\nJames`
    }),
    email({
      id:'m36', from:'mei', to:['me','priya'], at:'2026-11-09T15:10', read:true,
      subject:'Re: Helio RFP — one missing appendix',
      labels:['Client','Deadline'], priority:'high',
      body:`Elizabeth,\n\nI reviewed the draft. Appendix C is missing the data residency statement. This is a pass/fail requirement, not a scoring preference. Please add it before submission.\n\nI will be available for a short call tomorrow at 09:00 Singapore time if the team has a question.\n\nMei`
    }),
    email({
      id:'m37', from:'ahmed', to:['me'], at:'2026-11-09T15:23', read:true,
      subject:'Office visit — cultural note',
      labels:['Client','Travel'], priority:'normal',
      body:`Dear Elizabeth,\n\nA small note for planning: our team will offer coffee and dates at the start of the meeting. Please allow ten minutes for this. It is part of how we welcome guests, not an agenda item.\n\nI look forward to seeing Alexandra.\n\nAhmed`
    }),
    email({
      id:'m38', from:'noah', to:['me'], at:'2026-11-09T15:36', read:false, flagged:true,
      subject:'FY26 covenant schedule — correction',
      labels:['Board','Finance'], priority:'normal',
      body:`Elizabeth,\n\nAs mentioned, the covenant schedule in the pack is FY26. The corrected FY27 version is in the shared banking folder. Please replace the page rather than adding a second version. I need to be able to cite one page number on Thursday.\n\nNoah`
    }),
    email({
      id:'m39', from:'elena', to:['me'], at:'2026-11-09T15:48', read:true,
      subject:'Governance minutes',
      labels:['Board'], priority:'normal',
      attachments:[{name:'Governance Committee Minutes — Oct.pdf', kind:'doc', size:'660 KB'}],
      body:`Dear Elizabeth,\n\nAttached are the October governance committee minutes for the board dinner folders. Please ensure they are collated in the order: agenda, minutes, financial summary, people update.\n\nThank you for your care with the details.\n\nDr. Petrova`
    }),
    email({
      id:'m40', from:'ravi', to:['me'], at:'2026-11-09T16:01', read:true,
      subject:'Kite pilot — Friday 09:00?',
      labels:['Client'], priority:'normal',
      body:`Hi Elizabeth,\n\nFriday at 09:00 works for me. Could you send a calendar invite with a Teamspace link and the pilot metrics pre-read? 45 minutes should be enough.\n\nAppreciate the quick turnaround.\n\nRavi`
    }),
    email({
      id:'m41', from:'hannah', to:['me'], at:'2026-11-09T16:14', read:true,
      subject:'Evergreen AV invoice — PO reference',
      labels:['Vendor','Finance'], priority:'normal',
      attachments:[{name:'Evergreen AV Invoice 8841.pdf', kind:'doc', size:'88 KB'}],
      body:`Hi Elizabeth,\n\nInvoice 8841 attached for the Boardroom A rehearsal. Please confirm PO NSM-4471 so we can process it. I know month-end is close; happy to reissue if the reference has changed.\n\nHannah`
    }),
    email({
      id:'m42', from:'omar', to:['me'], at:'2026-11-09T16:27', read:false, flagged:true,
      subject:'Fare will release tomorrow — 17:00 GST',
      labels:['Travel','Vendor'], priority:'high',
      body:`Elizabeth,\n\nQuick reminder: the three-city fare releases tomorrow at 17:00 Gulf time. That is 08:00 in New York. If I do not have approval by then, the fare may increase by roughly $1,800.\n\nI can hold it longer only if the airline extends, which I cannot guarantee.\n\nOmar`
    }),
    email({
      id:'m43', from:'fiona', to:['me'], at:'2026-11-09T16:40', read:true,
      subject:'Board dinner — vegetarian confirmation',
      labels:['Vendor','Dinner'], priority:'normal',
      body:`Elizabeth,\n\nConfirming the vegetarian menu for Dr. Petrova and a separate shellfish-free preparation at table 2. The kitchen has the notes in writing.\n\nWe still need the guaranteed count by noon Tuesday. I will hold the room until then.\n\nFiona`
    }),
    email({
      id:'m44', from:'aisha', to:['me'], at:'2026-11-09T16:53', read:false,
      subject:'Gala guest list — one correction',
      labels:['Event'], priority:'normal',
      body:`Elizabeth,\n\nOne correction to the guest list: Isabel Rossi is attending as Alexandra's guest, not as a Vela company table. Please make sure reception does not seat her with the Vela team. She and Dr. Petrova are at table 1 with Alexandra.\n\nI have updated the seating chart. Use v4 only.\n\nAisha`
    }),
    email({
      id:'m45', from:'naomi', to:['me'], at:'2026-11-09T17:06', read:true,
      subject:'Benefits briefing — optional for exec office',
      labels:['People'], priority:'normal',
      body:`Elizabeth,\n\nThere is an optional benefits briefing on Friday at 12:00. No pressure to attend, but I know you have been asking about the tuition benefit. I saved you a seat.\n\nNaomi`
    }),
    email({
      id:'m46', from:'ethan', to:['me'], at:'2026-11-09T17:19', read:true,
      subject:'Phishing simulation results',
      labels:['IT'], priority:'normal',
      body:`Elizabeth,\n\nThe exec office came through clean in this month's phishing test. One person clicked but reported it immediately, which is the right behaviour. I have attached a one-page guide you can share if useful.\n\nEthan`
    }),
    email({
      id:'m47', from:'ben', to:['me'], at:'2026-11-09T17:32', read:true,
      subject:'Parking and car service for Nov 16',
      labels:['Travel','Facilities'], priority:'normal',
      body:`Elizabeth,\n\nCar service for the London departure is confirmed for 15:30 on Monday the 16th. The driver will meet Alexandra at the building entrance. I have also reserved a parking bay for the car.\n\nPlease send the driver's number to Alexandra the day before.\n\nBen`
    }),
    email({
      id:'m48', from:'training', to:['me'], at:'2026-11-09T07:15', read:false,
      subject:'EA Academy: your Monday practice plan',
      labels:['Training'], priority:'normal',
      body:`Welcome to your training workstation, Elizabeth.\n\nToday's suggested practice:\n\n• Level 1: Send a professional email (8 min)\n• Level 2: Book a room without creating a conflict (12 min)\n• Level 3: Build the three-city travel budget (25 min)\n\nOpen the Training Hub from the taskbar to begin. Every email, colleague, and document here is fictional. You cannot break anything.\n\n— EA Academy Coach`
    })
  ];

  const SENT_EMAILS = [
    email({ id:'s01', folder:'sent', from:'me', to:['daniel'], cc:['alexandra'], at:'2026-11-09T08:10', read:true,
      subject:'Re: Board run-of-show — v6 confirmed', body:`Hi Daniel,\n\nV6 is confirmed. I will use it for the printed packs and destroy the old v5 copies.\n\nBoardroom A is set for 12 in person and 4 hybrid. Ben has added two microphones and tested the video wall.\n\nBest,\nElizabeth` }),
    email({ id:'s02', folder:'sent', from:'me', to:['hannah'], cc:['ben'], at:'2026-11-09T08:24', read:true,
      subject:'AV rehearsal confirmed — 11 Nov, 12:00', body:`Hi Hannah,\n\nConfirmed for Boardroom A on 11 November at 12:00. Ben will sign off the technical checks; Alexandra may join if the schedule allows.\n\nPlease reference PO NSM-4471 on the invoice.\n\nBest,\nElizabeth` }),
    email({ id:'s03', folder:'sent', from:'me', to:['marcus'], at:'2026-11-08T16:42', read:true,
      subject:'Expense template for Q4 close', body:`Hi Marcus,\n\nThe updated expense template is in the shared Finance folder. It includes the new vendor tax field and the travel cost-centre mapping we agreed last quarter.\n\nI will upload Alexandra's outstanding receipts before the noon PT cut-off tomorrow.\n\nBest,\nElizabeth` }),
    email({ id:'s04', folder:'sent', from:'me', to:['isabel'], cc:['alexandra'], at:'2026-11-08T15:05', read:true,
      subject:'Coffee in New York — Tuesday', body:`Dear Isabel,\n\nAlexandra would be delighted to see you on Tuesday. We have set aside time at 4:00 PM for a coffee in the lobby. I will confirm the exact table on the day.\n\nThank you for making the time while you are in New York.\n\nWarm regards,\nElizabeth` }),
    email({ id:'s05', folder:'sent', from:'me', to:['liam','marcus','clara'], cc:['alexandra','daniel'], at:'2026-11-06T17:22', read:true,
      subject:'Board pack distribution plan', body:`Dear all,\n\nThe board pack will be distributed Wednesday after Clara's written approval and the print proofs are signed off. Dr. Petrova will receive a printed set; the hybrid attendees will receive a secure link.\n\nI will send a final confirmation once the pack is frozen.\n\nBest,\nElizabeth` })
  ];

  const DRAFT_EMAILS = [
    email({ id:'d01', folder:'drafts', from:'me', to:['fiona'], cc:['aisha'], at:'2026-11-09T16:49', read:true,
      subject:'Board dinner — guaranteed count', body:`Hi Fiona,\n\nI am confirming the final count for Thursday. We currently have 14 guests plus Alexandra.\n\n` }),
    email({ id:'d02', folder:'drafts', from:'me', to:['omar'], at:'2026-11-09T16:33', read:true,
      subject:'Three-city travel — approval to ticket', body:`Hi Omar,\n\nThank you for holding the itinerary. I am reviewing the budget with Alexandra and will confirm ticketing by tomorrow morning.\n\n` })
  ];

  const ARCHIVE_EMAILS = [
    email({ id:'a01', folder:'archive', from:'alexandra', to:['me'], at:'2026-11-06T19:12', read:true,
      subject:'Notes from Friday leadership offsite', body:`Elizabeth,\n\nPlease file these notes in the Executive Office folder. The three decisions are: (1) protect the Singapore relationship, (2) hold the gala guest list at 120, (3) keep the Atlas announcement internal until December.\n\nA` }),
    email({ id:'a02', folder:'archive', from:'naomi', to:['me'], at:'2026-11-05T10:20', read:true,
      subject:'Laptop refresh schedule', body:`Elizabeth,\n\nAlexandra's laptop is due for refresh in February. I will coordinate with Ethan. No action needed now.\n\nNaomi` }),
    email({ id:'a03', folder:'archive', from:'liam', to:['me'], at:'2026-11-04T14:36', read:true,
      subject:'October board minutes — approved', body:`Dear Elizabeth,\n\nThe October board minutes were approved without changes. Please replace the draft in the board folder with the approved version.\n\nLiam` }),
    email({ id:'a04', folder:'archive', from:'aisha', to:['me'], at:'2026-11-03T09:04', read:true,
      subject:'Gala venue walkthrough notes', body:`Elizabeth,\n\nWalkthrough complete. The stage is 30 cm higher than v1 plans, so we adjusted the speaker sightlines. Seating v2 is obsolete; I will send v3 later this week.\n\nAisha` })
  ];

  const DELETED_EMAILS = [
    email({ id:'x01', folder:'deleted', deletedFrom:'inbox', from:'appello', to:['me'], at:'2026-11-08T06:00', read:true,
      subject:'You have won a $500 gift card!', body:`This is a simulated phishing email used for training. Do not click links in unexpected prize messages. Report suspicious mail and delete it.` }),
    email({ id:'x02', folder:'deleted', deletedFrom:'inbox', from:'appello', to:['me'], at:'2026-11-07T12:14', read:true,
      subject:'Last chance: office snack survey', body:`This low-priority office survey was deleted during inbox triage. In real life, deleting a legitimate internal notice without reading it can lose useful information.` })
  ];

  const CUSTOM_FOLDER_EMAILS = [
    email({ id:'v01', folder:'custom-vendor-invoices', from:'hannah', to:['me'], at:'2026-11-09T11:02', read:true,
      subject:'Invoice 8837 — October AV support', labels:['Vendor','Finance'], attachments:[{name:'Evergreen Invoice 8837.pdf', kind:'doc', size:'76 KB'}],
      body:`Hi Elizabeth,\n\nInvoice 8837 for October AV support is attached. PO NSM-4471. No action beyond approval.\n\nHannah` }),
    email({ id:'v02', folder:'custom-vendor-invoices', from:'victor', to:['me'], at:'2026-11-08T15:28', read:true,
      subject:'Ink & Grain invoice 2291', labels:['Vendor','Finance'], attachments:[{name:'Ink and Grain Invoice 2291.pdf', kind:'doc', size:'64 KB'}],
      body:`Elizabeth,\n\nInvoice 2291 for the board pack print proofs. Net 30. Please route to finance with the PO reference.\n\nVictor` })
  ];

  const SCHEDULED_EMAILS = [
    email({ id:'q01', folder:'scheduled', from:'me', to:['ravi'], at:'2026-11-09T18:00', scheduledFor:'2026-11-10T08:00',
      subject:'Kite pilot review — Friday 09:00', body:`Hi Ravi,\n\nFriday at 09:00 is confirmed. I will send the Teamspace link and pre-read separately today.\n\nBest,\nElizabeth` })
  ];

  // Keep the inbox anchored before the simulated mid-morning desk review. The
  // array order is the intended priority order, with the CEO's board-pack note
  // arriving most recently.
  let inboxMinute = 9 * 60 + 18;
  INBOX_EMAILS.forEach((message, index) => {
    const minute = Math.max(6 * 60 + 5, inboxMinute - index * 3);
    const hh = String(Math.floor(minute / 60)).padStart(2, '0');
    const mm = String(minute % 60).padStart(2, '0');
    message.at = `2026-11-09T${hh}:${mm}`;
    message.time = `${hh}:${mm}`;
    message.date = '2026-11-09';
  });

  const ALL_EMAILS = [...INBOX_EMAILS, ...SENT_EMAILS, ...DRAFT_EMAILS, ...ARCHIVE_EMAILS, ...DELETED_EMAILS, ...CUSTOM_FOLDER_EMAILS, ...SCHEDULED_EMAILS];

  /* ------------------------------- Teamspace ------------------------------- */
  const TEAM_SPACES = [
    { id:'exec-office', name:'Executive Office', icon:'EO', description:'The CEO’s office and senior leadership coordination.', channels:[
      { id:'exec-announcements', name:'Announcements', description:'Official executive office updates. Keep replies to reactions unless asked.' },
      { id:'exec-general', name:'General', description:'Day-to-day coordination for the executive office.' },
      { id:'ceo-desk', name:'CEO Desk', description:'Requests and updates for Alexandra’s desk. Assume she can see this channel.' }
    ]},
    { id:'travel-events', name:'Travel & Events', icon:'TE', description:'Travel planning, client visits, the anniversary gala, and board dinner.', channels:[
      { id:'three-city', name:'3-City Tour', description:'London, Dubai, and Singapore, Nov 16–21. Ticket deadline Nov 10.' },
      { id:'gala', name:'APPELLO @ 10', description:'Anniversary gala planning. The seating chart is now v4.' }
    ]},
    { id:'board-prep', name:'Board Prep', icon:'BP', description:'Everything for the Nov 12 board meeting and board dinner.', channels:[
      { id:'nov-board', name:'Nov 12 Board', description:'Run-of-show, attendees, and final logistics. Materials freeze Nov 11 at 17:00.' },
      { id:'board-materials', name:'Board Materials', description:'Draft versions of the board pack. Clara’s legal approval is required.' }
    ]},
    { id:'operations', name:'Operations', icon:'OP', description:'Company operations, vendors, facilities, and IT coordination.', channels:[
      { id:'ops-weekly', name:'Weekly Ops', description:'Operational priorities and cross-team decisions.' },
      { id:'vendors', name:'Vendors', description:'Coordinate approved vendors. Never share confidential board materials here.' }
    ]}
  ];

  function message(id, from, text, at, opts) {
    return {
      id, from, text, at,
      reactions: opts && opts.reactions ? opts.reactions : {},
      pinned: !!(opts && opts.pinned),
      thread: opts && opts.thread ? opts.thread : [],
      attachment: opts && opts.attachment ? opts.attachment : null
    };
  }

  const CHATS = [
    { id:'chat-alexandra', name:'Alexandra Morgan', type:'dm', members:['alexandra','me'], pinned:true,
      messages:[
        message('c1m1','alexandra','J — where are we on the board pack?', '2026-11-09T07:44', {pinned:true}),
        message('c1m2','me','Clara is reviewing the Atlas language. I have the print proofs queued for approval and the room is set for 12 + 4 hybrid.', '2026-11-09T07:47', {reactions:{'👍':['alexandra']}}),
        message('c1m3','alexandra','Good. Don’t let the pack go out before Clara replies in writing.', '2026-11-09T07:48', {pinned:true}),
        message('c1m4','me','Understood. I’ll flag any risk by 3:00 today.', '2026-11-09T07:49', {}),
        message('c1m5','alexandra','Also — Isabel moved to 3:00 Tuesday. Make it work without touching the budget review.', '2026-11-09T13:04', {})
      ]},
    { id:'chat-daniel', name:'Daniel Kim', type:'dm', members:['daniel','me'], pinned:false,
      messages:[
        message('c2m1','daniel','Morning. V6 run-of-show is in your inbox. V5 is dead — please don’t let it into the print run.', '2026-11-09T07:59'),
        message('c2m2','me','Got it. V6 only. I’ll confirm the room count with Ben.', '2026-11-09T08:02', {reactions:{'✅':['daniel']}}),
        message('c2m3','daniel','Also, if Isabel needs a move tomorrow, protect the budget review. That one is board-critical.', '2026-11-09T13:08', {pinned:true})
      ]},
    { id:'chat-board-triage', name:'Board pack triage', type:'group', members:['alexandra','daniel','liam','marcus','clara','me'], pinned:true,
      messages:[
        message('c3m1','liam','Attendance is at 11 confirmed. I still need final titles for place cards by noon Tuesday.', '2026-11-09T08:31'),
        message('c3m2','marcus','Financial variance page will be updated with the one-line story this morning. Do not send the pack before that lands.', '2026-11-09T08:36', {pinned:true}),
        message('c3m3','clara','I am still reviewing page 14. Please hold distribution until I confirm in writing.', '2026-11-09T08:54', {reactions:{'👀':['daniel','me']}}),
        message('c3m4','me','Understood. Hold on distribution until legal approval and finance wording are both in.', '2026-11-09T08:57')
      ]},
    { id:'chat-naomi', name:'Naomi Brooks', type:'dm', members:['naomi','me'], pinned:false,
      messages:[
        message('c2m4','naomi','Hi Elizabeth! I’ve added two items to the board people update. One is confidential until Friday — could you keep it in the exec folder only?', '2026-11-09T11:50'),
        message('c2m5','me','Of course. I’ll keep the file permissions limited to the exec office and Alexandra.', '2026-11-09T11:53', {reactions:{'🙏':['naomi']}})
      ]},
    { id:'chat-aisha', name:'Aisha Bello', type:'dm', members:['aisha','me'], pinned:false,
      messages:[
        message('c2m6','aisha','Seating chart v4 is in your inbox. Please ignore v3 — I moved the Corvus table away from the riser.', '2026-11-09T12:17'),
        message('c2m7','aisha','Can you check the exec names against the board tracker? I’m worried about titles on the place cards.', '2026-11-09T12:18')
      ]},
    { id:'chat-travel-trio', name:'3-City Travel Trio', type:'group', members:['alexandra','aisha','omar','me'], pinned:true,
      messages:[
        message('c2m8','omar','Holds are in place through tomorrow 17:00 GST. Fare may rise by about $1,800 after that.', '2026-11-09T10:57', {pinned:true}),
        message('c2m9','aisha','I can cover the London day logistics. Juniper & Sage needs final dietary counts by the 15th.', '2026-11-09T11:04'),
        message('c2m10','alexandra','I want the budget to stay under the approved cap. If it doesn’t, give me options, not a surprise.', '2026-11-09T11:12', {pinned:true})
      ]},
    { id:'chat-fiona', name:'Fiona MacLeod — The Glasshouse', type:'dm', members:['fiona','me'], pinned:false, external:true,
      messages:[
        message('c2m11','fiona','Elizabeth, we need the guaranteed dinner count by noon Tuesday. I have 14 plus Alexandra on my sheet.', '2026-11-09T11:10'),
        message('c2m12','me','Thank you, Fiona. I’ll confirm after checking the final attendee list.', '2026-11-09T11:14')
      ]}
  ];

  const CHANNEL_POSTS = {
    'exec-announcements': [
      message('ch1','alexandra','Reminder: the November board meeting materials freeze Wednesday at 17:00 ET. After that, only Clara-approved corrections will be accepted.', '2026-11-09T08:00', {pinned:true, reactions:{'👍':['daniel','liam','marcus','priya','naomi']}}),
      message('ch2','daniel','Thank you to everyone who sent board inputs. Elizabeth is consolidating final versions today. Please send any last corrections directly to Elizabeth, not to the printer.', '2026-11-09T09:10', {reactions:{'🙌':['sofia','aisha']}})
    ],
    'exec-general': [
      message('ch3','ben','Boardroom A is set for 12 in person and 4 hybrid. Two extra mics added. Visitor passes at reception.', '2026-11-09T09:42'),
      message('ch4','naomi','People update is final except for one confidential item. I’ll flag it to Elizabeth separately.', '2026-11-09T11:55'),
      message('ch5','me','Thanks Ben and Naomi. I’m tracking all final inputs in the board pack checklist.', '2026-11-09T12:02', {reactions:{'✅':['ben']}})
    ],
    'ceo-desk': [
      message('ch6','alexandra','This week: board pack quality, the Isabel move, and the three-city budget. Everything else can wait until Friday.', '2026-11-09T07:36', {pinned:true}),
      message('ch7','me','Tracking those three. I’ll bring a one-page status to the 9:30 desk review.', '2026-11-09T07:39')
    ],
    'three-city': [
      message('ch8','omar','Ticketing deadline: Nov 10, 17:00 GST / 08:00 ET. Current held fare $21,650. Complete quote attached in email.', '2026-11-09T10:59', {pinned:true}),
      message('ch9','aisha','London day is 09:00–16:00 at Ardent. I’m coordinating lunch with Juniper & Sage.', '2026-11-09T11:18'),
      message('ch10','me','I’m reviewing the budget against the approved cap today. Will confirm ticketing before the deadline.', '2026-11-09T11:25')
    ],
    'gala': [
      message('ch11','aisha','Seating chart v4 is final. Alexandra, Isabel, and Dr. Petrova at table 1. Please do not use v3.', '2026-11-09T12:19', {pinned:true, reactions:{'👍':['sofia','daniel']}}),
      message('ch12','sofia','Two approved press messages only. I’ll send the card copy to Elizabeth.', '2026-11-09T13:20')
    ],
    'nov-board': [
      message('ch13','liam','Run-of-show v6 is the only current version. Board pack distribution waits for Clara and Marcus.', '2026-11-09T08:34', {pinned:true}),
      message('ch14','marcus','Variance language is with Elizabeth. Do not paraphrase it — the wording matters to the lender.', '2026-11-09T08:39'),
      message('ch15','clara','Legal approval on page 14 expected Tuesday by 17:00 ET. Nothing leaves before then.', '2026-11-09T08:56', {pinned:true})
    ],
    'board-materials': [
      message('ch16','me','Current status: finance wording pending, legal review pending, print proofs due today at 15:00 CT, attendee titles due Tuesday noon.', '2026-11-09T09:20', {pinned:true}),
      message('ch17','liam','Please make sure Dr. Petrova’s printed set is separate and labeled. She does not share materials at the table.', '2026-11-09T10:18'),
      message('ch18','marcus','Noah flagged the FY26 covenant page. Replace it with FY27. Do not add a second covenant page.', '2026-11-09T15:40')
    ],
    'ops-weekly': [
      message('ch19','priya','Helio RFP Appendix C is missing the data residency statement. This is pass/fail. Owner needed today.', '2026-11-09T15:12'),
      message('ch20','ethan','Reminder: use the IT portal for device requests. I cannot action DMs during board week.', '2026-11-09T15:22'),
      message('ch21','me','I’ll chase Appendix C with Priya and Clara before end of day.', '2026-11-09T15:28')
    ],
    'vendors': [
      message('ch22','ben','Reminder to all vendors: visitor passes are required. Evergreen AV is cleared for Wednesday rehearsal.', '2026-11-09T12:40', {pinned:true}),
      message('ch23','aisha','Glasshouse final count due tomorrow noon. Please don’t send catering changes directly to Fiona; route them through me or Elizabeth.', '2026-11-09T13:10')
    ]
  };

  const INCOMING_CALLS = [
    { id:'call-isabel', caller:'isabel', purpose:'Isabel Rossi calling about Tuesday coffee and her changed flight.', script:'Elizabeth, hello — it is Isabel. My flight has moved and I am afraid I can no longer make four o’clock. Could we possibly do three? I know Alexandra is very busy.', expected:'Take a message and note the new time, then confirm you will check with Alexandra.' },
    { id:'call-noah', caller:'noah', purpose:'Noah Williams calling about the incorrect FY26 covenant page in the board pack.', script:'Good morning. It is Noah Williams. I have the board pack in front of me and the covenant schedule is still FY26. I need a single correct page before Thursday.', expected:'Take a precise message and create a follow-up task. Do not promise a version without checking.' },
    { id:'call-reporter', caller:'external-reporter', purpose:'A reporter asks for a comment on the anniversary. Sofia has not approved an interview.', script:'Hi, this is a producer from Business Weekend. We are doing a short piece on APPELLO’s anniversary. Can Alexandra give us two minutes this afternoon?', expected:'Do not confirm. Take a message and say the team will respond in writing.' },
    { id:'call-daniel', caller:'daniel', purpose:'Daniel needs the final Isabel decision before his 2:00 PM meeting block.', script:'Elizabeth — Daniel. Did Alexandra approve moving Isabel to three? I need the final answer before I go into back-to-backs.', expected:'Answer with the status, capture a time-sensitive action, or transfer appropriately.' }
  ];

  /* ------------------------------ Workbooks ----------------------------- */
  const C = (v, s) => s ? { v: String(v), s } : { v: String(v) };
  const F = (v, s) => s ? { v: String(v), f: String(v), s } : { v: String(v), f: String(v) };
  const money = { fmt:'currency', align:'right' };
  const percent = { fmt:'percent', align:'right' };
  const dateFmt = { fmt:'date', align:'center' };
  const header = { b:true, color:'#ffffff', bg:'#174a8b', align:'center', border:true };
  const subhead = { b:true, bg:'#e8f0fb', color:'#173a64', border:true };
  const totalStyle = { b:true, bg:'#dce9f9', color:'#12365f', border:true, fmt:'currency' };
  const labelTotal = { b:true, bg:'#dce9f9', color:'#12365f', border:true };
  const bodyBorder = { border:true };
  const warn = { bg:'#fff1cf', color:'#7c4c00', border:true };
  const good = { bg:'#e5f5eb', color:'#10643a', border:true };
  const bad = { bg:'#fde7e4', color:'#952b1e', border:true };

  function sheet(name, cells, options) {
    return Object.assign({
      name, cells,
      colWidths: { A:165, B:170, C:110, D:100, E:100, F:105, G:120, H:210 },
      rowHeights: {},
      freeze: { row: 1, col: 0 },
      conditionalFormats: [],
      chart: null,
      filter: null,
      hiddenRows: []
    }, options || {});
  }

  const expenseCells = {
    A1:C('Category', header), B1:C('Vendor', header), C1:C('Date', header), D1:C('Budget', header), E1:C('Actual', header), F1:C('Variance', header), G1:C('Status', header), H1:C('Notes', header),
    A2:C('Airfare', bodyBorder), B2:C('Skyline Travel'), C2:C('2026-10-14', dateFmt), D2:C(8500, money), E2:C(8120, money), F2:F('=D2-E2', money), G2:F('=IF(F2>=0,"Under","Over")', good), H2:C('NY–London–Dubai'),
    A3:C('Hotels', bodyBorder), B3:C('The Glasshouse'), C3:C('2026-10-15', dateFmt), D3:C(3600, money), E3:C(3890, money), F3:F('=D3-E3', money), G3:F('=IF(F3>=0,"Under","Over")', bad), H3:C('3 nights, London'),
    A4:C('Ground transport', bodyBorder), B4:C('Blacklane'), C4:C('2026-10-16', dateFmt), D4:C(1400, money), E4:C(1215, money), F4:F('=D4-E4', money), G4:F('=IF(F4>=0,"Under","Over")', good), H4:C('Airport transfers'),
    A5:C('Client dining', bodyBorder), B5:C('Juniper & Sage'), C5:C('2026-10-16', dateFmt), D5:C(2200, money), E5:C(2475, money), F5:F('=D5-E5', money), G5:F('=IF(F5>=0,"Under","Over")', bad), H5:C('Ardent QBR dinner'),
    A6:C('AV & production', bodyBorder), B6:C('Evergreen AV'), C6:C('2026-10-17', dateFmt), D6:C(1800, money), E6:C(1800, money), F6:F('=D6-E6', money), G6:F('=IF(F6>=0,"Under","Over")', good), H6:C('Boardroom A support'),
    A7:C('Print & materials', bodyBorder), B7:C('Ink & Grain'), C7:C('2026-10-17', dateFmt), D7:C(950, money), E7:C(1120, money), F7:F('=D7-E7', money), G7:F('=IF(F7>=0,"Under","Over")', bad), H7:C('14 board sets'),
    A8:C('Venue', bodyBorder), B8:C('The Glasshouse'), C8:C('2026-10-18', dateFmt), D8:C(3200, money), E8:C(3200, money), F8:F('=D8-E8', money), G8:F('=IF(F8>=0,"Under","Over")', good), H8:C('Board dinner deposit'),
    A9:C('Miscellaneous', bodyBorder), B9:C('Various'), C9:C('2026-10-18', dateFmt), D9:C(600, money), E9:C(521, money), F9:F('=D9-E9', money), G9:F('=IF(F9>=0,"Under","Over")', good), H9:C('Visas and courier'),
    A11:C('TOTAL', labelTotal), B11:C('Q4 executive travel', labelTotal), C11:C('', labelTotal), D11:F('=SUM(D2:D9)', totalStyle), E11:F('=SUM(E2:E9)', totalStyle), F11:F('=SUM(F2:F9)', totalStyle), G11:F('=IF(F11>=0,"Under budget","Over budget")', labelTotal), H11:C('Board-approved Q4 travel', labelTotal),
    A13:C('Budget remaining', subhead), D13:F('=D11-E11', { b:true, bg:'#eef5fc', color:'#0d4b7d', border:true, fmt:'currency' }),
    A14:C('Vendors over budget', subhead), D14:F('=COUNTIF(F2:F9,"<0")', { b:true, bg:'#eef5fc', color:'#0d4b7d', border:true, fmt:'number' }),
    A15:C('Largest actual expense', subhead), D15:F('=MAX(E2:E9)', { b:true, bg:'#eef5fc', color:'#0d4b7d', border:true, fmt:'currency' }),
    A17:C('Prepared by', subhead), B17:C('Elizabeth Hale'),
    A18:C('Last updated', subhead), B18:F('=DATE(2026,11,9)', { fmt:'date' }),
    A19:C('Approval', subhead), B19:C('Pending — Marcus Chen')
  };

  const travelCells = {
    A1:C('Date', header), B1:C('City', header), C1:C('Time', header), D1:C('Activity', header), E1:C('Contact', header), F1:C('Confirmation', header), G1:C('Notes', header),
    A2:C('Nov 16', dateFmt), B2:C('New York → London'), C2:C('18:20'), D2:C('BA178, JFK T4'), E2:C('Omar Haddad'), F2:C('SKY-8814'), G2:C('Car service 15:30'),
    A3:C('Nov 17', dateFmt), B3:C('London'), C3:C('09:00–16:00'), D3:C('Ardent Health client day'), E3:C('James Whitfield'), F3:C('ARD-QBR-17'), G3:C('Print pre-read by Nov 13'),
    A4:C('Nov 17', dateFmt), B4:C('London'), C4:C('19:00'), D4:C('Team dinner'), E4:C('Priya Raman'), F4:C('JS-1107'), G4:C('Juniper & Sage; 4 dietary notes'),
    A5:C('Nov 18', dateFmt), B5:C('London → Dubai'), C5:C('08:15'), D5:C('EK2, LHR T3'), E5:C('Omar Haddad'), F5:C('SKY-8814'), G5:C('Hotel check-in 14:00'),
    A6:C('Nov 18', dateFmt), B6:C('Dubai'), C6:C('10:00–15:00'), D6:C('Crescent Capital meetings'), E6:C('Ahmed Al-Rashid'), F6:C('CC-DXB-18'), G6:C('Allow coffee welcome; NDA signed'),
    A7:C('Nov 19', dateFmt), B7:C('Dubai → Singapore'), C7:C('08:05'), D7:C('EK404, DXB T3'), E7:C('Omar Haddad'), F7:C('SKY-8814'), G7:C('Check-in 06:00'),
    A8:C('Nov 19', dateFmt), B8:C('Singapore'), C8:C('14:00–18:00'), D8:C('Helio RFP close-out'), E8:C('Mei Lin'), F8:C('HELIO-19'), G8:C('Takeshi joins remotely'),
    A9:C('Nov 20', dateFmt), B9:C('Singapore → New York'), C9:C('23:55'), D9:C('SQ 326 via Frankfurt'), E9:C('Omar Haddad'), F9:C('SKY-8814'), G9:C('Arrives Nov 21 at 08:30'),
    A10:C('Nov 21', dateFmt), B10:C('New York'), C10:C('08:30'), D10:C('Arrival'), E10:C('Ben Carter'), F10:C('CAR-1121'), G10:C('Car service from JFK'),
    A12:C('Traveler', subhead), B12:C('Alexandra Morgan'), D12:C('Trip owner', subhead), E12:C('Elizabeth Hale'), G12:C('Booking status', subhead), H12:C('ON HOLD', { b:true, bg:'#fff1cf', color:'#7c4c00', border:true, align:'center' }),
    A13:C('Purpose', subhead), B13:C('Client relationships + APAC close-out'), D13:C('Duration', subhead), E13:C('6 days / 5 nights'), G13:C('Ticket deadline', subhead), H13:C('Nov 10, 08:00 ET', { b:true, bg:'#fde7e4', color:'#952b1e', border:true, align:'center' })
  };

  const travelBudgetCells = {
    A1:C('Category', header), B1:C('Vendor', header), C1:C('Estimate', header), D1:C('Confirmed', header), E1:C('Variance', header), F1:C('Status', header), G1:C('Notes', header),
    A2:C('Airfare: NY–London', bodyBorder), B2:C('Skyline Travel'), C2:C(8400, money), D2:C(8400, money), E2:F('=C2-D2', money), F2:F('=IF(E2>=0,"Within","Over")', good), G2:C('BA178 business'),
    A3:C('Airfare: London–Dubai', bodyBorder), B3:C('Skyline Travel'), C3:C(3200, money), D3:C(3200, money), E3:F('=C3-D3', money), F3:F('=IF(E3>=0,"Within","Over")', good), G3:C('EK2 business'),
    A4:C('Airfare: Dubai–Singapore', bodyBorder), B4:C('Skyline Travel'), C4:C(2650, money), D4:C(2650, money), E4:F('=C4-D4', money), F4:F('=IF(E4>=0,"Within","Over")', good), G4:C('EK404 business'),
    A5:C('Airfare: Singapore–NY', bodyBorder), B5:C('Skyline Travel'), C5:C(7800, money), D5:C(7800, money), E5:F('=C5-D5', money), F5:F('=IF(E5>=0,"Within","Over")', good), G5:C('SQ 326 via FRA'),
    A6:C('Hotel: London (3 nights)', bodyBorder), B6:C('The Glasshouse'), C6:C(4200, money), D6:C(4200, money), E6:F('=C6-D6', money), F6:F('=IF(E6>=0,"Within","Over")', good), G6:C('Breakfast included'),
    A7:C('Hotel: Dubai (2 nights)', bodyBorder), B7:C('Skyline Travel'), C7:C(2600, money), D7:C(2600, money), E7:F('=C7-D7', money), F7:F('=IF(E7>=0,"Within","Over")', good), G7:C('DIFC location'),
    A8:C('Hotel: Singapore (2 nights)', bodyBorder), B8:C('Skyline Travel'), C8:C(2400, money), D8:C(2400, money), E8:F('=C8-D8', money), F8:F('=IF(E8>=0,"Within","Over")', good), G8:C('Marina Bay'),
    A9:C('Ground transport', bodyBorder), B9:C('Blacklane'), C9:C(1400, money), D9:C(1400, money), E9:F('=C9-D9', money), F9:F('=IF(E9>=0,"Within","Over")', good), G9:C('All cities'),
    A10:C('Client dinners', bodyBorder), B10:C('Juniper & Sage'), C10:C(1800, money), D10:C(1800, money), E10:F('=C10-D10', money), F10:F('=IF(E10>=0,"Within","Over")', good), G10:C('London + Dubai'),
    A11:C('Visas & admin', bodyBorder), B11:C('Various'), C11:C(650, money), D11:C(650, money), E11:F('=C11-D11', money), F11:F('=IF(E11>=0,"Within","Over")', good), G11:C('UAE + Singapore'),
    A12:C('Contingency', bodyBorder), B12:C('Held'), C12:C(2000, money), D12:C(2000, money), E12:F('=C12-D12', money), F12:F('=IF(E12>=0,"Within","Over")', good), G12:C('10% buffer'),
    A14:C('TOTAL', labelTotal), B14:C('Approved cap $38,000', labelTotal), C14:F('=SUM(C2:C12)', totalStyle), D14:F('=SUM(D2:D12)', totalStyle), E14:F('=SUM(E2:E12)', totalStyle), F14:F('=IF(C14<=38000,"Within cap","Over cap")', labelTotal), G14:C('Board approval required if over', labelTotal),
    A16:C('Budget cap', subhead), B16:C(38000, { b:true, bg:'#eef5fc', color:'#0d4b7d', border:true, fmt:'currency' }),
    A17:C('Headroom', subhead), B17:F('=B16-C14', { b:true, bg:'#eef5fc', color:'#0d4b7d', border:true, fmt:'currency' }),
    A18:C('Flight share of total', subhead), B18:F('=SUM(C2:C5)/C14', { b:true, bg:'#eef5fc', color:'#0d4b7d', border:true, fmt:'percent' }),
    A19:C('Status', subhead), B19:F('=IF(B17>=0,"Ready to ticket","Reduce budget")', { b:true, bg:'#eef5fc', color:'#0d4b7d', border:true })
  };

  const actionCells = {
    A1:C('Action', header), B1:C('Owner', header), C1:C('Due', header), D1:C('Priority', header), E1:C('Status', header), F1:C('Meeting', header), G1:C('Source', header), H1:C('Follow-up', header),
    A2:C('Secure Clara’s written approval for Atlas language'), B2:C('Elizabeth'), C2:C('2026-11-10', dateFmt), D2:C('High', bad), E2:C('In progress', warn), F2:C('Board pack review'), G2:C('Nov 9 review'), H2:C('Ask for written email, not chat'),
    A3:C('Replace FY26 covenant page with FY27'), B3:C('Elizabeth'), C3:C('2026-11-10', dateFmt), D3:C('High', bad), E3:C('Not started', bad), F3:C('Board materials'), G3:C('Noah email'), H3:C('Confirm page number with Noah'),
    A4:C('Confirm board dinner count with Fiona'), B4:C('Elizabeth'), C4:C('2026-11-10', dateFmt), D4:C('High', bad), E4:C('In progress', warn), F4:C('Board dinner'), G4:C('Fiona email'), H4:C('Due noon Tue'),
    A5:C('Send final titles for place cards'), B5:C('Liam'), C5:C('2026-11-10', dateFmt), D5:C('Medium', warn), E5:C('Not started', bad), F5:C('Board dinner'), G5:C('Liam email'), H5:C('Copy Aisha'),
    A6:C('Add data residency statement to RFP Appendix C'), B6:C('Priya'), C6:C('2026-11-11', dateFmt), D6:C('High', bad), E6:C('Not started', bad), F6:C('Helio RFP'), G6:C('Mei email'), H6:C('Pass/fail requirement'),
    A7:C('Approve Ink & Grain print proofs'), B7:C('Elizabeth'), C7:C('2026-11-09', dateFmt), D7:C('High', bad), E7:C('In progress', warn), F7:C('Board pack'), G7:C('Victor email'), H7:C('Due 15:00 CT'),
    A8:C('Confirm 3-city ticketing before fare release'), B8:C('Elizabeth'), C8:C('2026-11-10', dateFmt), D8:C('High', bad), E8:C('Not started', bad), F8:C('Travel briefing'), G8:C('Omar email'), H8:C('Deadline 08:00 ET'),
    A9:C('Send Kite Mobility revised invite'), B9:C('Elizabeth'), C9:C('2026-11-09', dateFmt), D9:C('Medium', warn), E9:C('In progress', warn), F9:C('Pilot review'), G9:C('Ravi email'), H9:C('Friday 09:00'),
    A11:C('Open actions', subhead), B11:F('=COUNTA(A2:A9)-COUNTIF(E2:E9,"Done")', { b:true, bg:'#eef5fc', color:'#0d4b7d', border:true }),
    A12:C('High priority', subhead), B12:F('=COUNTIF(D2:D9,"High")', { b:true, bg:'#eef5fc', color:'#0d4b7d', border:true }),
    A13:C('Completed', subhead), B13:F('=COUNTIF(E2:E9,"Done")', { b:true, bg:'#eef5fc', color:'#0d4b7d', border:true })
  };

  const contactRows = [
    ['Alexandra Morgan','CEO','APPELLO','New York (ET)','alexandra.morgan@appello.com','+1 212 555 0144','Executive','Direct; 3 bullets max'],
    ['Isabel Rossi','CEO','Vela Retail Group','Milan (CET)','isabel.rossi@velaretail.example','+39 02 5555 0141','Client','Warm; relationship first'],
    ['James Whitfield','COO','Ardent Health','London (GMT)','james.whitfield@ardenthealth.example','+44 20 7946 0178','Client','Formal; agenda required'],
    ['Mei Lin','VP Procurement','Helio Energy','Singapore (SGT)','mei.lin@helioenergy.example','+65 6555 0193','Client','Direct; deadlines firm'],
    ['Ahmed Al-Rashid','Managing Director','Crescent Capital','Dubai (GST)','ahmed.alrashid@crescentcap.example','+971 4 555 0122','Client','Formal; warm greeting'],
    ['Dr. Elena Petrova','Board Chair','Corvus Foundation','Berlin (CET)','elena.petrova@corvusfoundation.example','+49 30 5555 0168','Client','Formal; printed materials'],
    ['Noah Williams','SVP Corporate Banking','Meridian Bank','New York (ET)','noah.williams@meridianbank.example','+1 212 555 0111','Client','Evidence first'],
    ['Gabriela Santos','Founder & CEO','Atlas Foods','São Paulo (BRT)','gabriela.santos@atlasfoods.example','+55 11 5555 0177','Client','Visual; quick replies'],
    ['Ravi Patel','Product Lead','Kite Mobility','Toronto (ET)','ravi.patel@kitemobility.example','+1 416 555 0185','Client','Collaborative'],
    ['Hannah Liu','Account Director','Evergreen AV','Los Angeles (PT)','hannah.liu@evergreenav.example','+1 213 555 0149','Vendor','Detail-oriented'],
    ['Omar Haddad','Sales Manager','Skyline Travel','Dubai (GST)','omar.haddad@skylinetravel.example','+971 4 555 0186','Vendor','Proactive; deadline-driven'],
    ['Fiona MacLeod','Events Lead','The Glasshouse','New York (ET)','fiona.macleod@glasshouse.example','+1 212 555 0138','Vendor','Polished; direct'],
    ['Victor Ramos','Print Manager','Ink & Grain','Mexico City (CST)','victor.ramos@inkandgrain.example','+52 55 5555 0128','Vendor','One consolidated approval'],
    ['Grace Okafor','Catering Director','Juniper & Sage','London (GMT)','grace.okafor@juniperandsage.example','+44 20 7946 0159','Vendor','Warm; counts early']
  ];
  const contactCells = {
    A1:C('Name', header), B1:C('Title', header), C1:C('Company', header), D1:C('Time zone', header), E1:C('Email', header), F1:C('Phone', header), G1:C('Type', header), H1:C('Communication style', header)
  };
  contactRows.forEach((row, i) => {
    const r = i + 2;
    row.forEach((val, j) => {
      contactCells[String.fromCharCode(65 + j) + r] = C(val, j === 0 ? { b:true, border:true } : { border:true });
    });
  });
  contactCells['A17'] = C('Total contacts', subhead); contactCells['B17'] = F('=COUNTA(A2:A15)', { b:true, bg:'#eef5fc', color:'#0d4b7d', border:true });
  contactCells['A18'] = C('Clients', subhead); contactCells['B18'] = F('=COUNTIF(G2:G15,"Client")', { b:true, bg:'#eef5fc', color:'#0d4b7d', border:true });
  contactCells['A19'] = C('Vendors', subhead); contactCells['B19'] = F('=COUNTIF(G2:G15,"Vendor")', { b:true, bg:'#eef5fc', color:'#0d4b7d', border:true });

  const boardAttendees = [
    ['Alexandra Morgan','APPELLO','CEO','Confirmed','—','Local','—','Chair'],
    ['Dr. Elena Petrova','Corvus Foundation','Board Chair','Confirmed','Vegetarian','Berlin','The Peninsula','Printed set required'],
    ['Noah Williams','Meridian Bank','SVP Corporate Banking','Confirmed','—','New York','The Peninsula','Lender perspective'],
    ['Isabel Rossi','Vela Retail Group','CEO','Confirmed','Shellfish allergy','Milan','The Peninsula','Dinner guest of CEO'],
    ['Daniel Kim','APPELLO','Chief of Staff','Confirmed','—','Local','—','Run-of-show owner'],
    ['Marcus Chen','APPELLO','CFO','Confirmed','—','San Francisco','—','Financial pack'],
    ['Liam O’Connor','APPELLO','Director, Board Relations','Confirmed','—','Dublin','—','Board secretary'],
    ['Clara Jensen','APPELLO','General Counsel','Confirmed','—','Copenhagen','—','Legal review'],
    ['Priya Raman','APPELLO','VP Operations','Confirmed','—','London','—','APAC + ops'],
    ['Takeshi Sato','APPELLO','Head of APAC','Hybrid','—','Tokyo','—','Dial-in'],
    ['Aisha Bello','APPELLO','Executive Producer, Events','Confirmed','—','Lagos','—','Dinner logistics']
  ];
  const boardCells = {
    A1:C('Name', header), B1:C('Organization', header), C1:C('Title', header), D1:C('Attendance', header), E1:C('Dietary', header), F1:C('Travel from', header), G1:C('Hotel', header), H1:C('Notes', header)
  };
  boardAttendees.forEach((row, i) => {
    const r = i + 2;
    row.forEach((val, j) => {
      let style = { border:true };
      if (j === 3) style = val === 'Confirmed' ? good : warn;
      boardCells[String.fromCharCode(65 + j) + r] = C(val, j === 0 ? Object.assign({}, style, { b:true }) : style);
    });
  });
  boardCells['A14'] = C('Total invited', subhead); boardCells['B14'] = F('=COUNTA(A2:A12)', { b:true, bg:'#eef5fc', color:'#0d4b7d', border:true });
  boardCells['A15'] = C('Confirmed', subhead); boardCells['B15'] = F('=COUNTIF(D2:D12,"Confirmed")', { b:true, bg:'#eef5fc', color:'#0d4b7d', border:true });
  boardCells['A16'] = C('Hybrid', subhead); boardCells['B16'] = F('=COUNTIF(D2:D12,"Hybrid")', { b:true, bg:'#eef5fc', color:'#0d4b7d', border:true });
  boardCells['A17'] = C('Dietary needs', subhead); boardCells['B17'] = F('=COUNTIF(E2:E12,"<>—")', { b:true, bg:'#eef5fc', color:'#0d4b7d', border:true });
  boardCells['A18'] = C('Printed sets required', subhead); boardCells['B18'] = C('2', { b:true, bg:'#eef5fc', color:'#0d4b7d', border:true });

  const WORKBOOKS = [
    {
      id:'wb-expenses', name:'Executive Expense Report', fileId:'file-expense', template:true,
      activeSheet:'Expenses',
      sheets:{
        Expenses: sheet('Expenses', expenseCells, {
          freeze:{ row:1, col:1 },
          conditionalFormats:[
            { range:'F2:F9', type:'lessThan', value:0, style:{ color:'#9a271b', bg:'#fdeceb' } },
            { range:'F2:F9', type:'greaterThanOrEqual', value:0, style:{ color:'#11663a', bg:'#e8f7ee' } }
          ],
          chart:{ type:'bar', range:'A1:E9', title:'Q4 budget vs actual', labelCol:'A', seriesCols:['D','E'] }
        })
      }
    },
    {
      id:'wb-travel', name:'Travel Itinerary & Budget', fileId:'file-travel-sheet', template:true,
      activeSheet:'Itinerary',
      sheets:{
        Itinerary: sheet('Itinerary', travelCells, {
          freeze:{ row:1, col:0 },
          conditionalFormats:[{ range:'H12:H13', type:'contains', value:'HOLD', style:{ color:'#7c4c00', bg:'#fff1cf' } }]
        }),
        Budget: sheet('Budget', travelBudgetCells, {
          freeze:{ row:1, col:1 },
          conditionalFormats:[{ range:'E2:E12', type:'lessThan', value:0, style:{ color:'#9a271b', bg:'#fdeceb' } }],
          chart:{ type:'bar', range:'A1:D12', title:'Three-city trip — estimate vs confirmed', labelCol:'A', seriesCols:['C','D'] }
        })
      }
    },
    {
      id:'wb-actions', name:'Meeting Action Tracker', fileId:'file-actions', template:true,
      activeSheet:'Actions',
      sheets:{
        Actions: sheet('Actions', actionCells, {
          freeze:{ row:1, col:1 },
          conditionalFormats:[
            { range:'E2:E9', type:'contains', value:'Not started', style:{ color:'#9a271b', bg:'#fdeceb' } },
            { range:'E2:E9', type:'contains', value:'In progress', style:{ color:'#7c4c00', bg:'#fff1cf' } },
            { range:'E2:E9', type:'contains', value:'Done', style:{ color:'#11663a', bg:'#e8f7ee' } }
          ],
          chart:{ type:'bar', range:'A1:E9', title:'Actions by status', labelCol:'A', seriesCols:['D'] }
        })
      }
    },
    {
      id:'wb-contacts', name:'Contact List & Vendor List', fileId:'file-contacts', template:true,
      activeSheet:'Contacts',
      sheets:{
        Contacts: sheet('Contacts', contactCells, {
          freeze:{ row:1, col:1 },
          colWidths:{ A:160, B:165, C:165, D:115, E:250, F:145, G:85, H:190 }
        })
      }
    },
    {
      id:'wb-board', name:'Board Meeting Agenda & Attendees', fileId:'file-board-sheet', template:true,
      activeSheet:'Attendees',
      sheets:{
        Attendees: sheet('Attendees', boardCells, {
          freeze:{ row:1, col:1 },
          colWidths:{ A:165, B:160, C:205, D:105, E:115, F:100, G:120, H:175 },
          conditionalFormats:[
            { range:'D2:D12', type:'contains', value:'Confirmed', style:{ color:'#11663a', bg:'#e8f7ee' } },
            { range:'D2:D12', type:'contains', value:'Hybrid', style:{ color:'#7c4c00', bg:'#fff1cf' } }
          ]
        }),
        Agenda: sheet('Agenda', {
          A1:C('Time', header), B1:C('Agenda item', header), C1:C('Owner', header), D1:C('Duration', header), E1:C('Materials', header),
          A2:C('08:00'), B2:C('Welcome and safety'), C2:C('Alexandra Morgan'), D2:C('5 min'), E2:C('None'),
          A3:C('08:05'), B3:C('CEO review of the quarter'), C3:C('Alexandra Morgan'), D3:C('20 min'), E3:C('CEO summary p.2'),
          A4:C('08:25'), B4:C('Financial performance and variance'), C4:C('Marcus Chen'), D4:C('20 min'), E4:C('Financial pack p.6'),
          A5:C('08:45'), B5:C('Operations and APAC capacity'), C5:C('Priya Raman'), D5:C('20 min'), E5:C('Ops summary p.2'),
          A6:C('09:05'), B6:C('Project Atlas — integration update'), C6:C('Daniel Kim'), D6:C('25 min'), E6:C('Atlas memo p.14'),
          A7:C('09:30'), B7:C('Governance and legal'), C7:C('Dr. Elena Petrova'), D7:C('25 min'), E7:C('Governance minutes'),
          A8:C('09:55'), B8:C('People and culture'), C8:C('Naomi Brooks'), D8:C('15 min'), E8:C('People update'),
          A9:C('10:10'), B9:C('Break'), C9:C('—'), D9:C('15 min'), E9:C('—'),
          A10:C('10:25'), B10:C('Lender perspective'), C10:C('Noah Williams'), D10:C('15 min'), E10:C('FY27 covenant schedule'),
          A11:C('10:40'), B11:C('Closed session'), C11:C('Board only'), D11:C('35 min'), E11:C('Board only'),
          A12:C('11:15'), B12:C('Resolutions and close'), C12:C('Alexandra Morgan'), D12:C('15 min'), E12:C('Resolution sheet'),
          A13:C('11:30'), B13:C('Press boundary'), C13:C('Sofia Alvarez'), D13:C('5 min'), E13:C('Approved messages only'),
          A15:C('Agenda owner', subhead), B15:C('Liam O’Connor'), D15:C('Updated', subhead), E15:C('Nov 9, 2026')
        }, { freeze:{ row:1, col:0 }, colWidths:{ A:95, B:300, C:170, D:90, E:200 } })
      }
    }
  ];

  /* ------------------------------- Files -------------------------------- */
  function docContent(title, subtitle, sections) {
    return `<h1>${title}</h1><p class="doc-subtitle">${subtitle}</p>` + sections.map(s => {
      if (typeof s === 'string') return `<p>${s}</p>`;
      return `<h2>${s.h}</h2>` + (s.paras || []).map(p => `<p>${p}</p>`).join('') +
        (s.bullets ? `<ul>${s.bullets.map(b => `<li>${b}</li>`).join('')}</ul>` : '');
    }).join('');
  }

  const FILES = [
    { id:'f-exec', parentId:null, name:'Executive Office', type:'folder', color:'#d9a53a', createdAt:'2026-01-04T09:00', updatedAt:'2026-11-09T08:10' },
    { id:'f-travel', parentId:null, name:'Travel & Events', type:'folder', color:'#3e8ddc', createdAt:'2026-01-04T09:01', updatedAt:'2026-11-09T11:20' },
    { id:'f-board', parentId:null, name:'Board Docs', type:'folder', color:'#8155d6', createdAt:'2026-01-04T09:02', updatedAt:'2026-11-09T15:20' },
    { id:'f-clients', parentId:null, name:'Client Files', type:'folder', color:'#28a06c', createdAt:'2026-01-04T09:03', updatedAt:'2026-11-08T15:45' },
    { id:'f-templates', parentId:null, name:'Templates', type:'folder', color:'#c77d55', createdAt:'2026-01-04T09:04', updatedAt:'2026-11-09T09:00' },
    { id:'f-shared', parentId:null, name:'Shared with Me', type:'folder', color:'#6f7f96', createdAt:'2026-01-04T09:05', updatedAt:'2026-11-09T12:00' },

    { id:'file-priorities', parentId:'f-exec', name:'CEO Weekly Priorities.docx', type:'doc', createdAt:'2026-11-08T17:30', updatedAt:'2026-11-09T09:32', content: docContent('CEO Weekly Priorities', 'Week of November 9, 2026 · Prepared by Elizabeth Hale', [
      { h:'This week’s three priorities', bullets:[
        '<strong>Board pack quality:</strong> finish the final review, secure legal approval, and deliver printed sets by Wednesday 17:00.',
        '<strong>Isabel Rossi:</strong> move Tuesday coffee to 15:00 without disturbing the budget review; confirm in writing.',
        '<strong>Three-city budget:</strong> approve ticketing before the Nov 10 fare release at 08:00 ET.'
      ]},
      { h:'Decisions needed from Alexandra', bullets:[
        'Approve the shortened Dubai agenda (Ahmed requested a 10:00 start).',
        'Confirm Friday Kite Mobility review at 09:00.',
        'Choose whether to take the reporter’s request after the board meeting.'
      ]},
      { h:'Hold list', bullets:[
        'Do not schedule over board debrief on Thursday 12:00–12:30.',
        'No non-urgent meetings before 08:00 or after 19:00.',
        'Keep Project Atlas announcement internal until December.'
      ]},
      'Last reviewed with Alexandra at the Monday desk review.'
    ])},
    { id:'file-bio', parentId:'f-exec', name:'Alexandra Morgan — Executive Profile.docx', type:'doc', createdAt:'2026-02-10T10:00', updatedAt:'2026-10-28T14:20', content: docContent('Alexandra Morgan', 'Chief Executive Officer · APPELLO', [
      { h:'Working style', bullets:[
        'Direct, decisive, and time-poor. Lead with the recommendation.',
        'Prefers three bullets over three paragraphs; detail belongs in an appendix.',
        'Protects 30 minutes after board meetings for a private debrief.'
      ]},
      { h:'Preferences', bullets:[
        'Coffee: oat latte, no sugar. Still water in meetings.',
        'No meetings before 08:00. Dinner reservations after 18:30 only.',
        'Uses a printed agenda in board meetings, even with a screen in the room.'
      ]},
      { h:'Travel', bullets:[
        'Window seat, aisle-side departure if available. Lounge access on international trips.',
        'Prefers one hotel per city over moving between properties.',
        'Needs a printed one-page schedule and the local emergency contact.'
      ]}
    ])},
    { id:'file-signature', parentId:'f-exec', name:'Executive Email Standards.docx', type:'doc', createdAt:'2026-03-04T11:00', updatedAt:'2026-11-09T13:16', content: docContent('Executive Email Standards', 'APPELLO · Executive Office', [
      { h:'Structure', bullets:[
        'Subject line states the decision or topic, not just “Quick question”.',
        'Open with a greeting; close with a clear next step and a date.',
        'Use Reply All only when every recipient needs to see the answer.',
        'Never send an email when you are angry. Draft it; revisit it.'
      ]},
      { h:'Confidentiality', bullets:[
        'Legal materials marked privileged stay inside the executive office.',
        'Do not forward a board pack outside the approved distribution list.',
        'When in doubt, ask Clara or Liam before sending.'
      ]},
      'Out-of-office should be set 24 hours before travel and name the person covering urgent matters.'
    ])},

    { id:'file-travel-sheet', parentId:'f-travel', name:'London Dubai Singapore — Itinerary.xlsx', type:'sheet', workbookId:'wb-travel', createdAt:'2026-11-07T14:20', updatedAt:'2026-11-09T11:25' },
    { id:'file-travel-policy', parentId:'f-travel', name:'Q4 Travel Policy.docx', type:'doc', createdAt:'2026-09-20T09:00', updatedAt:'2026-10-01T10:15', content: docContent('Q4 Travel Policy', 'APPELLO · Finance and Operations', [
      { h:'Approval', bullets:[
        'All international travel requires CEO approval and a cost-centre code.',
        'Business-class air travel is permitted for flights over six hours.',
        'Hotel nightly cap: New York $450; London $500; Dubai $400; Singapore $450.'
      ]},
      { h:'Booking', bullets:[
        'Use Skyline Travel for all multi-city itineraries.',
        'Hold fares for no more than 48 hours before ticketing.',
        'Keep all receipts and submit within 30 days of return.'
      ]},
      { h:'Duty of care', bullets:[
        'Share the itinerary with the executive office and security.',
        'Carry a printed emergency contact card.',
        'Do not book back-to-back client days without a recovery window.'
      ]}
    ])},
    { id:'file-itinerary-doc', parentId:'f-travel', name:'Three-City Briefing Memo.docx', type:'doc', createdAt:'2026-11-08T09:30', updatedAt:'2026-11-09T11:05', content: docContent('Three-City Briefing Memo', 'London · Dubai · Singapore · November 16–21, 2026', [
      { h:'Purpose', paragraphs:['Three client relationships, one close-out, and a relationship reset after a busy quarter. The schedule intentionally protects one recovery block in each city.'] },
      { h:'Key contacts', bullets:[
        '<strong>London:</strong> James Whitfield, COO, Ardent Health. Formal; requires an agenda and decision log.',
        '<strong>Dubai:</strong> Ahmed Al-Rashid, Managing Director, Crescent Capital. Relationship-first; allow ten minutes for coffee and dates.',
        '<strong>Singapore:</strong> Mei Lin, VP Procurement, Helio Energy. Direct and deadline-driven; no small talk.'
      ]},
      { h:'Open decisions', bullets:[
        'Approve fare release by Nov 10 at 08:00 ET.',
        'Confirm London client-day dietary counts by Nov 15.',
        'Decide whether Takeshi joins Singapore in person or remotely.'
      ]},
      'All times in the itinerary are local unless explicitly marked otherwise.'
    ])},
    { id:'file-nov20', parentId:'f-travel', name:'APPELLO @ 10 — Gala Run of Show.docx', type:'doc', createdAt:'2026-11-09T10:40', updatedAt:'2026-11-09T12:20', content: docContent('APPELLO @ 10 — Gala Run of Show', 'Friday, November 20, 2026 · The Glasshouse · v9', [
      { h:'Guest experience', bullets:[
        '18:30 — Reception and welcome drinks',
        '19:15 — Seating; welcome from Daniel Kim',
        '20:15 — Alexandra’s remarks (7 minutes, no slides)',
        '20:30 — Dinner service; table 1 dietary flagged',
        '22:00 — Dessert and anniversary film',
        '23:00 — Close and transport'
      ]},
      { h:'Speaker note', paragraphs:['Alexandra’s remarks use the two approved messages from Sofia. No additional messages, no Q&A from the stage, and no reporter interviews without Sofia’s written approval.'] },
      { h:'Seating', paragraphs:['Use seating chart v4 only. Alexandra, Isabel Rossi, and Dr. Elena Petrova are at table 1. Isabel is Alexandra’s guest, not at the Vela company table.'] }
    ])},

    { id:'file-board-agenda', parentId:'f-board', name:'Q3 Board Agenda — Final.docx', type:'doc', createdAt:'2026-11-08T16:10', updatedAt:'2026-11-09T10:20', content: docContent('Q3 Board Meeting — Agenda', 'Thursday, November 12, 2026 · 08:00–12:00 ET · Boardroom A', [
      { h:'Meeting purpose', paragraphs:['Review Q3 performance, approve the FY27 operating plan, and receive the Project Atlas integration update. Materials are frozen at 17:00 ET on November 11.'] },
      { h:'Agenda', bullets:[
        '08:00 — Welcome and safety · Alexandra Morgan',
        '08:05 — CEO review of the quarter · Alexandra Morgan',
        '08:25 — Financial performance and variance · Marcus Chen',
        '08:45 — Operations and APAC capacity · Priya Raman',
        '09:05 — Project Atlas integration update · Daniel Kim',
        '09:30 — Governance and legal · Dr. Elena Petrova',
        '09:55 — People and culture · Naomi Brooks',
        '10:10 — Break',
        '10:25 — Lender perspective · Noah Williams',
        '10:40 — Closed session · Board only',
        '11:15 — Resolutions and close',
        '11:30 — Press boundary · Sofia Alvarez'
      ]},
      { h:'Attendees', paragraphs:['11 confirmed; Takeshi Sato joins as hybrid. Dr. Petrova requires a printed set. Mr. Williams requires final financial materials 48 hours in advance.'] },
      { h:'Materials', bullets:[
        'Board run-of-show v6',
        'Financial pack with the one-line travel variance story',
        'FY27 covenant schedule (corrected)',
        'Project Atlas memo with approved legal language'
      ]}
    ])},
    { id:'file-board-sheet', parentId:'f-board', name:'Board Attendee Tracker.xlsx', type:'sheet', workbookId:'wb-board', createdAt:'2026-11-06T15:00', updatedAt:'2026-11-09T08:30' },
    { id:'file-board-notes', parentId:'f-board', name:'Board Pack Assembly Checklist.docx', type:'doc', createdAt:'2026-11-09T08:50', updatedAt:'2026-11-09T15:42', content: docContent('Board Pack Assembly Checklist', 'Thursday, November 12 · Materials freeze Wednesday 17:00 ET', [
      { h:'Before distribution', bullets:[
        'Clara Jensen written approval — page 14 Atlas language. <strong>PENDING</strong>',
        'Marcus Chen variance one-line story — final wording. <strong>PENDING</strong>',
        'Noah Williams FY27 covenant page replacement. <strong>PENDING</strong>',
        'Liam O’Connor final attendee titles. <strong>DUE TUE 12:00</strong>',
        'Ink & Grain proof approval. <strong>DUE TODAY 15:00 CT</strong>'
      ]},
      { h:'Print run', bullets:[
        '14 sets, color, tabbed, board folders.',
        'Two separate printed sets for Dr. Petrova and Noah Williams.',
        'Delivery to 12th floor reception by Wednesday 17:00.',
        'Reference PO NSM-4471 on the vendor invoice.'
      ]},
      { h:'Hybrid', paragraphs:['Takeshi Sato joins from Tokyo. Confirm the dial-in and the backup laptop. Do not share board materials in the Teamspace chat; the secure link goes by email only.'] }
    ])},
    { id:'file-gov-minutes', parentId:'f-board', name:'Governance Committee Minutes — Oct.docx', type:'doc', createdAt:'2026-11-01T10:00', updatedAt:'2026-11-01T10:00', content: docContent('Governance Committee Minutes', 'October 2026 · Approved', [
      { h:'Attendance', paragraphs:['Dr. Elena Petrova (Chair), Alexandra Morgan, Noah Williams, Liam O’Connor, Clara Jensen.'] },
      { h:'Decisions', bullets:[
        'Approved the October board minutes without changes.',
        'Recommended that the FY27 covenant schedule replace the FY26 version in all board materials.',
        'Requested a written legal opinion on the Atlas disclosure language before the November board meeting.'
      ]},
      { h:'Next meeting', paragraphs:['The next governance committee meeting will be held in January 2027.'] }
    ])},

    { id:'file-ardent', parentId:'f-clients', name:'Ardent Health — QBR Pre-read.docx', type:'doc', createdAt:'2026-11-08T13:00', updatedAt:'2026-11-09T09:24', content: docContent('Ardent Health — QBR Pre-read', 'London · November 17, 2026', [
      { h:'Relationship summary', paragraphs:['Ardent Health is a strategic health infrastructure client. The partnership is strong, but the data migration workstream is behind schedule and requires a named owner.'] },
      { h:'Decisions needed', bullets:[
        'Confirm the data migration owner from APPELLO.',
        'Agree the revised go-live date: February 9 or February 23.',
        'Approve the joint communications plan for the client’s clinical teams.'
      ]},
      { h:'Open risks', bullets:[
        'James Whitfield has not yet received the October decision log.',
        'The client’s security team requires a second review of the data residency architecture.',
        'The London client day catering needs final dietary counts by November 15.'
      ]}
    ])},
    { id:'file-atlas-memo', parentId:'f-clients', name:'Project Atlas — Legal Memo.docx', type:'doc', createdAt:'2026-11-07T16:20', updatedAt:'2026-11-09T08:56', content: docContent('Project Atlas — Legal Memo', 'PRIVILEGED AND CONFIDENTIAL · Prepared by Clara Jensen', [
      { h:'Issue', paragraphs:['The board pack currently describes the Atlas integration as “complete”. That statement overstates the status and creates disclosure risk.'] },
      { h:'Recommended language', paragraphs:['“The Atlas integration is on track, with two workstreams remaining in validation.”'] },
      { h:'Distribution', paragraphs:['Do not forward outside the executive office. The approved language must be included before the board pack is distributed. Written confirmation will follow by Tuesday 17:00 ET.'] }
    ])},
    { id:'file-kite', parentId:'f-clients', name:'Kite Mobility — Pilot Metrics.docx', type:'doc', createdAt:'2026-11-04T14:10', updatedAt:'2026-11-08T16:00', content: docContent('Kite Mobility — Pilot Metrics', 'Pre-read for the pilot review', [
      { h:'Pilot results to date', bullets:[
        '12,400 trips initiated across the six-week pilot.',
        '94.2% journey completion rate, against a target of 90%.',
        'Average wait time: 4.1 minutes in Toronto, 6.3 minutes in Hamilton.',
        'Support contacts reduced by 18% after the in-app guidance update.'
      ]},
      { h:'Discussion', paragraphs:['Ravi Patel would like to discuss a second-city expansion and the pricing model for winter. He has asked to avoid Thursday, November 12 because of a board commitment.'] }
    ])},

    { id:'file-memo-template', parentId:'f-templates', name:'Memo Template.docx', type:'doc', createdAt:'2026-01-10T09:00', updatedAt:'2026-01-10T09:00', content: docContent('MEMORANDUM', 'TO: [Recipient] · FROM: [Name] · DATE: [Date] · RE: [Subject]', [
      { h:'Purpose', paragraphs:['State the purpose of the memo in one or two sentences.'] },
      { h:'Background', paragraphs:['Provide only the context the reader needs to make a decision.'] },
      { h:'Recommendation', paragraphs:['Lead with the recommended action. Then provide the rationale and any risks.'] },
      { h:'Next steps', bullets:['[Owner] will [action] by [date].','[Decision maker] will confirm [decision] by [date].'] }
    ])},
    { id:'file-meeting-template', parentId:'f-templates', name:'Meeting Notes Template.docx', type:'doc', createdAt:'2026-01-10T09:01', updatedAt:'2026-01-10T09:01', content: docContent('Meeting Notes', 'Meeting: [Name] · Date: [Date] · Attendees: [Names]', [
      { h:'Decisions', bullets:['[Decision] — [owner]'] },
      { h:'Actions', bullets:['[Action] — [owner] — due [date]'] },
      { h:'Open questions', bullets:['[Question] — [owner]'] },
      { h:'Follow-up', paragraphs:['Send a follow-up email within 24 hours, summarize decisions in the first paragraph, and list actions with owners and dates.'] }
    ])},
    { id:'file-agenda-template', parentId:'f-templates', name:'Agenda Template.docx', type:'doc', createdAt:'2026-01-10T09:02', updatedAt:'2026-01-10T09:02', content: docContent('Meeting Agenda', 'Meeting: [Name] · Date: [Date] · Location: [Room / Teamspace]', [
      { h:'Purpose and desired outcome', paragraphs:['By the end of this meeting, we will have decided [decision].'] },
      { h:'Attendees', bullets:['[Name] — [role]','[Name] — [role]'] },
      { h:'Agenda items', bullets:['[Time] — [Item] — [Owner] — [Outcome]','[Time] — [Item] — [Owner] — [Outcome]'] },
      { h:'Pre-read', paragraphs:['Attach materials at least 48 hours in advance. Note the decision required for each item.'] }
    ])},
    { id:'file-expense', parentId:'f-templates', name:'Executive Expense Report.xlsx', type:'sheet', workbookId:'wb-expenses', createdAt:'2026-10-01T09:00', updatedAt:'2026-11-09T13:30' },
    { id:'file-actions', parentId:'f-shared', name:'Meeting Action Tracker.xlsx', type:'sheet', workbookId:'wb-actions', createdAt:'2026-11-08T17:40', updatedAt:'2026-11-09T14:05' },
    { id:'file-contacts', parentId:'f-shared', name:'Contact & Vendor List.xlsx', type:'sheet', workbookId:'wb-contacts', createdAt:'2026-10-12T10:00', updatedAt:'2026-11-09T09:12' },
    { id:'file-esc', parentId:'f-exec', name:'EA Handover — Daily Rhythm.docx', type:'doc', createdAt:'2026-05-02T09:00', updatedAt:'2026-10-30T16:30', content: docContent('EA Handover — Daily Rhythm', 'How the executive office runs', [
      { h:'Daily rhythm', bullets:[
        '07:15 — Scan overnight inbox; flag anything requiring Alexandra before 08:00.',
        '07:45 — Prepare the one-page daily brief: three decisions, three FYIs, one risk.',
        '09:30 — Desk review with Alexandra (unless she is travelling).',
        '16:30 — Set tomorrow’s priorities and confirm calendar.',
        '18:00 — Final inbox pass; schedule any follow-ups.'
      ]},
      { h:'Calendar standards', bullets:[
        'Every external meeting has an agenda, a dial-in, and a named owner.',
        'Never double-book Alexandra. Resolve conflicts before the day begins.',
        'Protect 30 minutes after board meetings and client days.',
        'Confirm room capacity and video requirements before booking.'
      ]},
      { h:'Communication standards', bullets:[
        'Acknowledge urgent requests within 15 minutes, even if only to say when you will respond.',
        'Use email for decisions and chat for coordination. Summarize chat decisions in email.',
        'Never forward privileged material. Check the recipient list twice.'
      ]}
    ])}
  ];

  /* ------------------------------- tasks ------------------------------- */
  const TODOS = [
    { id:'t1', title:'Secure Clara’s written approval for the Atlas language', due:'2026-11-09', priority:'high', category:'Board', myDay:true, completed:false, reminder:true, notes:'Do not distribute board pack before written approval. Ask for email, not chat.' },
    { id:'t2', title:'Confirm Tuesday 3:00 PM coffee with Isabel', due:'2026-11-09', priority:'high', category:'Client', myDay:true, completed:false, reminder:true, notes:'Alexandra requested the move. Protect the budget review. Confirm in writing.' },
    { id:'t3', title:'Approve Ink & Grain print proofs', due:'2026-11-09', priority:'high', category:'Board', myDay:true, completed:false, reminder:false, notes:'Consolidated changes due 15:00 Mexico City time. 14 sets, tabbed.' },
    { id:'t4', title:'Replace FY26 covenant page with FY27', due:'2026-11-10', priority:'high', category:'Board', myDay:false, completed:false, reminder:true, notes:'Noah needs one page number, not two versions.' },
    { id:'t5', title:'Confirm board dinner count with Fiona', due:'2026-11-10', priority:'medium', category:'Event', myDay:false, completed:false, reminder:true, notes:'Guaranteed count due noon Tuesday. Shellfish allergy table 2.' },
    { id:'t6', title:'Approve 3-city ticketing before 08:00 ET', due:'2026-11-10', priority:'high', category:'Travel', myDay:false, completed:false, reminder:true, notes:'Fare releases at 17:00 GST. Could increase by $1,800.' },
    { id:'t7', title:'Send Kite Mobility revised invite for Friday 09:00', due:'2026-11-09', priority:'medium', category:'Client', myDay:false, completed:false, reminder:false, notes:'45 minutes, Teamspace link, pilot metrics pre-read.' },
    { id:'t8', title:'Order place cards with correct titles', due:'2026-11-10', priority:'medium', category:'Board', myDay:false, completed:false, reminder:false, notes:'Dr. Elena Petrova, Mr. Noah Williams, Ms. Isabel Rossi.' }
  ];

  const NOTES = [
    { id:'n1', title:'Board pack — open items', linkedEvent:'evt-board-pack-review', tags:['Board','Urgent'], pinned:true, updatedAt:'2026-11-09T09:12',
      content:'Open items for Thursday:\n• Clara written approval on page 14 Atlas language\n• Marcus one-line travel variance story\n• Noah FY27 covenant page replacement\n• Liam final titles by Tuesday noon\n• Ink & Grain proofs by 15:00 CT\n\nDecision: distribution waits for Clara. Printed sets: 14.' },
    { id:'n2', title:'Isabel coffee — context', linkedEvent:'evt-isabel-coffee', tags:['Client','Atlas'], pinned:false, updatedAt:'2026-11-09T13:06',
      content:'Isabel moved to 3:00 PM Tuesday. Lobby Café, not a conference room. Oat milk available. She is allergic to shellfish. Ask about her flight before discussing Atlas. Keep it warm, not transactional.' },
    { id:'n3', title:'Leadership stand-up — decisions', linkedEvent:'evt-standup', tags:['Leadership'], pinned:false, updatedAt:'2026-11-09T09:03',
      content:'Decisions from leadership stand-up:\n1. Keep Atlas announcement internal until December.\n2. Hold gala guest list at 120.\n3. Protect Singapore relationship; approve travel budget within cap.\n\nRisks: board legal language, APAC capacity assumptions, vendor invoice timing.' }
  ];

  const NOTIFICATIONS = [
    { id:'notif1', app:'mail', type:'work', title:'Alexandra Morgan', body:'Board pack: final pass before Thursday — flagged as high priority.', at:'2026-11-09T07:42', read:false },
    { id:'notif2', app:'calendar', type:'work', title:'Calendar conflict detected', body:'You have 5 overlapping meetings on Tuesday, Nov 10. Tap to review.', at:'2026-11-09T08:01', read:false },
    { id:'notif3', app:'training', type:'training', title:'EA Academy', body:'Your Monday practice plan is ready. Start with “Send a professional email.”', at:'2026-11-09T07:15', read:false },
    { id:'notif4', app:'teams', type:'work', title:'Daniel Kim', body:'“If Isabel needs a move tomorrow, protect the budget review.”', at:'2026-11-09T13:08', read:true }
  ];

  const GLOSSARY = [
    ['Action item', 'A specific task with one owner and a due date, usually created during a meeting.'],
    ['Archive', 'Moving an email out of the inbox without deleting it, so it can still be found later.'],
    ['Attendee', 'A person invited to a meeting or event. Required attendees should block their calendar.'],
    ['BCC', 'Blind carbon copy. Recipients in BCC can see the email but other recipients cannot see their address.'],
    ['Brief', 'A short summary of what is needed, who asked, and by when. A good brief leads with the decision.'],
    ['CC', 'Carbon copy. Used to keep someone informed without asking them to act.'],
    ['Conditional formatting', 'A spreadsheet rule that changes a cell’s color automatically when its value meets a condition.'],
    ['Conflict', 'Two events that overlap on the same calendar. An EA resolves the conflict before confirming either meeting.'],
    ['Custom folder', 'A folder you create to group emails in a way that matches your workflow.'],
    ['Distribution list', 'A named group of email recipients. Check membership before using Reply All.'],
    ['Draft', 'An unsent email saved for later. Drafts are not delivered until you press Send.'],
    ['Etiquette', 'The professional norms of a workplace: clear subject lines, greetings, appropriate recipients, and timely replies.'],
    ['Executive', 'A senior leader, such as a CEO, CFO, or COO. The learner’s executive is Alexandra Morgan, CEO.'],
    ['Fill handle', 'The small square at the bottom-right of a selected spreadsheet cell. Drag it to copy a pattern or formula.'],
    ['Flag', 'A marker that tells you to return to an email later. Flagging is not the same as marking unread.'],
    ['Freeze panes', 'Locks rows or columns in place so headers stay visible while you scroll through a spreadsheet.'],
    ['Formula', 'An instruction in a spreadsheet that calculates a result, beginning with “=”. Example: =SUM(D2:D9).'],
    ['Formula bar', 'The input line near the top of a spreadsheet that shows and edits the contents of the selected cell.'],
    ['Greeting', 'The opening line of an email, such as “Hi Daniel,” or “Dear Dr. Petrova,”. It makes the message professional.'],
    ['Hybrid meeting', 'A meeting with some people in a room and some joining remotely.'],
    ['Inbox triage', 'Quickly sorting incoming email into action, delegate, archive, or delete so nothing important is missed.'],
    ['Local time', 'The time where a person actually is. Dubai is 9 hours ahead of New York during November.'],
    ['Mention', 'Typing @ followed by a name in Teamspace to get someone’s attention. Use mentions deliberately, not constantly.'],
    ['Milestone', 'A significant checkpoint in a project.'],
    ['Name box', 'The small box left of the formula bar showing the current cell address, such as D11.'],
    ['OOO', 'Out of office. An automatic reply that tells people you are away and who is covering.'],
    ['Pinned message', 'A Teamspace message saved to the top of a chat or channel so important information stays visible.'],
    ['Presence', 'A Teamspace status such as Available, Busy, In a Meeting, Away, or Do Not Disturb.'],
    ['Priority', 'How urgent a task or email is. High priority should mean a real deadline or risk, not simply “new”.'],
    ['Recurring meeting', 'A meeting that repeats on a schedule, such as every Monday at 08:30.'],
    ['Reply All', 'Responds to the sender and everyone in the To and CC fields. Use it only when everyone needs the answer.'],
    ['Room booking', 'Reserving a physical meeting room, usually with capacity, video, and catering details.'],
    ['Rule', 'An automatic email instruction, such as “move messages from this vendor into the Invoices folder.”'],
    ['Snooze', 'Hiding an email until a later time, when it returns to your inbox.'],
    ['Spreadsheet range', 'A rectangular group of cells, written like D2:D9. Ranges let a formula work on many cells at once.'],
    ['Thread', 'A chain of replies under one message. In Teamspace, threads keep side conversations out of the main channel.'],
    ['Time zone', 'A region’s standard clock setting. Scheduling across zones requires converting all times to a shared reference.'],
    ['Triage', 'The act of sorting and prioritizing incoming work.'],
    ['VLOOKUP', 'A spreadsheet function that searches for a value in the first column of a range and returns a value from another column.'],
    ['XLOOKUP', 'A more flexible spreadsheet lookup that can search left or right and provide a not-found message.'],
    ['Workspace', 'The set of tools, files, and channels you use for a job. This training desktop is a simulated workspace.']
  ];

  const SHORTCUTS = [
    ['Open Start menu', ['Ctrl', 'Esc']],
    ['Switch windows (hold Alt)', ['Alt', 'Tab']],
    ['Reverse window switch', ['Alt', 'Shift', 'Tab']],
    ['Search everything', ['Ctrl', 'K']],
    ['Open Mail', ['Ctrl', '1']],
    ['Open Teamspace', ['Ctrl', '2']],
    ['Open Sheets', ['Ctrl', '3']],
    ['Open Training Hub', ['Ctrl', '4']],
    ['Close active window', ['Alt', 'F4']],
    ['Maximize / restore window', ['Alt', 'Enter']],
    ['Window system menu (Move / Size)', ['Alt', 'Space']],
    ['Snap window left / right / maximize', ['Ctrl', 'Alt', '← / → / ↑']],
    ['Open Task View', ['Ctrl', 'Alt', 'Tab']],
    ['Open APPELLO Assist', ['Ctrl', 'Shift', 'A']],
    ['Open Chromium game shell', ['Ctrl', 'Shift', 'B']],
    ['Show desktop', ['Ctrl', 'Alt', 'D']],
    ['Open this shortcut list', ['F1']],
    ['Open glossary', ['Ctrl', 'Shift', 'G']],
    ['Reset training data (confirm)', ['Ctrl', 'Alt', 'R']],
    ['Spreadsheet: edit cell', ['F2']],
    ['Spreadsheet: undo / redo', ['Ctrl', 'Z / Ctrl', 'Y']],
    ['Spreadsheet: copy / paste', ['Ctrl', 'C / Ctrl', 'V']],
    ['Spreadsheet: move selection', ['Arrow keys']],
    ['Compose: send', ['Ctrl', 'Enter']],
    ['Close dialog or flyout', ['Esc']]
  ];

  const APP_CATALOG = [
    { id:'training', name:'Training Hub', icon:'training', pinned:true, desktop:true, defaultWidth:1080, defaultHeight:760 },
    { id:'mail', name:'Mail', icon:'mail', pinned:true, desktop:true, defaultWidth:1380, defaultHeight:830 },
    { id:'teams', name:'Teamspace', icon:'teams', pinned:true, desktop:true, defaultWidth:1340, defaultHeight:820 },
    { id:'calendar', name:'Calendar', icon:'calendar', pinned:true, desktop:true, defaultWidth:1320, defaultHeight:820 },
    { id:'drive', name:'Cloud Drive', icon:'onedrive', pinned:true, desktop:true, defaultWidth:1200, defaultHeight:760 },
    { id:'sheets', name:'Sheets', icon:'sheets', pinned:true, desktop:true, defaultWidth:1280, defaultHeight:800 },
    { id:'files', name:'Files', icon:'files', pinned:true, desktop:true, defaultWidth:1120, defaultHeight:720 },
    { id:'docs', name:'Docs', icon:'docs', pinned:true, desktop:true, defaultWidth:1080, defaultHeight:740 },
    { id:'todo', name:'Tasks', icon:'todo', pinned:true, desktop:true, defaultWidth:1080, defaultHeight:700 },
    { id:'assistant', name:'Assist', icon:'assistant', pinned:true, desktop:true, defaultWidth:520, defaultHeight:720 },
    { id:'browser', name:'Chromium', icon:'browser', pinned:true, desktop:false, defaultWidth:1180, defaultHeight:780 },
    { id:'notes', name:'Notes', icon:'notes', pinned:true, desktop:false, defaultWidth:930, defaultHeight:650 },
    { id:'calculator', name:'Calculator', icon:'calculator', pinned:true, desktop:false, defaultWidth:390, defaultHeight:550 },
    { id:'clock', name:'Clock', icon:'clock', pinned:true, desktop:true, defaultWidth:860, defaultHeight:620 },
    { id:'settings', name:'Settings', icon:'settingsApp', pinned:true, desktop:true, defaultWidth:980, defaultHeight:700, taskbar:true },
    { id:'recycle', name:'Recycle Bin', icon:'recycle', pinned:false, desktop:true, defaultWidth:860, defaultHeight:560 }
  ];

  const DESKTOP_ICONS = [
    { app:'doom', label:'DOOM.EXE', icon:'doom', external:'https://dos.zone/doom-dec-1993/', executable:true },
    { app:'cyberpunk', label:'CYBERPUNK.EXE', icon:'cyberpunk', external:'https://cyberpunk2077.lol/', executable:true },
    { app:'browser', label:'Chromium' },
    { app:'mail', label:'Mail' },
    { app:'teams', label:'Teamspace' },
    { app:'calendar', label:'Calendar' },
    { app:'drive', label:'Cloud Drive' },
    { app:'sheets', label:'Sheets' },
    { app:'training', label:'Training Hub' },
    { app:'files', label:'Files' },
    { app:'docs', label:'Docs' },
    { app:'todo', label:'Tasks' },
    { app:'notes', label:'Notes' },
    { app:'assistant', label:'Assist' },
    { app:'clock', label:'World Clock' },
    { app:'calculator', label:'Calculator' },
    { app:'settings', label:'Settings' },
    { app:'recycle', label:'Recycle Bin' }
  ];

  const RECENT_FILES = ['file-board-agenda', 'file-travel-sheet', 'file-actions', 'file-priorities', 'file-expense'];

  /* ----------------------------- seed factory ---------------------------- */
  function createSeed() {
    const deep = obj => JSON.parse(JSON.stringify(obj));
    return {
      version: 1,
      signedIn: false,
      signedInAt: null,
      lastSavedAt: null,
      profile: deep(ME),
      company: deep(COMPANY),
      settings: {
        focusAssist: false,
        presence: 'Available',
        signature,
        signatureShort: 'Best,\nElizabeth Hale\nExecutive Assistant to Alexandra Morgan',
        outOfOffice: {
          enabled: false,
          start: '2026-11-16',
          end: '2026-11-21',
          message: 'Thank you for your message. I am travelling with Alexandra Morgan through November 21 and will have limited access to email. For urgent executive office matters, please contact Daniel Kim, Chief of Staff, at daniel.kim@appello.com. Best regards, Elizabeth Hale'
        },
        workingHours: { start: '08:00', end: '18:00', tz: 'America/New_York' },
        notifications: true,
        sound: false
      },
      contacts: deep(CONTACTS),
      rooms: deep(ROOMS),
      calendar: { events: deep(CALENDAR_EVENTS), view: 'week', focusDate: '2026-11-09', displayTz: 'America/New_York' },
      mail: {
        emails: deep(ALL_EMAILS),
        customFolders: [
          { id:'vendor-invoices', name:'Vendor invoices', color:'#8155d6', rule:{ field:'from', contains:'invoice', moveTo:'vendor-invoices' } }
        ],
        selectedId: 'm01',
        filter: 'all',
        sort: 'newest',
        search: '',
        viewMode: 'inbox',
        signature,
        rules: [{ id:'rule1', name:'Vendor invoices', fromContains:'invoice', moveTo:'vendor-invoices', enabled:true }]
      },
      files: deep(FILES),
      workbooks: deep(WORKBOOKS),
      activeWorkbookId: 'wb-expenses',
      docs: { selectedFileId: 'file-priorities', openTabs: ['file-priorities','file-board-agenda'] },
      teams: {
        presence:'Available',
        selectedSection:'chat',
        selectedChatId:'chat-alexandra',
        selectedTeamId:'exec-office',
        selectedChannelId:'exec-announcements',
        chats: deep(CHATS),
        teams: deep(TEAM_SPACES),
        channelPosts: deep(CHANNEL_POSTS),
        calls: [
          { id:'call-out-1', caller:'isabel', direction:'incoming', at:'2026-11-09T09:06', status:'answered', duration:'02:14', note:'' },
          { id:'call-out-2', caller:'omar', direction:'incoming', at:'2026-11-08T16:40', status:'message', duration:'00:42', note:'Requested ticketing approval callback before 08:00 ET tomorrow.' },
          { id:'call-out-3', caller:'daniel', direction:'outgoing', at:'2026-11-08T17:02', status:'answered', duration:'05:31', note:'' }
        ],
        incomingCalls: deep(INCOMING_CALLS)
      },
      todos: deep(TODOS),
      notes: deep(NOTES),
      notifications: deep(NOTIFICATIONS),
      recentFiles: deep(RECENT_FILES),
      training: {
        xp: 0,
        completionCount: 0,
        progress: {},
        badges: [],
        skills: {},
        actionLog: [],
        sessions: [],
        streak: 0
      },
      ui: {
        notificationsRead: false,
        desktopIconOrder: DESKTOP_ICONS.map(i => i.app),
        openWindows: ['training'],
        hasBooted: false,
        windowRects: {},
        wallpaper: 'aurora',
        filesView: 'grid',
        worldClocks: ['America/New_York','Europe/London','Asia/Dubai','Asia/Singapore','Asia/Tokyo']
      }
    };
  }

  window.Data = {
    seed: createSeed,
    contact, contactById: CONTACT_BY_ID, contacts: CONTACTS,
    personAddress, addressByEmail, sender,
    emails: ALL_EMAILS,
    rooms: ROOMS,
    timezones: TIMEZONES,
    calendarEvents: CALENDAR_EVENTS,
    workbooks: WORKBOOKS,
    files: FILES,
    todos: TODOS,
    notes: NOTES,
    glossary: GLOSSARY,
    shortcuts: SHORTCUTS,
    appCatalog: APP_CATALOG,
    desktopIcons: DESKTOP_ICONS,
    emailGroups: EMAIL_GROUPS,
    chats: CHATS,
    teamSpaces: TEAM_SPACES,
    channelPosts: CHANNEL_POSTS,
    incomingCalls: INCOMING_CALLS,
    signature: signature,
    me: ME,
    company: COMPANY
  };
})();
