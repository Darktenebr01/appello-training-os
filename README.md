# APPELLO — Executive Assistant Training OS

A single-page, Windows 11-inspired training workstation for a complete beginner learning the
Executive Administrative Assistant role. It is a fictional simulation for **Elizabeth Hale**, EA to
CEO **Alexandra Morgan** at **APPELLO**.

> **APPELLO training workspace.** All company names, people, messages, meetings, and files are fictional practice data.

## Run it locally

The app is plain HTML, CSS, and JavaScript with no build step.

### Easiest path — double-click the launcher

Double-click **`Open Training OS.cmd`** in this folder. It opens `index.html` directly in your
default browser, so you never land on a Python directory listing.

If your browser blocks `localStorage` for local files, use the server launcher instead:

Double-click **`Start Training Server.cmd`**. It starts a static server in *this exact folder* and
opens <http://localhost:8090/> automatically. Leave the small command window open while you practise.

### Manual server (optional)

```bash
cd /d D:\REA\executive-os
python -m http.server 8090
```

Then open <http://localhost:8090/>. Do not run the server from your user folder — that is what causes
the “Directory listing for /” page.

There is nothing to install. The training station is designed for a desktop
browser (Chrome or Edge) at 1366×768 or larger.

## Publish it on GitHub Pages

This is a static site, so GitHub Pages can host it permanently. The included
workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml) deploys
the site automatically whenever `main` is updated.

1. Create a **public** GitHub repository.
2. Upload the contents of this folder to the repository root. Keep `index.html`
   at the root.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment → Source**, choose **GitHub Actions**.
5. Commit to `main` (or run the workflow manually from the **Actions** tab).
6. After the action finishes, the site is available at:

```text
https://YOUR-GITHUB-USERNAME.github.io/YOUR-REPOSITORY-NAME/
```

For example, a repository named `appello-training-os` under the account
`yourname` becomes `https://yourname.github.io/appello-training-os/`.

If the repository is named `YOUR-GITHUB-USERNAME.github.io`, the site is at the
root URL instead. Keep the repository public on the free GitHub plan.

The workflow stages only the web app (`index.html`, `assets`, `css`, `js`,
`.nojekyll`), so the `.cmd` launchers and repository metadata are not published.
Share the resulting Pages link with your friend; they do not need this folder
or a local server.

Progress is saved per browser and per site address. Work done from the local
file version is separate from work done on the GitHub Pages version.

## What opens first

The desktop loads with the **Training Hub** window open. Start with
**“Clock In & Open Your Desk”** in Learn mode. The coach highlights the next control and explains
**why** each step matters. The banner at the top is always visible, and **Reset training data** is
always one click away.

## Included applications

| App | What it trains |
| --- | --- |
| **Training Hub** | 21 scenarios across 3 levels; Learn, Practice, and timed Test modes; progress, XP, skills, badges, and a results review. |
| **Mail** | A dark Mail-style workspace with app rail, folder pane, message list, reading pane and ribbon: folders, 40+ seeded emails, reading/replying/forwarding, CC/BCC, **local file attachments**, search, filters, flags, snooze, custom folders, rules, scheduled send with catch-up on reopen, signatures, out-of-office, etiquette checks, Contacts, and the full calendar. |
| **Teamspace** | A dark Teamspace-style chat workspace: activity, chats, groups, teams/channels, messages, mentions, reactions, threads, pins, file sharing, scripted teammates, calls with transfer/take-message, meeting room with mute/camera/hand/share/chat/notes, presence, and shared Calendar. |
| **Calendar** | A standalone dark week/day/month calendar with a ribbon toolbar, time-zone conversion, room schedule, conflicts, RSVP states, external invitees, and `.ics` invitations. |
| **Cloud Drive** | A cloud-drive-style dark file hub: For you cards, Recent/Shared/My files views, search, quick access, people/meetings/media browse, storage indicator, previews, and direct file opening. |
| **Sheets** | A dark spreadsheet grid (edit, selection, copy/paste, undo/redo, fill handle), a broad formula subset (including SUMIFS/COUNTIFS/INDEX/MATCH/EDATE/NETWORKDAYS/PMT), formatting, borders, currency/date formats, freeze/filter/sort, conditional formatting, bar and pie charts, multiple sheets, five pre-filled workbooks, **real `.xlsx` import and export**, formula explainers. |
| **Docs** | A dark document processor with ribbon tabs, rich text, headings/lists/tables, save/autosave, comments on selected text, version history with restore, document creation, folders, and download-to-HTML. |
| **Files / Recycle Bin** | A dark Windows Explorer-style workspace: tab strip, back/forward/up navigation, address bar, command bar, copy/cut/paste, rename/delete/restore, sort, grid/list views, recent and shared files, and permanent purge. |
| **Assist** | A lightweight local assistant for summaries, daily plans, drafts, file search, tasks, app navigation, and training progress. It is built into this training workspace and works from the practice data in this browser. |
| **Chromium** | A locked two-destination game shell with only DOOM and Cyberpunk tabs, a read-only address bar, and no search or free navigation. Run opens Cyberpunk in an in-tab game window; DOOM's publisher blocks embedding, so it opens in its permitted separate window. |
| **Desktop game shortcuts** | Two executable-style shortcuts, `DOOM.EXE` and `CYBERPUNK.EXE`, using the supplied artwork. Each launches only its one allowed page. |
| **Settings** | Windows-style System, Personalization, Apps, Accounts, Time & Language, Accessibility, Privacy & security, Windows Update, and About panels. Changes are local to the training desktop. |
| **Tasks** | My Day, priorities, due dates, reminders, categories, notes, completion and reopen. |
| **Notes** | Notes, tags, pinning, search, linked meeting/calendar notes, and autosave. |
| **Calculator** | Keyboard calculator with history. |
| **Clock** | Live simulated world clock, analog clock, city cards, and a meeting planner with working-hours checks. |

