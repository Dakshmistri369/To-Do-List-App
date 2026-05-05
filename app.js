/* ──────────────────────────────
   Taskify – app.js  (Pro To-Do)
────────────────────────────── */

// ── State ──────────────────────────────────────────────────────────────
const STORAGE_KEY = 'taskify_tasks_v2';

let tasks = load();
let currentFilter = 'all';
let currentTag    = 'all';
let currentSort   = 'created';
let searchQuery   = '';
let editingId     = null;
let deletingId    = null;

// ── DOM refs ────────────────────────────────────────────────────────────
const taskList       = document.getElementById('task-list');
const emptyState     = document.getElementById('empty-state');
const searchInput    = document.getElementById('search-input');
const sortSelect     = document.getElementById('sort-select');
const modalOverlay   = document.getElementById('modal-overlay');
const confirmOverlay = document.getElementById('confirm-overlay');
const modalTitle     = document.getElementById('modal-title');
const titleInput     = document.getElementById('task-title-input');
const descInput      = document.getElementById('task-desc-input');
const priorityInput  = document.getElementById('task-priority');
const categoryInput  = document.getElementById('task-category');
const dueInput       = document.getElementById('task-due');
const subtasksInput  = document.getElementById('task-subtasks');
const charCount      = document.getElementById('char-count');
const sidebar        = document.getElementById('sidebar');
const hamburger      = document.getElementById('hamburger');
const mainContent    = document.querySelector('.main-content');
const progressFill   = document.getElementById('progress-fill');
const progressPct    = document.getElementById('progress-pct');
const viewTitle      = document.getElementById('view-title');
const topbarDate     = document.getElementById('topbar-date');

// ── Init ────────────────────────────────────────────────────────────────
function init() {
  seedDemo();
  setDateDisplay();
  spawnParticles();
  bindEvents();
  render();
}

function setDateDisplay() {
  const now = new Date();
  topbarDate.textContent = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

function seedDemo() {
  if (tasks.length > 0) return;
  const today = fmt(new Date());
  const tomorrow = fmt(addDays(new Date(), 1));
  const yesterday = fmt(addDays(new Date(), -1));
  tasks = [
    makeTask('Design new landing page',    'Create wireframes and mockups for Q3 campaign.', 'high',   'work',     tomorrow),
    makeTask('30-min morning run',         'Track pace with fitness app.',                   'medium', 'health',   today),
    makeTask('Read "Atomic Habits"',       'Finish chapters 5 – 8.',                         'low',    'learning', addDays(new Date(), 3).toISOString().slice(0,10)),
    makeTask('Weekly grocery shopping',    '',                                                'medium', 'personal', today),
    makeTask('Submit project report',      'Include all sprint metrics and retrospective.',  'high',   'work',     yesterday),
  ];
  tasks[4].completed = true; // mark one done
  save();
}

function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function fmt(d) { return new Date(d).toISOString().slice(0, 10); }

function makeTask(title, desc, priority, category, due) {
  return {
    id: crypto.randomUUID(),
    title, desc, priority, category,
    due: due || '',
    completed: false,
    subtasks: [],
    created: Date.now()
  };
}

// ── Events ──────────────────────────────────────────────────────────────
function bindEvents() {
  // Sidebar nav
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      viewTitle.textContent = btn.textContent.trim().replace(/\d+/g, '').trim();
      render();
    });
  });

  // Category tag buttons
  document.querySelectorAll('.tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTag = btn.dataset.tag;
      render();
    });
  });

  // Sort
  sortSelect.addEventListener('change', () => { currentSort = sortSelect.value; render(); });

  // Search
  searchInput.addEventListener('input', () => { searchQuery = searchInput.value.toLowerCase(); render(); });

  // Add Task button
  document.getElementById('btn-add-task').addEventListener('click', openAddModal);

  // Modal close / cancel
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('btn-cancel').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

  // Modal save
  document.getElementById('btn-save').addEventListener('click', saveTask);

  // Char count
  titleInput.addEventListener('input', () => {
    charCount.textContent = `${titleInput.value.length} / 120`;
  });

  // Confirm delete
  document.getElementById('confirm-cancel').addEventListener('click', () => {
    confirmOverlay.classList.remove('open');
    deletingId = null;
  });
  document.getElementById('confirm-delete').addEventListener('click', () => {
    if (deletingId) {
      tasks = tasks.filter(t => t.id !== deletingId);
      save(); render();
      toast('Task deleted', '🗑️', 'error');
    }
    confirmOverlay.classList.remove('open');
    deletingId = null;
  });

  // Hamburger
  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); confirmOverlay.classList.remove('open'); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); searchInput.focus(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); openAddModal(); }
  });
}

