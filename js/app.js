// ── Pulse – Main App ──────────────────────────────────────────────────────
import { firebaseConfig } from './firebase-config.js';
import { initializeApp }           from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
         signInWithPopup, signInWithRedirect, getRedirectResult,
         GoogleAuthProvider, signOut, onAuthStateChanged,
         updateProfile }            from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, collection, doc, addDoc, deleteDoc, onSnapshot,
         query, orderBy, serverTimestamp, setDoc, getDocs }
                                    from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── Init ──────────────────────────────────────────────────────────────────────
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
const gProvider = new GoogleAuthProvider();
gProvider.setCustomParameters({ prompt: 'select_account' });

// ── State ─────────────────────────────────────────────────────────────────────
let currentUser   = null;
let transactions  = [];
let categories    = [];
let unsubs        = [];
let pendingDelId  = null;
let selectedTxType = 'income';
let selectedCatType = 'income';
let selectedColor  = '#6366f1';

// ── Default categories ────────────────────────────────────────────────────────
const DEFAULT_CATS = [
  { name:'Salary',      type:'income',     color:'#10b981' },
  { name:'Freelance',   type:'income',     color:'#14b8a6' },
  { name:'Food',        type:'expense',    color:'#ef4444' },
  { name:'Transport',   type:'expense',    color:'#f59e0b' },
  { name:'Bills',       type:'expense',    color:'#8b5cf6' },
  { name:'Shopping',    type:'expense',    color:'#ec4899' },
  { name:'Stocks',      type:'investment', color:'#6366f1' },
  { name:'Mutual Funds',type:'investment', color:'#3b82f6' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt  = n => '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const $    = id => document.getElementById(id);
const show = id => $(id).classList.remove('hidden');
const hide = id => $(id).classList.add('hidden');
const todayISO = () => new Date().toISOString().split('T')[0];

function showError(elId, msg) {
  const el = $(elId);
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}

function setGoogleBtnLoading(loading) {
  const btn = $('btn-google');
  btn.disabled = loading;
  btn.innerHTML = loading
    ? '<span class="spinner"></span> Signing in...'
    : `<svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Continue with Google`;
}

// ── Handle redirect result on page load ───────────────────────────────────────
// This fires after Google redirects back to the app
getRedirectResult(auth)
  .then(result => {
    if (result?.user) {
      // Signed in via redirect — onAuthStateChanged will handle the rest
      console.log('Redirect sign-in success:', result.user.email);
    }
  })
  .catch(err => {
    console.error('Redirect error:', err);
    if (err.code !== 'auth/no-current-user') {
      showError('auth-error', friendlyError(err.code));
    }
  });

// ── Auth Screens ──────────────────────────────────────────────────────────────
$('to-signup').addEventListener('click', e => { e.preventDefault(); hide('login-form');  show('signup-form'); });
$('to-login') .addEventListener('click', e => { e.preventDefault(); hide('signup-form'); show('login-form');  });

$('btn-google').addEventListener('click', async () => {
  setGoogleBtnLoading(true);
  hide('auth-error');
  try {
    // Try popup first — works best on desktop browsers
    await signInWithPopup(auth, gProvider);
  } catch (popupErr) {
    console.warn('Popup blocked or failed:', popupErr.code);
    // Popup was blocked or not supported — fall back to redirect
    if (
      popupErr.code === 'auth/popup-blocked' ||
      popupErr.code === 'auth/popup-closed-by-user' ||
      popupErr.code === 'auth/cancelled-popup-request' ||
      popupErr.code === 'auth/operation-not-supported-in-this-environment'
    ) {
      try {
        // Redirect will navigate away and come back — handled by getRedirectResult above
        await signInWithRedirect(auth, gProvider);
      } catch (redirectErr) {
        setGoogleBtnLoading(false);
        showError('auth-error', friendlyError(redirectErr.code));
      }
    } else {
      setGoogleBtnLoading(false);
      showError('auth-error', friendlyError(popupErr.code));
    }
  }
});

$('btn-signin').addEventListener('click', async () => {
  const email = $('email').value.trim();
  const pass  = $('password').value;
  if (!email || !pass) return showError('auth-error', 'Enter your email and password.');
  try { await signInWithEmailAndPassword(auth, email, pass); }
  catch(e) { showError('auth-error', friendlyError(e.code)); }
});

$('btn-signup').addEventListener('click', async () => {
  const name  = $('signup-name').value.trim();
  const email = $('signup-email').value.trim();
  const pass  = $('signup-password').value;
  if (!name) return showError('auth-error', 'Please enter your name.');
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
  } catch(e) { showError('auth-error', friendlyError(e.code)); }
});

$('btn-signout').addEventListener('click', () => signOut(auth));

function friendlyError(code) {
  const map = {
    'auth/wrong-password':            'Incorrect password.',
    'auth/invalid-credential':        'Incorrect email or password.',
    'auth/user-not-found':            'No account found with this email.',
    'auth/email-already-in-use':      'Email already registered.',
    'auth/weak-password':             'Password must be at least 6 characters.',
    'auth/invalid-email':             'Invalid email address.',
    'auth/too-many-requests':         'Too many attempts. Please try again later.',
    'auth/network-request-failed':    'Network error. Check your connection.',
    'auth/popup-blocked':             'Popup was blocked. Trying redirect instead...',
    'auth/unauthorized-domain':       'This domain is not authorized in Firebase. Add it in Authentication → Settings → Authorized domains.',
    'auth/internal-error':            'An internal error occurred. Try again.',
  };
  return map[code] || `Error: ${code}`;
}

// ── Auth State ────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async user => {
  if (user) {
    currentUser = user;
    setGoogleBtnLoading(false);
    $('user-name').textContent = user.displayName || user.email.split('@')[0];
    $('auth-screen').classList.remove('active');
    $('auth-screen').classList.add('hidden');
    $('app-screen').classList.remove('hidden');
    $('app-screen').classList.add('active');
    await ensureDefaultCategories();
    subscribeData();
  } else {
    currentUser = null;
    unsubs.forEach(u => u());
    unsubs = [];
    transactions = []; categories = [];
    $('app-screen').classList.remove('active');
    $('app-screen').classList.add('hidden');
    $('auth-screen').classList.remove('hidden');
    $('auth-screen').classList.add('active');
    setGoogleBtnLoading(false);
  }
});