The desktop follows the familiar Windows 11 layout with a dark Office-inspired finish: centered
48 px dark taskbar with weather, Start, search, Task View, pinned apps, Quick Settings,
clock/calendar flyout, notification bell and show-desktop strip; a dark acrylic Start menu with
pinned apps, all apps, search and account footer; Quick Settings tiles and sliders; Widgets; Task
View with window cards and desktops; power menu; lock and shut-down screens; snap layouts on the
maximize button; dark app title bars; and Windows-style tooltips, context menus and notification
cards. Windows can be moved and resized with the pointer, or from the keyboard via Alt+Space and
Ctrl+Alt+arrow keys.

Start search covers apps, files, contacts, mail and training scenarios. The shell also includes
Alt+Tab, focus/z-order, wallpaper themes, simulated sign-in, and global tooltips.

## The 21 training scenarios

**Level 1 — Basics**
1. Clock In & Open Your Desk
2. Read the CEO’s Brief
3. Send a Professional Email
4. Reply Like a Pro in Teamspace
5. Open & Save a Spreadsheet
6. Create a Calendar Event

**Level 2 — Daily EA work**
7. Inbox Triage Sprint
8. Schedule Across Three Time Zones
9. Book a Room
10. Resolve a Calendar Conflict
11. Take a Professional Message
12. Build a Task List
13. Follow Up from Notes

**Level 3 — Advanced EA work**
14. The Five-Conflict Executive Day
15. Three-City Trip & Budget
16. Assemble the Board Pack
17. The Urgent VIP Request
18. Audit the Expense Report
19. Fix the Board Attendee Tracker
20. From Meeting Notes to Action Tracker
21. CEO Inbox Zero

Every scenario has a realistic brief, automatic success criteria, three hint levels, instant
professional-standard feedback on mistakes, and a score/time/results review. Learn mode adds a
highlighted target and a “why it matters” coach for every step. Test mode hides hints and runs a
timer.

## Where your work is saved

State is saved in `localStorage` under:

```text
appello-ea-academy-v1
```

Use **Reset training data** in the top banner or the Start menu to erase every practice change and
return the whole simulated company to its starting state. Reset also reloads the page and reopens
the Training Hub. This is intentionally the only destructive action in the simulation.

## Project structure

```text
index.html                 Page shell: banner, desktop, Start menu, taskbar, panes, coach root
css/styles.css             Design system, desktop shell, windows, menus, toasts, modals
css/apps.css               Application-specific layout and components
css/training.css           Training Hub, scenario cards, coach, task dock, results
css/windows11.css          Windows 11 fidelity layer: taskbar, Start, flyouts, Settings,
                           ribbons, Explorer chrome, file previews
css/m365.css               Dark Office-style workspace layer for Mail/Teamspace/Sheets/Docs/
                           Files/Tasks/Calendar/Cloud Drive/Assist and the dark shell
assets/bloom.svg           Original abstract desktop wallpaper artwork
assets/doom.png            DOOM executable shortcut artwork
assets/cyberpunk.png       Cyberpunk executable shortcut artwork
js/icons.js                Original SVG app icons and avatars
js/data.js                 All seeded practice company data and `createSeed()`
js/utils.js                Helpers, dates/time zones, Bus, toasts, modals, tooltips, App registry
js/store.js                localStorage, state helpers, action log, reset
js/calendar-view.js        Shared Mail/Teamspace calendar, RSVP, external guests, .ics
js/sheet-engine.js         Formula lexer/parser/evaluator, formatting, conditional rules
js/xlsx.js                 Dependency-free .xlsx ZIP/XML reader and writer
js/apps/files.js           Files and Recycle Bin
js/apps/mail.js            Mail, compose, rules, settings, Contacts, Calendar host
js/apps/teams.js           Teamspace chats, channels, calls, meetings, files, calendar host
js/apps/sheets.js          Spreadsheet UI and charts
js/apps/docs.js            document-style editor
js/apps/todo.js            Task manager
js/apps/notes.js           Meeting and personal notes
js/apps/calendar.js        Standalone calendar wrapper
js/apps/drive.js           Cloud Drive / file hub
js/apps/assistant.js       APPELLO Assist local assistant
js/apps/browser.js         Locked Chromium game shell (DOOM + Cyberpunk only)
js/apps/tools.js           Calculator and Clock
js/apps/settings.js        Windows-style Settings app
js/os.js                   Desktop shell, windows, Start, search, notifications, reset
js/training.js             Training Hub, modes, checks, hints, scoring, progress, resume
js/main.js                 Boot sequence
Open Training OS.cmd       Double-click launcher (direct file launch)
Start Training Server.cmd  Local server launcher on port 8090
```