// ── Modal ────────────────────────────────────────────────────────────────
function openAddModal() {
  editingId = null;
  modalTitle.textContent = 'New Task';
  titleInput.value = '';
  descInput.value = '';
  priorityInput.value = 'medium';
  categoryInput.value = 'work';
  dueInput.value = '';
  subtasksInput.value = '';
  charCount.textContent = '0 / 120';
  modalOverlay.classList.add('open');
  setTimeout(() => titleInput.focus(), 120);
}

function openEditModal(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  editingId = id;
  modalTitle.textContent = 'Edit Task';
  titleInput.value = t.title;
  descInput.value = t.desc || '';
  priorityInput.value = t.priority;
  categoryInput.value = t.category;
  dueInput.value = t.due || '';
  subtasksInput.value = (t.subtasks || []).map(s => s.text).join('\n');
  charCount.textContent = `${t.title.length} / 120`;
  modalOverlay.classList.add('open');
  setTimeout(() => titleInput.focus(), 120);
}

function closeModal() {
  modalOverlay.classList.remove('open');
  editingId = null;
}

function saveTask() {
  const title = titleInput.value.trim();
  if (!title) { titleInput.classList.add('shake'); setTimeout(() => titleInput.classList.remove('shake'), 500); return; }

  const subtaskLines = subtasksInput.value.split('\n').map(s => s.trim()).filter(Boolean);
  const subtasks = subtaskLines.map(text => ({ text, done: false }));

  if (editingId) {
    const t = tasks.find(x => x.id === editingId);
    if (t) {
      const oldSubtasks = t.subtasks || [];
      t.title    = title;
      t.desc     = descInput.value.trim();
      t.priority = priorityInput.value;
      t.category = categoryInput.value;
      t.due      = dueInput.value;
      // merge subtasks: keep done state for existing ones
      t.subtasks = subtasks.map(ns => {
        const existing = oldSubtasks.find(os => os.text === ns.text);
        return existing ? { ...existing } : ns;
      });
      toast('Task updated ✦', '✏️', 'success');
    }
  } else {
    const newTask = makeTask(title, descInput.value.trim(), priorityInput.value, categoryInput.value, dueInput.value);
    newTask.subtasks = subtasks;
    tasks.unshift(newTask);
    toast('Task added!', '✅', 'success');
  }

  save(); render(); closeModal();
}

// ── Render ───────────────────────────────────────────────────────────────
function render() {
  updateBadges();
  updateStats();
  updateProgress();

  let list = [...tasks];

  // ── Filter by view
  const today = fmt(new Date());
  if (currentFilter === 'today')     list = list.filter(t => t.due === today && !t.completed);
  if (currentFilter === 'upcoming')  list = list.filter(t => t.due > today && !t.completed);
  if (currentFilter === 'completed') list = list.filter(t => t.completed);
  if (currentFilter === 'high')      list = list.filter(t => t.priority === 'high' && !t.completed);
  if (currentFilter === 'medium')    list = list.filter(t => t.priority === 'medium' && !t.completed);
  if (currentFilter === 'low')       list = list.filter(t => t.priority === 'low' && !t.completed);

  // ── Filter by category tag
  if (currentTag !== 'all') list = list.filter(t => t.category === currentTag);

  // ── Search
  if (searchQuery) list = list.filter(t =>
    t.title.toLowerCase().includes(searchQuery) ||
    (t.desc || '').toLowerCase().includes(searchQuery)
  );

  // ── Sort
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  if (currentSort === 'priority') list.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  else if (currentSort === 'due') list.sort((a, b) => {
    if (!a.due && !b.due) return 0;
    if (!a.due) return 1;
    if (!b.due) return -1;
    return a.due.localeCompare(b.due);
  });
  else if (currentSort === 'alpha') list.sort((a, b) => a.title.localeCompare(b.title));
  else list.sort((a, b) => b.created - a.created);

  // ── Render cards
  if (list.length === 0) {
    taskList.innerHTML = '';
    emptyState.style.display = 'flex';
    return;
  }
  emptyState.style.display = 'none';
  taskList.innerHTML = list.map(taskCard).join('');

  // ── Bind card events
  taskList.querySelectorAll('.task-check').forEach(btn => {
    btn.addEventListener('click', () => toggleComplete(btn.dataset.id));
  });
  taskList.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id));
  });
  taskList.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => confirmDelete(btn.dataset.id));
  });
  taskList.querySelectorAll('.subtask-cb').forEach(cb => {
    cb.addEventListener('change', () => toggleSubtask(cb.dataset.taskid, cb.dataset.idx));
  });
}

