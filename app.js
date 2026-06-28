/* ============================================================
   COMMONPLACE — a single-file second brain
   No build step. No external JS deps. localStorage + optional
   Google Apps Script sync. Open index.html and go.
   ============================================================ */

/* ---------- storage ---------- */
const STORE_KEY = 'commonplace_v1';

const DEFAULTS = {
  theme: 'light',
  scriptUrl: '',
  lastSynced: null,
  reviewDue: 'Friday',
  lastReviewISO: null,
  areas: [
    { id: id(), name: 'Health & Fitness', desc: 'Workout regimes, nutrition, sleep habits', url: '', label: '' },
    { id: id(), name: 'Finance', desc: 'Budgeting, investing, savings targets', url: '', label: '' },
    { id: id(), name: 'Craft & Career', desc: 'Skills, leadership, professional growth', url: '', label: '' },
    { id: id(), name: 'Language Learning', desc: 'Vocabulary, daily practice, grammar', url: '', label: '' },
  ],
  inbox: [
    { id: id(), text: 'Read Ray Dalio book to extract life principles', tag: 'Reading', time: '10:15 AM' },
    { id: id(), text: 'Launch a podcast about self-education', tag: 'Idea', time: '09:40 AM' },
  ],
  projects: [
    {
      id: id(), name: 'Build My Second Brain', goal: 'A fully integrated PARA workflow.',
      deadline: '', status: 'active', docUrl: '',
      tasks: [
        { id: id(), text: 'Set up Inbox capture', done: true },
        { id: id(), text: 'Wire up Principles tracker', done: false },
      ],
    },
  ],
  resources: [
    { id: id(), topic: 'PARA Method Overview', summary: 'Projects, Areas, Resources, Archive — the organizing system this app follows.', source: '', tags: 'productivity, organization' },
  ],
  archive: [],
  ideas: [
    { id: id(), text: 'A one-click capture extension for browser tabs', cat: 'Creative', date: todayISO(), status: 'raw', docUrl: '' },
  ],
  readings: [
    { id: id(), title: 'Atomic Habits', type: 'Book', status: 'reading', takeaway: 'Systems beat motivation. Small 1% changes compound.', docUrl: '' },
  ],
  principles: [
    {
      id: id(), text: 'Pain + Reflection = Progress', cat: 'Life', stars: 5,
      story: 'Failed a key exam from cramming. Reflected on study habits, rebuilt a routine, did far better next term.',
      applied: 3, date: todayISO(), docUrl: '',
    },
    {
      id: id(), text: 'Be radically open and radically transparent', cat: 'Work', stars: 4,
      story: 'Raised a budget shortfall candidly instead of hiding it. The team fixed it twice as fast.',
      applied: 1, date: todayISO(), docUrl: '',
    },
  ],
  docs: {
    ideas: { url: '', name: 'Ideas — Living Doc' },
    reading: { url: '', name: 'Reading Notes — Living Doc' },
    principles: { url: '', name: 'Principles — Living Doc' },
  },
};

function id(){ return Math.random().toString(36).slice(2,10) + Date.now().toString(36).slice(-4); }
function todayISO(){ return new Date().toISOString().split('T')[0]; }

function loadState(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(!raw) return structuredClone(DEFAULTS);
    const parsed = JSON.parse(raw);
    // shallow-merge so new fields introduced later don't break old saves
    return Object.assign(structuredClone(DEFAULTS), parsed);
  }catch(e){
    console.warn('Could not read saved data, starting fresh.', e);
    return structuredClone(DEFAULTS);
  }
}
function saveState(){
  try{
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  }catch(e){
    toast('Could not save locally — your browser storage may be full.', 'error');
  }
}

let state = loadState();

/* ---------- tiny render helpers ---------- */
function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function fmtDate(iso){
  if(!iso) return '—';
  const d = new Date(iso);
  if(isNaN(d)) return iso;
  return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}
