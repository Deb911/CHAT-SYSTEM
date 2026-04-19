// SyncChat – main.js
// Uses native WebSocket for real-time messaging
// WS_URL: set VITE_WS_URL env var in Vercel to point to Render backend

const WS_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WS_URL)
  ? import.meta.env.VITE_WS_URL
  : 'ws://localhost:8080';

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const authScreen    = document.getElementById('auth-screen');
const roomScreen    = document.getElementById('room-screen');
const chatScreen    = document.getElementById('chat-screen');
const emailInput    = document.getElementById('email');
const passwordInput = document.getElementById('password');
const toggleBtn     = document.getElementById('toggle-btn');
const authBtn       = document.getElementById('auth-btn');
const authToggle    = document.getElementById('auth-toggle-text');
const authError     = document.getElementById('auth-error');
const roomInput     = document.getElementById('room-input');
const joinRoomBtn   = document.getElementById('join-room-btn');
const createRoomBtn = document.getElementById('create-room-btn');
const roomBackBtn   = document.getElementById('room-back-btn');
const logoutBtn     = document.getElementById('logout-btn');
const leaveRoomBtn  = document.getElementById('leave-room-btn');
const myAvatar      = document.getElementById('my-avatar');
const chatSubtitle  = document.getElementById('chat-subtitle');
const sidebarRoom   = document.getElementById('sidebar-room-name');
const roomTitle     = document.getElementById('room-title');
const onlineCount   = document.getElementById('online-count');
const onlineUsers   = document.getElementById('online-users-container');
const msgContainer  = document.getElementById('messages-container');
const msgInput      = document.getElementById('message-input');
const sendBtn       = document.getElementById('send-btn');

// ─── State ─────────────────────────────────────────────────────────────────
let session     = null;
let currentRoom = null;
let ws          = null;      // native WebSocket
let lastUserId  = null;
let renderedIds = new Set();
let isLoginMode = true;
let reconnectTimer = null;

// ─── Init ───────────────────────────────────────────────────────────────────
function init() {
  const s = localStorage.getItem('syncchat_auth');
  if (s) session = JSON.parse(s);
  const r = localStorage.getItem('syncchat_room');
  if (r) currentRoom = r;
  renderApp();
}

// ─── Render Router ─────────────────────────────────────────────────────────
function renderApp() {
  authScreen.style.display = 'none';
  roomScreen.style.display = 'none';
  chatScreen.style.display = 'none';

  if (!session) {
    authScreen.style.display = 'flex';
    disconnectWS();
  } else if (!currentRoom) {
    roomScreen.style.display = 'flex';
    disconnectWS();
  } else {
    chatScreen.style.display = 'block';
    myAvatar.textContent = session.user.email[0].toUpperCase();
    sidebarRoom.textContent = 'Space: ' + currentRoom;
    roomTitle.textContent   = 'Secure Space – ' + currentRoom;
    connectWS();
  }
}

// ─── Auth ───────────────────────────────────────────────────────────────────
toggleBtn.addEventListener('click', () => {
  isLoginMode = !isLoginMode;
  authBtn.textContent    = isLoginMode ? 'Log In' : 'Sign Up';
  authToggle.textContent = isLoginMode ? 'Need an account?' : 'Have an account?';
  toggleBtn.textContent  = isLoginMode ? 'Sign up' : 'Log in';
  authError.style.display = 'none';
});

document.getElementById('auth-form').addEventListener('submit', e => {
  e.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) return;
  const fakeId = 'user-' + btoa(unescape(encodeURIComponent(email))).slice(0, 20);
  session = { user: { id: fakeId, email } };
  localStorage.setItem('syncchat_auth', JSON.stringify(session));
  renderApp();
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('syncchat_auth');
  localStorage.removeItem('syncchat_room');
  session = null; currentRoom = null;
  renderApp();
});

roomBackBtn.addEventListener('click', () => {
  localStorage.removeItem('syncchat_auth');
  session = null;
  renderApp();
});

// ─── Room ───────────────────────────────────────────────────────────────────
joinRoomBtn.addEventListener('click', () => {
  const code = (roomInput.value || '').trim().toUpperCase();
  if (code.length < 3) { alert('Enter a valid code (min 3 characters)'); return; }
  currentRoom = code;
  localStorage.setItem('syncchat_room', currentRoom);
  renderApp();
});

createRoomBtn.addEventListener('click', () => {
  currentRoom = Math.random().toString(36).substring(2, 8).toUpperCase();
  localStorage.setItem('syncchat_room', currentRoom);
  renderApp();
});

leaveRoomBtn.addEventListener('click', () => {
  localStorage.removeItem('syncchat_room');
  currentRoom = null;
  disconnectWS();
  renderApp();
});

// ─── WebSocket Connection ──────────────────────────────────────────────────
function connectWS() {
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) return;

  clearTimeout(reconnectTimer);
  setStatus('Connecting…', false);

  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('[WS] Connected');
    setStatus('Connected ✓', true);
    sendBtn.disabled = msgInput.value.trim() === '';

    // Join the room
    ws.send(JSON.stringify({
      type:    'join',
      room:    currentRoom,
      user_id: session.user.id,
      email:   session.user.email,
    }));

    // Load local history
    loadHistory();
  };

  ws.onmessage = (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }

    if (msg.type === 'message') {
      const p = msg.payload;
      if (!renderedIds.has(p.id)) {
        addToHistory(p);
        displayMessage(p);
        scrollBottom();
      }
    } else if (msg.type === 'presence') {
      renderOnlineUsers(msg.users);
    } else if (msg.type === 'pong') {
      // keep-alive
    }
  };

  ws.onclose = () => {
    console.log('[WS] Disconnected');
    setStatus('Reconnecting…', false);
    ws = null;
    // Auto-reconnect after 2s
    if (session && currentRoom) {
      reconnectTimer = setTimeout(connectWS, 2000);
    }
  };

  ws.onerror = (err) => {
    console.error('[WS Error]', err);
    setStatus('Connection error – retrying…', false);
  };
}