// ── Firestore Paths ───────────────────────────────────────────────────────────
const txCol  = () => collection(db, 'users', currentUser.uid, 'transactions');
const catCol = () => collection(db, 'users', currentUser.uid, 'categories');

async function ensureDefaultCategories() {
  const snap = await getDocs(catCol());
  if (snap.empty) {
    for (const c of DEFAULT_CATS) {
      await addDoc(catCol(), { ...c, createdAt: serverTimestamp() });
    }
  }
}

function subscribeData() {
  const u1 = onSnapshot(query(txCol(), orderBy('date','desc'), orderBy('createdAt','desc')), snap => {
    transactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAll();
  });
  const u2 = onSnapshot(query(catCol(), orderBy('name')), snap => {
    categories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderCategories();
    renderCategoryFilter();
    renderCategorySelect();
    renderAll();
  });
  unsubs.push(u1, u2);
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    btn.classList.add('active');
    $(`tab-${btn.dataset.tab}`).classList.remove('hidden');
  });
});

$('view-all-link').addEventListener('click', e => {
  e.preventDefault();
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
  document.querySelector('[data-tab="transactions"]').classList.add('active');
  $('tab-transactions').classList.remove('hidden');
});

// ── Render All ────────────────────────────────────────────────────────────────
function renderAll() {
  renderSummary();
  renderDashboard();
  renderTxList();
}

function filterByPeriod(txs, period) {
  const now = new Date();
  if (period === 'month') {
    const ym = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    return txs.filter(t => t.date?.startsWith(ym));
  }
  if (period === 'week') {
    const d = new Date(); d.setDate(d.getDate() - 6);
    return txs.filter(t => t.date >= d.toISOString().split('T')[0]);
  }
  return txs;
}

// ── Summary ───────────────────────────────────────────────────────────────────
function renderSummary() {
  const totals = { income:0, expense:0, investment:0 };
  transactions.forEach(t => { totals[t.type] = (totals[t.type]||0) + t.amount; });
  $('total-income') .textContent = fmt(totals.income);
  $('total-expense').textContent = fmt(totals.expense);
  $('total-invest') .textContent = fmt(totals.investment);
  const net = totals.income - totals.expense - totals.investment;
  $('total-net').textContent = (net < 0 ? '-' : '') + fmt(net);
  $('total-net').style.color = net < 0 ? 'var(--expense)' : 'var(--income)';
}