function toast(msg, kind){
  const host = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  if(kind === 'error'){ el.style.background = '#8B3A2F'; el.style.color = '#FAF7F0'; }
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

/* ---------- routing (simple hash-free state) ---------- */
let route = { tab: 'inbox' };

const TABS = [
  { key:'inbox', label:'Inbox', glyph:'&#9679;' },
  { key:'projects', label:'Projects', glyph:'&#9670;' },
  { key:'areas', label:'Areas', glyph:'&#9678;' },
  { key:'resources', label:'Resources', glyph:'&#9733;' },
  { key:'archive', label:'Archive', glyph:'&#9636;' },
  { key:'ideas', label:'Ideas', glyph:'&#9889;' },
  { key:'reading', label:'Reading', glyph:'&#9776;' },
  { key:'principles', label:'Principles', glyph:'&#9998;' },
  { key:'review', label:'Review', glyph:'&#8635;' },
  { key:'search', label:'Search', glyph:'&#128269;' },
  { key:'settings', label:'Settings', glyph:'&#9881;' },
];

function go(tab){
  route.tab = tab;
  document.querySelectorAll('.rail').forEach(r => r.classList.remove('open'));
  render();
  window.scrollTo({top:0});
}
window.go = go;

/* ============================================================
   SHELL
   ============================================================ */
function render(){
  const app = document.getElementById('app');
  document.documentElement.setAttribute('data-theme', state.theme);

  app.innerHTML = `
    <div class="app">
      <aside class="rail" id="rail">
        <div class="brand">
          <div class="mark">C</div>
          <h1>Commonplace</h1>
          <div class="sub">${todayLong()}</div>
        </div>
        <nav class="tabs">
          ${TABS.map(t => `
            <button class="tab ${route.tab===t.key?'active':''}" onclick="go('${t.key}')">
              <span class="glyph">${t.glyph}</span>
              <span>${t.label}</span>
              ${tabCount(t.key)}
            </button>
          `).join('')}
        </nav>
        <div class="rail-footer">
          <button class="icon-btn" onclick="toggleTheme()" title="Toggle theme">${state.theme==='dark'?'&#9728;':'&#9790;'}</button>
          <div class="sync-pill">
            <span class="dot ${syncDotClass()}"></span>
            <span>${syncLabel()}</span>
          </div>
        </div>
      </aside>

      <div class="topbar">
        <div class="mark">C</div>
        <h2>${TABS.find(t=>t.key===route.tab)?.label || ''}</h2>
        <button class="hamburger" onclick="document.getElementById('rail').classList.toggle('open')">&#9776;</button>
      </div>

      <main class="main fade-in">
        ${renderView()}
      </main>
    </div>
  `;
  wireUpView();
}

function todayLong(){
  return new Date().toLocaleDateString('en-US', { weekday:'long', day:'numeric', month:'long' });
}
function tabCount(key){
  const map = {
    inbox: state.inbox.length,
    projects: state.projects.length,
    resources: state.resources.length,
    archive: state.archive.length,
    ideas: state.ideas.length,
    reading: state.readings.length,
    principles: state.principles.length,
  };
  if(map[key] === undefined) return '';
  if(map[key] === 0) return '';
  return `<span class="count">${map[key]}</span>`;
}
function syncDotClass(){
  if(!state.scriptUrl) return 'off';
  return 'sage';
}
function syncLabel(){
  if(!state.scriptUrl) return 'Local only';
  return state.lastSynced ? `Synced ${state.lastSynced}` : 'Connected';
}
function toggleTheme(){
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  saveState();
  render();
}
window.toggleTheme = toggleTheme;

function renderView(){
  switch(route.tab){
    case 'inbox': return viewInbox();
    case 'projects': return viewProjects();
    case 'areas': return viewAreas();
    case 'resources': return viewResources();
    case 'archive': return viewArchive();
    case 'ideas': return viewIdeas();
    case 'reading': return viewReading();
    case 'principles': return viewPrinciples();
    case 'review': return viewReview();
    case 'search': return viewSearch();
    case 'settings': return viewSettings();
    default: return '';
  }
}
function wireUpView(){
  if(route.tab === 'search') wireSearch();
}

/* ============================================================
   INBOX
   ============================================================ */
function principleOfDay(){
  if(state.principles.length === 0) return null;
  const dayIndex = Math.floor(Date.now() / 86400000) % state.principles.length;
  return state.principles[dayIndex];
}

function viewInbox(){
  const potd = principleOfDay();
  return `
    ${potd ? `
      <div class="potd-card">
        <div class="potd-label">Principle of the Day</div>
        <p class="potd-text">&ldquo;${esc(potd.text)}&rdquo;</p>
        ${potd.story ? `<div class="potd-story">${esc(potd.story)}</div>` : ''}
        <div class="potd-foot">
          <span class="pill terracotta">${esc(potd.cat)}</span>
          <button class="btn sm" onclick="applyPrinciple('${potd.id}')">Mark applied &middot; ${potd.applied}&times;</button>
        </div>
      </div>
    ` : `
      <div class="empty section-gap">
        <span class="glyph">&#9998;</span>
        <strong>No principles written yet</strong>
        <p>Write your first one in the <a href="#" onclick="go('principles');return false;" style="color:var(--terracotta);font-weight:600;">Principles</a> tab to see it here.</p>
      </div>
    `}

    <div class="page-head">
      <div class="eyebrow">Capture</div>
      <h2>What's on your mind?</h2>
      <p>Drop anything here — a task, an idea, a reading note. Sort it later.</p>
    </div>

    <div class="card capture-box">
      <textarea class="field" id="captureText" placeholder="Type a thought, a task, a link to read later..."></textarea>
      <div class="capture-controls">
        <select class="field" id="captureTag" style="width:auto;">
          <option value="Idea">Idea</option>
          <option value="Task">Task</option>
          <option value="Resource">Resource</option>
          <option value="Reading">Reading</option>
          <option value="Note">Note</option>
        </select>
        <button class="btn primary" onclick="captureItem()">Capture</button>
      </div>
    </div>

    <div class="row" style="justify-content:space-between;margin-bottom:14px;">
      <h3 style="margin:0;font-size:15px;">Unsorted &middot; ${state.inbox.length}</h3>
    </div>

    ${state.inbox.length === 0 ? `
      <div class="empty">
        <span class="glyph">&#10003;</span>
        <strong>Inbox is clear</strong>
        <p>Everything has been sorted into your system.</p>
      </div>
    ` : state.inbox.map(item => `
      <div class="inbox-item">
        <div class="body">
          <div class="text">${esc(item.text)}</div>
          <div class="meta">${esc(item.tag)} &middot; ${esc(item.time)}</div>
        </div>
        <select class="sort-select" onchange="sortInboxItem('${item.id}', this.value)">
          <option value="">Sort to&hellip;</option>
          <option value="projects">Projects</option>
          <option value="ideas">Ideas</option>
          <option value="resources">Resources</option>
          <option value="readings">Reading</option>
          <option value="archive">Archive</option>
        </select>
        <button class="btn ghost icon-only" onclick="removeInboxItem('${item.id}')" title="Discard">&times;</button>
      </div>
    `).join('')}
  `;
}

function captureItem(){
  const text = document.getElementById('captureText').value.trim();
  if(!text) return;
  const tag = document.getElementById('captureTag').value;
  state.inbox.unshift({
    id: id(), text, tag,
    time: new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }),
  });
  saveState();
  toast(`Captured as ${tag}`);
  render();
}
window.captureItem = captureItem;

function removeInboxItem(itemId){
  state.inbox = state.inbox.filter(i => i.id !== itemId);
  saveState();
  render();
}
window.removeInboxItem = removeInboxItem;

function sortInboxItem(itemId, dest){
  if(!dest) return;
  const item = state.inbox.find(i => i.id === itemId);
  if(!item) return;

  if(dest === 'projects'){
    state.projects.unshift({ id: id(), name: item.text, goal: '', deadline: '', status: 'active', docUrl: '', tasks: [] });
  } else if(dest === 'ideas'){
    state.ideas.unshift({ id: id(), text: item.text, cat: 'General', date: todayISO(), status: 'raw', docUrl: '' });
  } else if(dest === 'resources'){
    state.resources.unshift({ id: id(), topic: item.text, summary: '', source: '', tags: '' });
  } else if(dest === 'readings'){
    state.readings.unshift({ id: id(), title: item.text, type: 'Article', status: 'reading', takeaway: '', docUrl: '' });
  } else if(dest === 'archive'){
    state.archive.unshift({ id: id(), item: item.text, date: todayISO(), loc: '' });
  }
  state.inbox = state.inbox.filter(i => i.id !== itemId);
  saveState();
  toast(`Sorted into ${dest}`);
  render();
}
window.sortInboxItem = sortInboxItem;