Scripts are loaded in dependency order with `defer`: icons → data → utils → store →
calendar → sheet engine → xlsx → apps → training → OS → main.

## Adding a training scenario

Open `js/training.js` and add one object to the `scenarios` array. The app reads this array for the
Hub, search, progress, and mode launchers — apps are discovered from one catalog.

```js
{
  id:'my-new-scenario',
  level:2,
  title:'Confirm a Vendor Meeting',
  app:'mail',
  minutes:9,
  testMinutes:9,
  xp:100,
  skills:['calendar','email'],       // keys from SKILLS
  icon:'📅',
  summary:'A one-line description for the Hub.',
  brief:{
    from:'Omar Haddad, Skyline Travel',
    ask:'Confirm the meeting and tell me where to be.',
    due:'Today at 14:00.'
  },
  // Optional: make a repeatable starting condition.
  setup() {
    Store.update(s => {
      // add or reset example data here
    });
  },
  // Learn mode. `target` is a CSS selector; the coach highlights the first visible match.
  // A step advances when `check()` returns true. Add `advanceOn:'next'` for a read-only step.
  learn:[
    {
      title:'Open the calendar',
      why:'This explains WHY the step matters to an executive assistant.',
      target:'[data-desktop-app="mail"], [data-taskbar-app="mail"]',
      check:() => OS.isOpen('mail')
    },
    {
      title:'Confirm the meeting',
      why:'A confirmation is not complete until it is on the calendar.',
      target:'[data-cal-new]',
      check:() => allDone(session)
    }
  ],
  // Automatic success criteria used by all three modes.
  criteria:[
    {
      id:'created',
      label:'Create a conflict-free meeting.',
      check:() => createdEvents(session).some(ev => eventConflictFree(ev))
    }
  ],
  // Three levels: nudge, detailed hint, full solution.
  hints:['Start in Mail.', 'Open Calendar and check the day.', 'Step-by-step exact solution.'],
  next:'The title of the scenario you recommend next.'
}
```

Useful check helpers already defined in `training.js` include `logs(session, type)`,
`createdEvents(session)`, `sentSince(session)`, `editedCells(session, workbookId, sheetName)`,
`cellRaw(...)`, `sheetValue(...)`, `eventConflictFree(event)`, `eventAttendeeTimezones(event)`,
`readIdsSince(session)`, `triageActionsSince(session)`, and `allDone(session)`.

Business actions emit Bus events (for example `mail:sent`, `calendar:event-created`,
`sheet:cell-edited`, `teams:message-sent`, `todo:created`, `doc:saved`). The Store also appends
whitelisted action details to `state.training.actionLog`, which is how criteria distinguish work
done **during** a scenario from seeded data.

If the scenario needs a new app, register it with `App.register('myapp', {...})` and add its icon
to `Icons` and its seed data to `Data`. Apps receive `mount(container, win)` and may expose a
`beforeClose()` hook.


## Quick test checklist

Use this checklist to verify a fresh copy in Chrome or Edge:

1. **Mail** — reply to the CEO’s board-pack email; the reply appears in **Sent**.
2. **Calendar → Teamspace** — create a Teamspace meeting from Mail’s Calendar; open Teamspace → Calendar and see
   the same event. Open the event and accept it, then download the `.ics` invitation.
3. **Sheets** — change an expense actual; the SUM total recalculates and the bar chart redraws; Save
   updates the file. Export downloads a real `.xlsx`, and Import reopens it.
4. **Docs** — select text, add a comment, then click Save and open Version history.
5. **Learn mode** — complete “Clock In & Open Your Desk” with the coach; the result is 100 and the
   first badge is earned. Refresh mid-session to confirm the coach resumes where you left off.
6. **Office workspaces** — open Mail, Teamspace, Calendar, Tasks, Files, and Cloud Drive; confirm the dark
   layouts, ribbon/toolbar controls, and file navigation behave as expected.
7. **Assist** — click **✦ Assist** in the top banner, ask “Summarize my inbox,” then “Plan my day.”
   The answers should use the seeded mailbox and calendar and stay inside the browser.
8. **Chromium games** — open Chromium from the taskbar or Start; check that only DOOM and Cyberpunk
   tabs exist, the address bar is read-only, and Run opens Cyberpunk inline while DOOM opens its permitted window. Double-click the
   `DOOM.EXE` and `CYBERPUNK.EXE` desktop shortcuts to confirm each opens only its allowed page.
9. **Windows shell** — open Start → All apps, Quick Settings, Widgets, Task View, Settings, and the
   power menu; snap a window from the maximize-button flyout.
10. **Reset** — Reset training data, confirm, and the workspace reloads with the Training Hub open and
   zero progress.

Open the browser console if you want to inspect the current seed state:

```js
Store.state
```

Stop the optional static server when you are finished.