function taskCard(t) {
  const today = fmt(new Date());
  const isOverdue = t.due && t.due < today && !t.completed;
  const dueLbl = t.due ? new Date(t.due + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const catLabel = { work: '💼 Work', personal: '🏠 Personal', health: '❤️ Health', learning: '📚 Learning' }[t.category] || t.category;

  const subtaskHtml = (t.subtasks || []).length
    ? `<div class="subtask-list">
        ${t.subtasks.map((s, i) => `
          <label class="subtask-item ${s.done ? 'done' : ''}">
            <input type="checkbox" class="subtask-cb" data-taskid="${t.id}" data-idx="${i}" ${s.done ? 'checked' : ''} />
            <span>${esc(s.text)}</span>
          </label>`).join('')}
       </div>` : '';

  return `
  <div class="task-card ${t.priority} ${t.completed ? 'completed' : ''}" role="listitem">
    <button class="task-check ${t.completed ? 'checked' : ''}" data-id="${t.id}" aria-label="Toggle complete" title="Toggle complete"></button>
    <div class="task-body">
      <div class="task-header">
        <span class="task-title">${esc(t.title)}</span>
        <div class="task-actions">
          <button class="task-action-btn btn-edit" data-id="${t.id}" title="Edit task" aria-label="Edit task">
            <svg viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
          <button class="task-action-btn btn-delete del" data-id="${t.id}" title="Delete task" aria-label="Delete task">
            <svg viewBox="0 0 24 24" fill="none"><path d="M3 6H21M8 6V4H16V6M19 6L18 20H6L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>
      ${t.desc ? `<p class="task-desc">${esc(t.desc)}</p>` : ''}
      <div class="task-meta">
        <span class="chip priority-${t.priority}">${t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}</span>
        <span class="chip category">${catLabel}</span>
        ${t.due ? `<span class="chip ${isOverdue ? 'overdue' : 'due'}">📅 ${dueLbl}${isOverdue ? ' · Overdue' : ''}</span>` : ''}
      </div>
      ${subtaskHtml}
    </div>
  </div>`;
}

// ── Actions ──────────────────────────────────────────────────────────────
function toggleComplete(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  t.completed = !t.completed;
  save(); render();
  toast(t.completed ? 'Task completed! 🎉' : 'Marked as pending', t.completed ? '✅' : '↩️', 'success');
}

function toggleSubtask(taskId, idx) {
  const t = tasks.find(x => x.id === taskId);
  if (!t || !t.subtasks[idx]) return;
  t.subtasks[idx].done = !t.subtasks[idx].done;
  save(); render();
}

function confirmDelete(id) {
  deletingId = id;
  confirmOverlay.classList.add('open');
}

// ── Stats & Badges ───────────────────────────────────────────────────────
function updateStats() {
  const today = fmt(new Date());
  const total   = tasks.length;
  const done    = tasks.filter(t => t.completed).length;
  const pending = total - done;
  const overdue = tasks.filter(t => t.due && t.due < today && !t.completed).length;

  document.getElementById('sv-total').textContent   = total;
  document.getElementById('sv-done').textContent    = done;
  document.getElementById('sv-pending').textContent = pending;
  document.getElementById('sv-overdue').textContent = overdue;
}

function updateBadges() {
  const today = fmt(new Date());
  const active = tasks.filter(t => !t.completed);
  const set = (id, n) => { const el = document.getElementById(id); if (el) el.textContent = n; };
  set('badge-all',       tasks.length);
  set('badge-today',     active.filter(t => t.due === today).length);
  set('badge-upcoming',  active.filter(t => t.due > today).length);
  set('badge-completed', tasks.filter(t => t.completed).length);
  set('badge-high',      active.filter(t => t.priority === 'high').length);
  set('badge-medium',    active.filter(t => t.priority === 'medium').length);
  set('badge-low',       active.filter(t => t.priority === 'low').length);
}

function updateProgress() {
  const todayTasks = tasks.filter(t => t.due === fmt(new Date()));
  const done = todayTasks.filter(t => t.completed).length;
  const pct = todayTasks.length ? Math.round((done / todayTasks.length) * 100) : 0;
  progressFill.style.width = pct + '%';
  progressPct.textContent  = pct + '%';
}

// ── Toast ────────────────────────────────────────────────────────────────
function toast(msg, icon = '✅', type = 'success') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut 0.3s forwards';
    setTimeout(() => el.remove(), 300);
  }, 2800);
}

// ── Persist ──────────────────────────────────────────────────────────────
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

// ── Particles ────────────────────────────────────────────────────────────
function spawnParticles() {
  const container = document.getElementById('particles');
  const count = 18;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 4 + 2;
    const colors = ['#7c3aed', '#38bdf8', '#a78bfa', '#6d28d9', '#22d3ee'];
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration:${10 + Math.random() * 20}s;
      animation-delay:${Math.random() * 15}s;
    `;
    container.appendChild(p);
  }
}

// ── Utils ────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Shake animation (CSS) ────────────────────────────────────────────────
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%,100%{transform:translateX(0)}
    20%{transform:translateX(-6px)}
    40%{transform:translateX(6px)}
    60%{transform:translateX(-4px)}
    80%{transform:translateX(4px)}
  }
  .shake { animation: shake 0.4s ease; border-color: var(--red) !important; }
`;
document.head.appendChild(shakeStyle);

// ── Start ────────────────────────────────────────────────────────────────
init();