/* ============================================================
   PROJECTS
   ============================================================ */
function viewProjects(){
  return `
    <div class="page-head">
      <div class="eyebrow">PARA &middot; Projects</div>
      <h2>Active commitments</h2>
      <p>Short-term efforts with a defined finish line.</p>
    </div>

    <div class="card section-gap">
      <div class="grid-2">
        <input class="field" id="newProjName" placeholder="Project name&hellip;">
        <input class="field" id="newProjDeadline" type="date">
      </div>
      <div class="row" style="margin-top:10px;">
        <input class="field grow" id="newProjGoal" placeholder="One-line goal (optional)&hellip;">
        <button class="btn primary" onclick="addProject()">Add</button>
      </div>
    </div>

    ${state.projects.length === 0 ? `
      <div class="empty">
        <span class="glyph">&#9670;</span>
        <strong>No active projects</strong>
        <p>Add one above, or sort something in from your Inbox.</p>
      </div>
    ` : state.projects.map(p => {
      const total = p.tasks.length;
      const done = p.tasks.filter(t=>t.done).length;
      const pct = total ? Math.round(done/total*100) : 0;
      return `
      <div class="card section-gap">
        <div class="row" style="justify-content:space-between;align-items:flex-start;">
          <div class="grow">
            <input class="field" style="font-weight:600;font-size:15px;border:none;background:none;padding:0;margin-bottom:4px;" value="${esc(p.name)}" onchange="updateProject('${p.id}','name',this.value)">
            <input class="field" style="border:none;background:none;padding:0;color:var(--ink-soft);font-size:12.5px;" value="${esc(p.goal)}" placeholder="Add a goal&hellip;" onchange="updateProject('${p.id}','goal',this.value)">
          </div>
          <div class="row" style="flex-shrink:0;">
            <select class="sort-select" onchange="updateProject('${p.id}','status',this.value)">
              <option value="active" ${p.status==='active'?'selected':''}>Active</option>
              <option value="stuck" ${p.status==='stuck'?'selected':''}>Stuck</option>
              <option value="done" ${p.status==='done'?'selected':''}>Done</option>
              <option value="notstarted" ${p.status==='notstarted'?'selected':''}>Not started</option>
            </select>
            <button class="btn ghost icon-only" onclick="removeProject('${p.id}')">&times;</button>
          </div>
        </div>

        <div class="row" style="margin:14px 0 4px;gap:12px;">
          <span class="mono" style="font-size:11px;color:var(--ink-faint);">${done}/${total} tasks</span>
          <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
          <input class="field" type="date" style="width:140px;font-size:11.5px;" value="${esc(p.deadline)}" onchange="updateProject('${p.id}','deadline',this.value)">
        </div>

        ${p.tasks.map(t => `
          <div class="task-line">
            <input type="checkbox" class="chk" ${t.done?'checked':''} onchange="toggleTask('${p.id}','${t.id}')">
            <span class="${t.done?'':''}" style="flex:1;${t.done?'text-decoration:line-through;color:var(--ink-faint);':''}">${esc(t.text)}</span>
            <button class="btn ghost icon-only sm" onclick="removeTask('${p.id}','${t.id}')">&times;</button>
          </div>
        `).join('')}

        <div class="row" style="margin-top:10px;">
          <input class="field grow" placeholder="Add a task&hellip;" id="taskInput_${p.id}" onkeydown="if(event.key==='Enter')addTask('${p.id}')">
          <button class="btn sm" onclick="addTask('${p.id}')">+ Task</button>
        </div>

        <div class="divider"></div>
        <div class="row" style="justify-content:space-between;">
          ${p.docUrl ? `<a href="${esc(p.docUrl)}" target="_blank" class="pill terracotta">&#128196; Open doc</a>` : `<span class="mono" style="font-size:11px;color:var(--ink-faint);">No linked document</span>`}
          <button class="btn sm ghost" onclick="editDocLink('project','${p.id}')">Link doc</button>
        </div>
      </div>
    `;}).join('')}
  `;
}

function addProject(){
  const name = document.getElementById('newProjName').value.trim();
  if(!name) return;
  const goal = document.getElementById('newProjGoal').value.trim();
  const deadline = document.getElementById('newProjDeadline').value;
  state.projects.unshift({ id: id(), name, goal, deadline, status: 'active', docUrl: '', tasks: [] });
  saveState();
  toast('Project added');
  render();
}
window.addProject = addProject;
function updateProject(pid, field, value){
  const p = state.projects.find(x=>x.id===pid);
  if(p){ p[field] = value; saveState(); }
}
window.updateProject = updateProject;
function removeProject(pid){
  state.projects = state.projects.filter(p=>p.id!==pid);
  saveState(); render();
}
window.removeProject = removeProject;
function addTask(pid){
  const input = document.getElementById('taskInput_'+pid);
  const text = input.value.trim();
  if(!text) return;
  const p = state.projects.find(x=>x.id===pid);
  p.tasks.push({ id: id(), text, done:false });
  saveState(); render();
}
window.addTask = addTask;
function toggleTask(pid, tid){
  const p = state.projects.find(x=>x.id===pid);
  const t = p.tasks.find(x=>x.id===tid);
  t.done = !t.done;
  saveState(); render();
}
window.toggleTask = toggleTask;
function removeTask(pid, tid){
  const p = state.projects.find(x=>x.id===pid);
  p.tasks = p.tasks.filter(t=>t.id!==tid);
  saveState(); render();
}
window.removeTask = removeTask;

function editDocLink(kind, itemId){
  const url = prompt('Paste a Google Doc (or any) URL to link:');
  if(url === null) return;
  if(kind === 'project'){
    const p = state.projects.find(x=>x.id===itemId);
    if(p) p.docUrl = url.trim();
  } else if(kind === 'idea'){
    const it = state.ideas.find(x=>x.id===itemId);
    if(it) it.docUrl = url.trim();
  } else if(kind === 'reading'){
    const it = state.readings.find(x=>x.id===itemId);
    if(it) it.docUrl = url.trim();
  } else if(kind === 'principle'){
    const it = state.principles.find(x=>x.id===itemId);
    if(it) it.docUrl = url.trim();
  }
  saveState();
  toast('Link saved');
  render();
}
window.editDocLink = editDocLink;

/* ============================================================
   AREAS
   ============================================================ */