function disconnectWS() {
  clearTimeout(reconnectTimer);
  if (ws) { ws.close(); ws = null; }
}

function setStatus(text, connected) {
  chatSubtitle.textContent = 'Code: ' + (currentRoom || '---') + ' • ' + text;
  chatSubtitle.style.color = connected ? '#00a884' : '#8696a0';
}

// ─── Send message ─────────────────────────────────────────────────────────────
function doSend() {
  const content = msgInput.value.trim();
  if (!content) return;
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    alert('Not connected yet – please wait and try again.');
    return;
  }

  msgInput.value = '';

  const msg = {
    id:         Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    content,
    user_id:    session.user.id,
    user_email: session.user.email,
    created_at: new Date().toISOString(),
  };

  // 1. Render immediately on sender's screen (optimistic UI)
  renderBubble(msg);
  scrollBottom();

  // 2. Mark ID AFTER rendering so the server echo is skipped (not double-rendered)
  renderedIds.add(msg.id);
  addToHistory(msg);

  // 3. Broadcast to all room members via WebSocket server
  ws.send(JSON.stringify({ type: 'message', payload: msg }));

  sendBtn.disabled = false;
  msgInput.focus();
}

sendBtn.addEventListener('click', doSend);
msgInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doSend(); } });
msgInput.addEventListener('input', () => {
  sendBtn.disabled = !ws || ws.readyState !== WebSocket.OPEN || msgInput.value.trim() === '';
});

// ─── History ─────────────────────────────────────────────────────────────────
function loadHistory() {
  renderedIds.clear();
  lastUserId = null;
  msgContainer.innerHTML =
    '<div class="msg-notice">Messages are securely scoped to this Space. Share the code to invite others.</div>';

  const arr = JSON.parse(localStorage.getItem('history_' + currentRoom) || '[]');
  arr.forEach(m => displayMessage(m));
  scrollBottom();
}

function addToHistory(msg) {
  const key = 'history_' + currentRoom;
  const arr = JSON.parse(localStorage.getItem(key) || '[]');
  // avoid duplicate saves
  if (!arr.find(m => m.id === msg.id)) {
    arr.push(msg);
    if (arr.length > 500) arr.splice(0, arr.length - 500);
    localStorage.setItem(key, JSON.stringify(arr));
  }
}

// ─── Display bubble (called for incoming messages from server) ────────────────
function displayMessage(msg) {
  // Skip if already rendered (our own optimistic render marked this ID)
  if (renderedIds.has(msg.id)) return;
  renderedIds.add(msg.id);
  renderBubble(msg);
}

// ─── Render bubble (core DOM builder — called by both sender and receiver) ────
function renderBubble(msg) {
  const isMe    = msg.user_id === session.user.id;
  const isFirst = lastUserId !== msg.user_id;
  lastUserId = msg.user_id;

  const time = msg.created_at
    ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const checkSVG = `<svg viewBox="0 0 24 24" width="15" height="15" stroke="#53bdeb" stroke-width="2.5" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

  const safe = msg.content.replace(/[<>&"]/g,
    c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

  const row = document.createElement('div');
  row.className = 'msg-row ' + (isMe ? 'me' : 'them');

  const tailStyle = isFirst
    ? (isMe ? 'border-top-right-radius:0' : 'border-top-left-radius:0')
    : '';

  row.innerHTML = `
    <div class="msg-bubble" style="${tailStyle}; margin-top:${isFirst ? '8px' : '2px'};">
      ${!isMe && isFirst ? `<span class="msg-sender">${(msg.user_email || 'User').split('@')[0]}</span>` : ''}
      <span class="msg-content">${safe}</span>
      <span class="space-hack"></span>
      <div class="msg-meta">
        <span class="msg-time">${time}</span>
        ${isMe ? `<span class="read-receipt">${checkSVG}</span>` : ''}
      </div>
    </div>`;

  msgContainer.appendChild(row);
}

// ─── Online users sidebar ─────────────────────────────────────────────────────
function renderOnlineUsers(users) {
  const count = users.length;
  onlineCount.textContent = count + ' online';
  chatSubtitle.textContent = 'Code: ' + currentRoom + ' • '
    + users.map(u => u.email.split('@')[0]).join(', ');
  chatSubtitle.style.color = '#00a884';

  onlineUsers.innerHTML = '';
  users.forEach(u => {
    const isMe = u.id === session.user.id;
    onlineUsers.innerHTML += `
      <div class="contact">
        <div class="contact-avatar" style="background:#6b7c85;width:48px;height:48px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:1.2rem;text-transform:uppercase;">
          ${u.email[0]}
        </div>
        <div class="contact-info">
          <div class="contact-row">
            <span class="contact-name">${isMe ? 'You' : u.email.split('@')[0]}</span>
            <span class="contact-time" style="color:#00a884;">Online</span>
          </div>
          <span class="contact-msg text-emerald">${u.email}</span>
        </div>
      </div>`;
  });
}

// ─── Scroll ───────────────────────────────────────────────────────────────────
function scrollBottom() { setTimeout(() => { msgContainer.scrollTop = msgContainer.scrollHeight; }, 60); }

// ─── Boot ─────────────────────────────────────────────────────────────────────
init();