// ── Dashboard ────────────────────────────────────────────────────────────────
function renderDashboard() {
  const period = $('period-filter').value;
  const txs = filterByPeriod(transactions, period);

  const catTotals = {};
  txs.forEach(t => {
    if (!catTotals[t.category]) catTotals[t.category] = { amount:0, type:t.type, color:'#6366f1' };
    catTotals[t.category].amount += t.amount;
    const cat = categories.find(c => c.name === t.category);
    if (cat) catTotals[t.category].color = cat.color;
  });

  const sorted = Object.entries(catTotals).sort((a,b) => b[1].amount - a[1].amount);
  const maxAmt = sorted[0]?.[1].amount || 1;
  const barsEl = $('category-bars');

  if (!sorted.length) {
    barsEl.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem;text-align:center;padding:24px 0">No data for this period.</p>';
  } else {
    barsEl.innerHTML = sorted.map(([name, d]) => `
      <div class="cat-bar-item">
        <div class="cat-bar-top">
          <span class="cat-bar-name">
            <span class="cat-dot" style="background:${d.color}"></span>
            ${name}
            <span class="cat-bar-type">${d.type}</span>
          </span>
          <span class="cat-bar-amount">${fmt(d.amount)}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${(d.amount/maxAmt*100).toFixed(1)}%;background:${d.color}"></div>
        </div>
      </div>`).join('');
  }

  const recent = txs.slice(0, 5);
  const recEl = $('recent-list');
  if (!recent.length) { recEl.innerHTML=''; show('empty-dash'); }
  else { hide('empty-dash'); recEl.innerHTML = recent.map(txHTML).join(''); attachTxHandlers(recEl); }
}

$('period-filter').addEventListener('change', renderDashboard);

// ── Transaction List ──────────────────────────────────────────────────────────
function renderTxList() {
  let txs = [...transactions];
  const typeF = $('tx-type-filter').value;
  const catF  = $('tx-cat-filter').value;
  const monF  = $('tx-month-filter').value;
  if (typeF !== 'all') txs = txs.filter(t => t.type === typeF);
  if (catF  !== 'all') txs = txs.filter(t => t.category === catF);
  if (monF)            txs = txs.filter(t => t.date?.startsWith(monF));

  const el = $('tx-list-full');
  if (!txs.length) { el.innerHTML=''; show('empty-tx'); }
  else { hide('empty-tx'); el.innerHTML = txs.map(txHTML).join(''); attachTxHandlers(el); }
}

[$('tx-type-filter'), $('tx-cat-filter'), $('tx-month-filter')].forEach(el =>
  el.addEventListener('change', renderTxList));

function txHTML(t) {
  const cat = categories.find(c => c.name === t.category);
  const bg  = cat?.color ? cat.color + '22' : '#6366f122';
  const ic  = typeIcon(t.type);
  const sign = t.type === 'income' ? '+' : '-';
  return `<div class="tx-item" data-id="${t.id}">
    <div class="tx-icon" style="background:${bg}">${ic}</div>
    <div class="tx-body">
      <div class="tx-note">${t.note || t.category}</div>
      <div class="tx-meta">${t.category} · ${t.date || ''}</div>
    </div>
    <div class="tx-right">
      <div class="tx-amount ${t.type}">${sign}${fmt(t.amount)}</div>
    </div>
    <button class="tx-del" data-id="${t.id}" title="Delete">✕</button>
  </div>`;
}

function attachTxHandlers(container) {
  container.querySelectorAll('.tx-del').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      pendingDelId = btn.dataset.id;
      show('modal-del');
    });
  });
}

function typeIcon(type) {
  return type === 'income' ? '💰' : type === 'expense' ? '💸' : '📈';
}

function renderCategoryFilter() {
  const sel = $('tx-cat-filter');
  const cur = sel.value;
  sel.innerHTML = '<option value="all">All categories</option>' +
    categories.map(c => `<option value="${c.name}"${c.name===cur?' selected':''}>${c.name}</option>`).join('');
}

function renderCategorySelect() {
  const sel = $('tx-category');
  const filtered = categories.filter(c => c.type === selectedTxType);
  sel.innerHTML = filtered.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  if (!filtered.length) sel.innerHTML = '<option value="">No categories – add one first</option>';
}

function renderCategories() {
  $('cat-list').innerHTML = categories.map(c => `
    <div class="cat-item">
      <div class="cat-item-dot" style="background:${c.color}"></div>
      <div class="cat-item-info">
        <div class="cat-item-name">${c.name}</div>
        <div class="cat-item-type">${c.type}</div>
      </div>
      <button class="cat-del-btn" data-id="${c.id}">✕</button>
    </div>`).join('');

  document.querySelectorAll('.cat-del-btn').forEach(btn =>
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this category?')) return;
      await deleteDoc(doc(db, 'users', currentUser.uid, 'categories', btn.dataset.id));
    })
  );
}