function viewAreas(){
  return `
    <div class="page-head">
      <div class="eyebrow">PARA &middot; Areas</div>
      <h2>Standards to maintain</h2>
      <p>Ongoing responsibilities with no finish line — kept in balance, not completed.</p>
    </div>
    <div class="card">
      ${state.areas.map(a => `
        <div class="list-row">
          <div class="main-col">
            <input class="field" style="border:none;background:none;padding:0;font-weight:600;font-size:14px;margin-bottom:3px;" value="${esc(a.name)}" onchange="updateArea('${a.id}','name',this.value)">
            <input class="field" style="border:none;background:none;padding:0;font-size:12.5px;color:var(--ink-soft);" value="${esc(a.desc)}" placeholder="Describe this area&hellip;" onchange="updateArea('${a.id}','desc',this.value)">
          </div>
          <div class="side">
            ${a.url ? `<a href="${esc(a.url)}" target="_blank" class="pill terracotta">${esc(a.label || 'Open')}</a>` : ''}
            <button class="btn sm ghost" onclick="editAreaLink('${a.id}')">${a.url ? 'Edit' : '+ Link'}</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
function updateArea(aid, field, value){
  const a = state.areas.find(x=>x.id===aid);
  if(a){ a[field] = value; saveState(); }
}
window.updateArea = updateArea;
function editAreaLink(aid){
  const a = state.areas.find(x=>x.id===aid);
  const url = prompt('Document or folder URL:', a.url || '');
  if(url === null) return;
  const label = prompt('Short label for this link:', a.label || 'Open doc');
  a.url = url.trim();
  a.label = (label || 'Open doc').trim();
  saveState(); render();
}
window.editAreaLink = editAreaLink;

/* ============================================================
   RESOURCES
   ============================================================ */
function viewResources(){
  return `
    <div class="page-head">
      <div class="eyebrow">PARA &middot; Resources</div>
      <h2>Reference library</h2>
      <p>Articles, tutorials, and clippings you'll want again.</p>
    </div>

    <div class="card section-gap">
      <div class="grid-2">
        <input class="field" id="resTopic" placeholder="Topic&hellip;">
        <input class="field" id="resTags" placeholder="Tags (comma separated)&hellip;">
      </div>
      <div class="row" style="margin-top:10px;">
        <input class="field grow" id="resSummary" placeholder="One-line summary&hellip;">
        <input class="field" style="width:200px;" id="resSource" placeholder="Source URL&hellip;">
        <button class="btn primary" onclick="addResource()">Add</button>
      </div>
    </div>

    ${state.resources.length === 0 ? `
      <div class="empty"><span class="glyph">&#9733;</span><strong>No resources yet</strong><p>Save your first reference above.</p></div>
    ` : state.resources.map(r => `
      <div class="list-row">
        <div class="main-col">
          <div class="title">${esc(r.topic)}</div>
          <div class="desc">${esc(r.summary)}</div>
          ${r.tags ? `<div style="margin-top:6px;">${r.tags.split(',').map(t=>`<span class="pill" style="margin-right:5px;">${esc(t.trim())}</span>`).join('')}</div>` : ''}
        </div>
        <div class="side">
          ${r.source ? `<a href="${esc(r.source.startsWith('http')?r.source:'https://'+r.source)}" target="_blank" class="pill terracotta">Source</a>` : ''}
          <button class="btn ghost icon-only" onclick="removeResource('${r.id}')">&times;</button>
        </div>
      </div>
    `).join('')}
  `;
}
function addResource(){
  const topic = document.getElementById('resTopic').value.trim();
  if(!topic) return;
  state.resources.unshift({
    id: id(), topic,
    summary: document.getElementById('resSummary').value.trim(),
    source: document.getElementById('resSource').value.trim(),
    tags: document.getElementById('resTags').value.trim(),
  });
  saveState(); toast('Resource saved'); render();
}
window.addResource = addResource;
function removeResource(rid){
  state.resources = state.resources.filter(r=>r.id!==rid);
  saveState(); render();
}
window.removeResource = removeResource;

/* ============================================================
   ARCHIVE
   ============================================================ */
function viewArchive(){
  return `
    <div class="page-head">
      <div class="eyebrow">PARA &middot; Archive</div>
      <h2>Inactive, not deleted</h2>
      <p>Finished projects and cold references — out of the way, still on record.</p>
    </div>

    <div class="card section-gap">
      <div class="row">
        <input class="field grow" id="arcItem" placeholder="What are you archiving?">
        <input class="field" style="width:220px;" id="arcLoc" placeholder="Storage location (Drive link)&hellip;">
        <button class="btn primary" onclick="addArchive()">Archive</button>
      </div>
    </div>

    ${state.archive.length === 0 ? `
      <div class="empty"><span class="glyph">&#9636;</span><strong>Archive is empty</strong><p>Nothing retired yet.</p></div>
    ` : state.archive.map(a => `
      <div class="list-row">
        <div class="main-col">
          <div class="title">${esc(a.item)}</div>
          <div class="desc mono">${fmtDate(a.date)} ${a.loc ? '&middot; ' + esc(a.loc) : ''}</div>
        </div>
        <button class="btn ghost icon-only" onclick="removeArchive('${a.id}')">&times;</button>
      </div>
    `).join('')}
  `;
}
function addArchive(){
  const item = document.getElementById('arcItem').value.trim();
  if(!item) return;
  state.archive.unshift({ id: id(), item, date: todayISO(), loc: document.getElementById('arcLoc').value.trim() });
  saveState(); toast('Archived'); render();
}
window.addArchive = addArchive;
function removeArchive(aid){
  state.archive = state.archive.filter(a=>a.id!==aid);
  saveState(); render();
}
window.removeArchive = removeArchive;

/* ============================================================
   IDEAS
   ============================================================ */
function viewIdeas(){
  return `
    <div class="page-head">
      <div class="eyebrow">Bank</div>
      <h2>Ideas</h2>
      <p>Raw concepts worth keeping, sorted by what they need next.</p>
    </div>

    ${docLinkBar('ideas')}

    <div class="card section-gap">
      <div class="row">
        <input class="field grow" id="ideaText" placeholder="Jot a concept or pitch&hellip;">
        <select class="field" id="ideaCat" style="width:140px;">
          <option>General</option><option>Work</option><option>Learning</option><option>Personal</option><option>Creative</option>
        </select>
        <button class="btn primary" onclick="addIdea()">Add</button>
      </div>
    </div>

    ${state.ideas.length === 0 ? `
      <div class="empty"><span class="glyph">&#9889;</span><strong>No ideas logged</strong><p>Capture the next one above.</p></div>
    ` : state.ideas.map(i => `
      <div class="list-row">
        <div class="main-col">
          <div class="title">${esc(i.text)}</div>
          <div class="desc mono">${fmtDate(i.date)}</div>
        </div>
        <div class="side">
          <span class="pill">${esc(i.cat)}</span>
          <select class="sort-select" onchange="updateIdea('${i.id}','status',this.value)">
            <option value="raw" ${i.status==='raw'?'selected':''}>Raw</option>
            <option value="exploring" ${i.status==='exploring'?'selected':''}>Exploring</option>
            <option value="used" ${i.status==='used'?'selected':''}>Used</option>
          </select>
          ${i.docUrl ? `<a href="${esc(i.docUrl)}" target="_blank" class="pill terracotta">Doc</a>` : `<button class="btn sm ghost" onclick="editDocLink('idea','${i.id}')">+ Link</button>`}
          <button class="btn ghost icon-only" onclick="removeIdea('${i.id}')">&times;</button>
        </div>
      </div>
    `).join('')}
  `;
}
function addIdea(){
  const text = document.getElementById('ideaText').value.trim();
  if(!text) return;
  state.ideas.unshift({ id: id(), text, cat: document.getElementById('ideaCat').value, date: todayISO(), status:'raw', docUrl:'' });
  saveState(); toast('Idea recorded'); render();
}
window.addIdea = addIdea;
function updateIdea(iid, field, value){
  const i = state.ideas.find(x=>x.id===iid);
  if(i){ i[field]=value; saveState(); }
}
window.updateIdea = updateIdea;
function removeIdea(iid){
  state.ideas = state.ideas.filter(i=>i.id!==iid);
  saveState(); render();
}
window.removeIdea = removeIdea;

/* ============================================================
   READING
   ============================================================ */
function viewReading(){
  return `
    <div class="page-head">
      <div class="eyebrow">Bank</div>
      <h2>Reading & Learning</h2>
      <p>Books, articles, courses — and the one thing each taught you.</p>
    </div>

    ${docLinkBar('reading')}

    <div class="card section-gap">
      <div class="row">
        <input class="field grow" id="readTitle" placeholder="Title&hellip;">
        <select class="field" id="readType" style="width:130px;">
          <option>Book</option><option>Article</option><option>Video</option><option>Course</option><option>Podcast</option>
        </select>
        <button class="btn primary" onclick="addReading()">Add</button>
      </div>
    </div>

    ${state.readings.length === 0 ? `
      <div class="empty"><span class="glyph">&#9776;</span><strong>Reading list is empty</strong><p>Add what you're working through above.</p></div>
    ` : state.readings.map(r => `
      <div class="list-row">
        <div class="main-col">
          <div class="title">${esc(r.title)} <span class="pill" style="margin-left:6px;">${esc(r.type)}</span></div>
          <input class="field" style="border:none;background:none;padding:4px 0 0;font-size:12.5px;color:var(--ink-soft);" placeholder="Key takeaway&hellip;" value="${esc(r.takeaway||'')}" onchange="updateReading('${r.id}','takeaway',this.value)">
        </div>
        <div class="side">
          <select class="sort-select" onchange="updateReading('${r.id}','status',this.value)">
            <option value="reading" ${r.status==='reading'?'selected':''}>Reading</option>
            <option value="done" ${r.status==='done'?'selected':''}>Done</option>
            <option value="backlog" ${r.status==='backlog'?'selected':''}>Backlog</option>
          </select>
          ${r.docUrl ? `<a href="${esc(r.docUrl)}" target="_blank" class="pill terracotta">Doc</a>` : `<button class="btn sm ghost" onclick="editDocLink('reading','${r.id}')">+ Link</button>`}
          <button class="btn ghost icon-only" onclick="removeReading('${r.id}')">&times;</button>
        </div>
      </div>
    `).join('')}
  `;
}
function addReading(){
  const title = document.getElementById('readTitle').value.trim();
  if(!title) return;
  state.readings.unshift({ id: id(), title, type: document.getElementById('readType').value, status:'reading', takeaway:'', docUrl:'' });
  saveState(); toast('Added to reading list'); render();
}
window.addReading = addReading;
function updateReading(rid, field, value){
  const r = state.readings.find(x=>x.id===rid);
  if(r){ r[field]=value; saveState(); }
}
window.updateReading = updateReading;
function removeReading(rid){
  state.readings = state.readings.filter(r=>r.id!==rid);
  saveState(); render();
}
window.removeReading = removeReading;

function docLinkBar(key){
  const d = state.docs[key];
  return `
    <div class="card section-gap row" style="justify-content:space-between;">
      <div class="row">
        <span style="font-size:20px;">&#128220;</span>
        <div>
          <div style="font-weight:600;font-size:13.5px;">${esc(d.name)}</div>
          <div class="mono" style="font-size:11px;color:var(--ink-faint);">Your living master document</div>
        </div>
      </div>
      <div class="row">
        ${d.url ? `<a href="${esc(d.url)}" target="_blank" class="btn sm">Open doc</a>` : ''}
        <button class="btn sm ghost" onclick="editMasterDoc('${key}')">${d.url ? 'Change' : '+ Connect doc'}</button>
      </div>
    </div>
  `;
}
function editMasterDoc(key){
  const d = state.docs[key];
  const url = prompt('Google Doc URL:', d.url || '');
  if(url === null) return;
  const name = prompt('Label for this document:', d.name);
  d.url = url.trim();
  d.name = (name || d.name).trim();
  saveState(); render();
}
window.editMasterDoc = editMasterDoc;

/* ============================================================
   PRINCIPLES
   ============================================================ */
function viewPrinciples(){
  return `
    <div class="page-head">
      <div class="eyebrow">Wisdom</div>
      <h2>Principles</h2>
      <p>Rules you've earned through experience — and how often you've put them back to work.</p>
    </div>

    ${docLinkBar('principles')}

    <div class="card section-gap">
      <textarea class="field" id="prinText" placeholder="State the principle clearly (e.g. Pain + Reflection = Progress)" style="min-height:50px;margin-bottom:8px;"></textarea>
      <textarea class="field" id="prinStory" placeholder="The real situation where you learned this (optional)&hellip;" style="min-height:50px;margin-bottom:10px;"></textarea>
      <div class="row" style="justify-content:space-between;">
        <select class="field" id="prinCat" style="width:160px;">
          <option>Life</option><option>Work</option><option>Money</option>
        </select>
        <button class="btn primary" onclick="addPrinciple()">Add principle</button>
      </div>
    </div>

    ${state.principles.length === 0 ? `
      <div class="empty"><span class="glyph">&#9998;</span><strong>No principles yet</strong><p>Write the first rule you've earned above.</p></div>
    ` : state.principles.map(p => `
      <div class="principle-card">
        <div class="row" style="justify-content:space-between;align-items:flex-start;">
          <span class="pill terracotta">${esc(p.cat)}</span>
          <button class="btn ghost icon-only" onclick="removePrinciple('${p.id}')">&times;</button>
        </div>
        <p class="ptext">&ldquo;${esc(p.text)}&rdquo;</p>
        ${p.story ? `<div class="pstory">${esc(p.story)}</div>` : ''}
        <div class="row" style="justify-content:space-between;">
          <span class="stars">
            ${[1,2,3,4,5].map(n => `<span class="star ${n<=p.stars?'on':''}" onclick="rateStars('${p.id}',${n})">&#9733;</span>`).join('')}
          </span>
          <div class="row">
            <span class="mono" style="font-size:11px;color:var(--ink-faint);">Applied ${p.applied}&times;</span>
            <button class="btn sm" onclick="applyPrinciple('${p.id}')">Mark applied</button>
            ${p.docUrl ? `<a href="${esc(p.docUrl)}" target="_blank" class="pill terracotta">Doc</a>` : `<button class="btn sm ghost" onclick="editDocLink('principle','${p.id}')">+ Link</button>`}
          </div>
        </div>
      </div>
    `).join('')}
  `;
}
function addPrinciple(){
  const text = document.getElementById('prinText').value.trim();
  if(!text) return;
  state.principles.unshift({
    id: id(), text, story: document.getElementById('prinStory').value.trim(),
    cat: document.getElementById('prinCat').value, stars: 3, applied: 0, date: todayISO(), docUrl:'',
  });
  saveState(); toast('Principle registered'); render();
}
window.addPrinciple = addPrinciple;
function applyPrinciple(pid){
  const p = state.principles.find(x=>x.id===pid);
  if(p){ p.applied++; saveState(); render(); toast('Nice — logged as applied'); }
}
window.applyPrinciple = applyPrinciple;
function rateStars(pid, n){
  const p = state.principles.find(x=>x.id===pid);
  if(p){ p.stars = n; saveState(); render(); }
}
window.rateStars = rateStars;
function removePrinciple(pid){
  state.principles = state.principles.filter(p=>p.id!==pid);
  saveState(); render();
}
window.removePrinciple = removePrinciple;

/* ============================================================
   REVIEW
   ============================================================ */
function daysSince(iso){
  if(!iso) return Infinity;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}
function viewReview(){
  const since = daysSince(state.lastReviewISO);
  const stuckProjects = state.projects.filter(p=>p.status==='stuck').length;
  const untestedPrinciples = state.principles.filter(p=>p.applied===0).length;
  const health = state.inbox.length===0 && stuckProjects===0 ? 'clear' : (state.inbox.length>5 || stuckProjects>1 ? 'overdue' : 'active');
  const healthLabel = { clear:'Clear', active:'Active', overdue:'Needs attention' }[health];
  const healthClass = { clear:'sage', active:'ochre', overdue:'terracotta' }[health];

  return `
    <div class="page-head">
      <div class="eyebrow">Maintenance</div>
      <h2>Weekly review</h2>
      <p>A short audit to keep the system honest.</p>
    </div>

    <div class="card section-gap row" style="justify-content:space-between;">
      <div>
        <div class="mono" style="font-size:11px;color:var(--ink-faint);">SYSTEM HEALTH</div>
        <div style="font-size:15px;font-weight:600;margin-top:3px;"><span class="pill ${healthClass}">${healthLabel}</span></div>
        <div class="mono" style="font-size:11px;color:var(--ink-faint);margin-top:8px;">
          ${state.lastReviewISO ? `Last review: ${since} day${since===1?'':'s'} ago` : 'No review completed yet'}
        </div>
      </div>
      <button class="btn primary" onclick="completeReview()">Mark review complete</button>
    </div>

    <div class="grid-2 section-gap">
      <div class="card">
        <h3 style="margin:0 0 10px;font-size:14px;">Bottlenecks</h3>
        ${bottleneckLine(state.inbox.length>0, `${state.inbox.length} items unsorted in Inbox`, 'Inbox is clear')}
        ${bottleneckLine(stuckProjects>0, `${stuckProjects} project${stuckProjects===1?'':'s'} marked stuck`, 'No stuck projects')}
        ${bottleneckLine(untestedPrinciples>0, `${untestedPrinciples} principle${untestedPrinciples===1?'':'s'} never applied`, 'All principles have been put into practice')}
      </div>
      <div class="card">
        <h3 style="margin:0 0 10px;font-size:14px;">Checklist</h3>
        ${['Archive anything stalled','Set next week\'s single priority','Update Area notes honestly','Apply today\'s principle','Tag Resources consistently'].map((t,idx) => `
          <div class="task-line">
            <input type="checkbox" class="chk" id="rev_${idx}">
            <label for="rev_${idx}" style="flex:1;cursor:pointer;">${t}</label>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
function bottleneckLine(isIssue, issueText, clearText){
  return `<div class="row" style="margin-bottom:9px;font-size:12.5px;">
    <span style="color:${isIssue?'var(--terracotta)':'var(--sage)'};font-size:13px;">${isIssue?'&#9888;':'&#10003;'}</span>
    <span style="color:var(--ink-soft);">${isIssue?issueText:clearText}</span>
  </div>`;
}
function completeReview(){
  state.lastReviewISO = new Date().toISOString();
  saveState(); toast('Review logged'); render();
}
window.completeReview = completeReview;

/* ============================================================
   SEARCH
   ============================================================ */
function viewSearch(){
  return `
    <div class="page-head">
      <div class="eyebrow">Find</div>
      <h2>Search everything</h2>
      <p>One query across Projects, Ideas, Principles, Readings, Resources, and Archive.</p>
    </div>
    <input class="field" id="searchInput" placeholder="Search your second brain&hellip;" style="font-size:15px;padding:13px 16px;margin-bottom:20px;">
    <div id="searchResults"></div>
  `;
}
function wireSearch(){
  const input = document.getElementById('searchInput');
  if(!input) return;
  input.addEventListener('input', () => renderSearchResults(input.value));
  renderSearchResults('');
}
function renderSearchResults(q){
  const host = document.getElementById('searchResults');
  if(!host) return;
  const query = q.trim().toLowerCase();
  if(!query){
    host.innerHTML = `<div class="empty"><span class="glyph">&#128269;</span><strong>Start typing to search</strong><p>Matches every section of your second brain instantly.</p></div>`;
    return;
  }
  const hit = s => String(s||'').toLowerCase().includes(query);
  const groups = [
    { label:'Projects', items: state.projects.filter(p=>hit(p.name)||hit(p.goal)).map(p=>({title:p.name, sub:p.goal})) },
    { label:'Ideas', items: state.ideas.filter(i=>hit(i.text)).map(i=>({title:i.text, sub:i.cat})) },
    { label:'Principles', items: state.principles.filter(p=>hit(p.text)||hit(p.story)).map(p=>({title:p.text, sub:p.story})) },
    { label:'Reading', items: state.readings.filter(r=>hit(r.title)||hit(r.takeaway)).map(r=>({title:r.title, sub:r.takeaway})) },
    { label:'Resources', items: state.resources.filter(r=>hit(r.topic)||hit(r.summary)||hit(r.tags)).map(r=>({title:r.topic, sub:r.summary})) },
    { label:'Archive', items: state.archive.filter(a=>hit(a.item)).map(a=>({title:a.item, sub:a.loc})) },
  ].filter(g=>g.items.length);

  if(groups.length === 0){
    host.innerHTML = `<div class="empty"><span class="glyph">&#10005;</span><strong>No matches</strong><p>Nothing found for "${esc(q)}"</p></div>`;
    return;
  }
  host.innerHTML = groups.map(g => `
    <div class="section-gap">
      <div class="eyebrow" style="margin-bottom:8px;">${g.label} &middot; ${g.items.length}</div>
      <div class="card">
        ${g.items.map(it => `
          <div class="list-row">
            <div class="main-col">
              <div class="title">${highlight(it.title, q)}</div>
              ${it.sub ? `<div class="desc">${highlight(it.sub, q)}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}
function highlight(text, q){
  const safe = esc(text);
  if(!q) return safe;
  const idx = safe.toLowerCase().indexOf(esc(q).toLowerCase());
  if(idx === -1) return safe;
  return safe.slice(0,idx) + '<mark>' + safe.slice(idx, idx+q.length) + '</mark>' + safe.slice(idx+q.length);
}

/* ============================================================
   SETTINGS / SYNC
   ============================================================ */
const APPS_SCRIPT_CODE = `function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ['Inbox','Projects','Resources','Archive','Ideas','Readings','Principles','Areas'];
  initSheets(ss, sheets);
  return output({ status: 'success', data: readAll(ss, sheets) });
}

function doPost(e) {
  var payload = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ['Inbox','Projects','Resources','Archive','Ideas','Readings','Principles','Areas'];
  sheets.forEach(function(name) {
    var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    sheet.clear();
    var headers = getHeaders(name);
    var rows = [headers];
    (payload.data[name] || []).forEach(function(item) {
      rows.push(headers.map(function(h) {
        var v = item[h];
        return v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : v);
      }));
    });
    sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
  });
  return output({ status: 'success', data: readAll(ss, sheets) });
}

function initSheets(ss, sheets) {
  sheets.forEach(function(name) {
    if (!ss.getSheetByName(name)) {
      var sheet = ss.insertSheet(name);
      sheet.appendRow(getHeaders(name));
    }
  });
}

function readAll(ss, sheets) {
  var result = {};
  sheets.forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    var values = sheet.getDataRange().getValues();
    var out = [];
    if (values.length > 1) {
      var headers = values[0];
      for (var i = 1; i < values.length; i++) {
        var row = {};
        for (var j = 0; j < headers.length; j++) row[headers[j]] = values[i][j];
        out.push(row);
      }
    }
    result[name] = out;
  });
  return result;
}

function getHeaders(name) {
  var map = {
    Inbox: ['text','tag','time'],
    Projects: ['name','goal','deadline','status','tasks','docUrl'],
    Resources: ['topic','summary','source','tags'],
    Archive: ['item','date','loc'],
    Ideas: ['text','cat','date','status','docUrl'],
    Readings: ['title','type','status','takeaway','docUrl'],
    Principles: ['id','text','story','cat','stars','applied','date','docUrl'],
    Areas: ['name','desc','url','label']
  };
  return map[name] || [];
}

function output(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}`;

function isValidScriptUrl(url){
  if(!url) return false;
  return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+/i.test(url.trim());
}

function viewSettings(){
  return `
    <div class="page-head">
      <div class="eyebrow">Configuration</div>
      <h2>Settings &amp; sync</h2>
      <p>This app works entirely offline in your browser. Connecting a Google Sheet is optional, and lets you back up and access your data elsewhere.</p>
    </div>

    <div class="card section-gap">
      <h3 style="margin:0 0 4px;font-size:14px;">Connection status</h3>
      <p style="font-size:12.5px;color:var(--ink-soft);margin:0 0 16px;">
        ${state.scriptUrl
          ? `Connected to a Google Apps Script Web App. ${state.lastSynced ? 'Last synced ' + state.lastSynced + '.' : 'Not yet synced.'}`
          : `No cloud connection — everything is stored only in this browser's local storage.`}
      </p>
      <div class="row">
        <input class="field grow" id="scriptUrlInput" placeholder="https://script.google.com/macros/s/&hellip;/exec" value="${esc(state.scriptUrl)}">
        <button class="btn" onclick="saveScriptUrl()">Save URL</button>
      </div>
      <div class="row" style="margin-top:12px;">
        <button class="btn sm" onclick="pullFromSheet()" ${state.scriptUrl?'':'disabled'}>Pull from Sheet</button>
        <button class="btn sm" onclick="pushToSheet()" ${state.scriptUrl?'':'disabled'}>Push backup</button>
      </div>
    </div>

    <div class="card section-gap">
      <h3 style="margin:0 0 4px;font-size:14px;">Set up your own Google Sheet backend</h3>
      <p style="font-size:12.5px;color:var(--ink-soft);margin:0 0 4px;">Four steps, about two minutes. This connects to a spreadsheet only <em>you</em> own.</p>
      <div class="divider"></div>
      <div class="step"><div class="num">1</div><div class="txt"><strong>Create a Google Sheet.</strong> Any blank sheet — name it something like "My Second Brain Data."</div></div>
      <div class="step"><div class="num">2</div><div class="txt"><strong>Open Extensions &rarr; Apps Script</strong> from the Sheet's menu bar.</div></div>
      <div class="step"><div class="num">3</div><div class="txt"><strong>Paste the code below</strong>, replacing any starter code, then save it.</div></div>
      <div class="step"><div class="num">4</div><div class="txt"><strong>Deploy &rarr; New deployment &rarr; Web app.</strong> Set "Who has access" to <em>Anyone</em>, deploy, authorize, then copy the URL into the field above.</div></div>
      <div class="row" style="margin:14px 0 8px;justify-content:space-between;">
        <span class="mono" style="font-size:11px;color:var(--ink-faint);">Apps Script code</span>
        <button class="btn sm" onclick="copyScript()">Copy code</button>
      </div>
      <div class="code-block">${esc(APPS_SCRIPT_CODE)}</div>
    </div>

    <div class="card">
      <h3 style="margin:0 0 10px;font-size:14px;">Review schedule</h3>
      <select class="field" id="reviewDueSelect" style="max-width:240px;">
        ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d => `<option ${state.reviewDue===d?'selected':''}>${d}</option>`).join('')}
      </select>
      <p style="font-size:11.5px;color:var(--ink-faint);margin-top:8px;">Used only as a gentle reminder cadence on the Review tab.</p>
    </div>
  `;
}

function saveScriptUrl(){
  const url = document.getElementById('scriptUrlInput').value.trim();
  if(url && !isValidScriptUrl(url)){
    toast("That doesn't look like a valid Apps Script Web App URL.", 'error');
    return;
  }
  state.scriptUrl = url;
  saveState();
  toast(url ? 'Connection saved' : 'Connection cleared');
  render();
}
window.saveScriptUrl = saveScriptUrl;

function copyScript(){
  navigator.clipboard.writeText(APPS_SCRIPT_CODE).then(() => toast('Script copied to clipboard'));
}
window.copyScript = copyScript;

async function pullFromSheet(){
  if(!state.scriptUrl) return;
  toast('Pulling from Google Sheets&hellip;');
  try{
    const res = await fetch(state.scriptUrl, { method:'GET', mode:'cors', headers:{Accept:'application/json'} });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if(json.status !== 'success') throw new Error(json.message || 'Unexpected response');
    mergeFromSheet(json.data);
    state.lastSynced = new Date().toLocaleString();
    saveState(); render();
    toast('Pulled latest data from your sheet');
  }catch(e){
    toast('Could not reach your sheet — check the URL and deployment access.', 'error');
  }
}
window.pullFromSheet = pullFromSheet;

async function pushToSheet(){
  if(!state.scriptUrl) return;
  toast('Pushing backup&hellip;');
  try{
    const body = {
      type:'saveAll',
      data:{
        Inbox: state.inbox, Projects: state.projects, Resources: state.resources,
        Archive: state.archive, Ideas: state.ideas, Readings: state.readings,
        Principles: state.principles, Areas: state.areas,
      },
    };
    const res = await fetch(state.scriptUrl, {
      method:'POST', mode:'cors', headers:{'Content-Type':'text/plain;charset=utf-8'},
      body: JSON.stringify(body),
    });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if(json.status !== 'success') throw new Error(json.message || 'Unexpected response');
    state.lastSynced = new Date().toLocaleString();
    saveState(); render();
    toast('Backed up to your sheet');
  }catch(e){
    toast('Backup failed — check the URL and deployment access.', 'error');
  }
}
window.pushToSheet = pushToSheet;

function mergeFromSheet(data){
  // Best-effort merge; only overwrite a section if the sheet actually returned rows.
  if(data.Inbox?.length) state.inbox = data.Inbox.map(r=>({ id:id(), text:r.text||'', tag:r.tag||'Idea', time:r.time||'' }));
  if(data.Projects?.length) state.projects = data.Projects.map(r=>({ id:id(), name:r.name||'', goal:r.goal||'', deadline:r.deadline||'', status:r.status||'active', docUrl:r.docUrl||'', tasks: safeParseTasks(r.tasks) }));
  if(data.Resources?.length) state.resources = data.Resources.map(r=>({ id:id(), topic:r.topic||'', summary:r.summary||'', source:r.source||'', tags:r.tags||'' }));
  if(data.Archive?.length) state.archive = data.Archive.map(r=>({ id:id(), item:r.item||'', date:r.date||todayISO(), loc:r.loc||'' }));
  if(data.Ideas?.length) state.ideas = data.Ideas.map(r=>({ id:id(), text:r.text||'', cat:r.cat||'General', date:r.date||todayISO(), status:r.status||'raw', docUrl:r.docUrl||'' }));
  if(data.Readings?.length) state.readings = data.Readings.map(r=>({ id:id(), title:r.title||'', type:r.type||'Article', status:r.status||'reading', takeaway:r.takeaway||'', docUrl:r.docUrl||'' }));
  if(data.Principles?.length) state.principles = data.Principles.map(r=>({ id:id(), text:r.text||'', story:r.story||'', cat:r.cat||'Life', stars:Number(r.stars)||3, applied:Number(r.applied)||0, date:r.date||todayISO(), docUrl:r.docUrl||'' }));
  if(data.Areas?.length) state.areas = data.Areas.map(r=>({ id:id(), name:r.name||'', desc:r.desc||'', url:r.url||'', label:r.label||'' }));
}
function safeParseTasks(raw){
  if(!raw) return [];
  try{ const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed.map(t=>({id:id(), text:t.text||'', done:!!t.done})) : []; }
  catch{ return []; }
}

/* wire the review-day select after render since it's outside the normal flow */
document.addEventListener('change', (e) => {
  if(e.target && e.target.id === 'reviewDueSelect'){
    state.reviewDue = e.target.value;
    saveState();
  }
});

/* ---------- boot ---------- */
render();