// ── FAB / Add Transaction Modal ───────────────────────────────────────────────
$('fab').addEventListener('click', () => {
  $('tx-amount').value = '';
  $('tx-note').value   = '';
  $('tx-date').value   = todayISO();
  selectedTxType = 'income';
  document.querySelectorAll('.type-btn[data-type]').forEach(b =>
    b.classList.toggle('active', b.dataset.type === 'income'));
  renderCategorySelect();
  hide('modal-tx-error');
  show('modal-tx');
});

document.querySelectorAll('.type-btn[data-type]').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedTxType = btn.dataset.type;
    document.querySelectorAll('.type-btn[data-type]').forEach(b =>
      b.classList.toggle('active', b === btn));
    renderCategorySelect();
  });
});

$('btn-save-tx').addEventListener('click', async () => {
  const amount = parseFloat($('tx-amount').value);
  const date   = $('tx-date').value;
  const cat    = $('tx-category').value;
  if (!amount || amount <= 0) return showError('modal-tx-error','Enter a valid amount.');
  if (!date)                  return showError('modal-tx-error','Pick a date.');
  if (!cat)                   return showError('modal-tx-error','Add a category first.');
  await addDoc(txCol(), {
    amount, date, type: selectedTxType,
    category: cat,
    note: $('tx-note').value.trim(),
    createdAt: serverTimestamp()
  });
  hide('modal-tx');
});

$('btn-cancel-tx').addEventListener('click', () => hide('modal-tx'));

// ── Add Category Modal ────────────────────────────────────────────────────────
$('btn-add-cat').addEventListener('click', () => {
  $('cat-name').value = '';
  selectedCatType = 'income';
  selectedColor   = '#6366f1';
  document.querySelectorAll('.type-btn[data-cat-type]').forEach(b =>
    b.classList.toggle('active', b.dataset.catType === 'income'));
  document.querySelectorAll('.swatch').forEach(s =>
    s.classList.toggle('active', s.dataset.color === '#6366f1'));
  hide('modal-cat-error');
  show('modal-cat');
});

document.querySelectorAll('.type-btn[data-cat-type]').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedCatType = btn.dataset.catType;
    document.querySelectorAll('.type-btn[data-cat-type]').forEach(b =>
      b.classList.toggle('active', b === btn));
  });
});

document.querySelectorAll('.swatch').forEach(sw => {
  sw.addEventListener('click', () => {
    selectedColor = sw.dataset.color;
    document.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', s === sw));
  });
});

$('btn-save-cat').addEventListener('click', async () => {
  const name = $('cat-name').value.trim();
  if (!name) return showError('modal-cat-error','Enter a category name.');
  if (categories.find(c => c.name.toLowerCase() === name.toLowerCase()))
    return showError('modal-cat-error','Category already exists.');
  await addDoc(catCol(), { name, type: selectedCatType, color: selectedColor, createdAt: serverTimestamp() });
  hide('modal-cat');
});

// ── Delete Confirm ────────────────────────────────────────────────────────────
$('btn-confirm-del').addEventListener('click', async () => {
  if (!pendingDelId) return;
  await deleteDoc(doc(db, 'users', currentUser.uid, 'transactions', pendingDelId));
  pendingDelId = null;
  hide('modal-del');
});

// ── Generic close buttons ─────────────────────────────────────────────────────
document.querySelectorAll('[data-close]').forEach(btn =>
  btn.addEventListener('click', () => hide(btn.dataset.close)));

document.querySelectorAll('.modal-overlay').forEach(overlay =>
  overlay.addEventListener('click', e => { if (e.target === overlay) hide(overlay.id); }));

// ── PWA Install Banner ────────────────────────────────────────────────────────
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  if (!$('install-banner')) {
    const banner = document.createElement('div');
    banner.id = 'install-banner';
    banner.innerHTML = `<span>📲 Add Pulse to home screen</span>
      <button class="btn btn-primary" id="btn-install">Install</button>
      <button class="btn btn-ghost" id="btn-dismiss-install">✕</button>`;
    document.body.appendChild(banner);
    $('btn-install').addEventListener('click', async () => {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') banner.remove();
    });
    $('btn-dismiss-install').addEventListener('click', () => banner.remove());
  }
});

// ── Service Worker ────────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
}
