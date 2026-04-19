# 💬 SyncChat — Real-Time Chat System

> A clean, WhatsApp-inspired real-time chat web application where two or more users can connect instantly using a unique **Space Code** and chat seamlessly — no account verification required.

![SyncChat Preview](https://img.shields.io/badge/Status-Live-brightgreen) ![Tech](https://img.shields.io/badge/Stack-HTML%20%7C%20CSS%20%7C%20JS%20%7C%20Node.js-blue)

---

## ✨ Features

- 🔐 **Instant Login** — Enter email & password to join. No email verification needed.
- 🔑 **Unique Space Codes** — Create or join a private chat room using a short unique code (e.g. `KXZLFU`).
- ⚡ **Real-Time Messaging** — Messages appear instantly on both sides via native WebSockets.
- 💬 **Both Sides Visible** — Every sent & received message shows on both users' screens simultaneously.
- 👥 **Live Presence** — See who is currently online inside your space.
- 📜 **Chat History** — Messages persist locally per space so you can revisit past conversations.
- 🎨 **Premium Dark UI** — Inspired by modern messaging apps with smooth animations and a polished design.
- 🔄 **Auto-Reconnect** — If the connection drops, the client automatically reconnects every 2 seconds.

---

## 📁 Project Structure

```
CHAT-SYSTEM/
│
├── vanilla-chat/              ← Main chat application
│   ├── index.html             ← App entry point (Auth, Room selection, Chat UI)
│   ├── style.css              ← Complete dark-mode CSS styling
│   ├── main.js                ← Frontend logic (WebSocket client, auth, rendering)
│   ├── server.js              ← Node.js WebSocket server (handles rooms & broadcast)
│   └── package.json           ← Project dependencies (vite, ws)
│
└── README.md                  ← This file
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+ (or use the portable version in `F:\nodejs-portable`)
- **npm** v9+

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Deb911/CHAT-SYSTEM.git
cd CHAT-SYSTEM/vanilla-chat

# 2. Install dependencies
npm install
```

### Running the App

You need to run **two servers** simultaneously — open two terminal windows:

**Terminal 1 — WebSocket Server (handles real-time messaging):**
```bash
node server.js
```
> Server starts at `ws://localhost:8080`

**Terminal 2 — Frontend Dev Server:**
```bash
npm run dev
```
> App opens at `http://localhost:5174`

---

## 🧪 Testing Real-Time Chat (2 Users)

1. Open `http://localhost:5174` in your **normal browser window**
2. Enter any email + password → click **Log In / Sign Up**
3. Click **"Create New Code"** — a unique code appears (e.g. `W9K2Q`)
4. Open `http://localhost:5174` in an **Incognito / Private window**
5. Log in as a **different user** → type the code → click **"Join Space"**
6. Both windows now show each other as **Online** ✅
7. Type a message and hit **Send** or press **Enter** — it appears on both screens instantly! 🎉

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla HTML, CSS, JavaScript (ES Modules) |
| **Real-Time** | Native WebSocket API (browser) + `ws` (Node.js) |
| **Dev Server** | Vite 5 |
| **Backend** | Node.js WebSocket Server (`server.js`) |
| **Auth Backend** | InsForge BaaS (optional, for future DB integration) |
| **Styling** | Pure CSS with dark mode, animations, custom scrollbars |

---

## 🌐 How It Works

```
User A (Browser)          WebSocket Server          User B (Browser)
      │                    (port 8080)                     │
      │──── join room ────────────────────────────────────▶│
      │                         │                          │
      │──── send message ──────▶│                          │
      │                         │──── broadcast ──────────▶│
      │◀─── echo (ignored) ─────│                          │
      │                         │                          │
```

Messages are broadcast to **all clients in the same room** by the Node.js server. The sender renders the message immediately (optimistic UI) and ignores the server echo to avoid duplicates.

---

## 📝 Environment

No `.env` file needed. All config is inline:
- WebSocket URL: `ws://localhost:8080` (in `main.js`)
- Vite port: `5174` (in `package.json`)

---

## 🔮 Future Improvements

- [ ] Persistent message storage (database integration)
- [ ] Image & file sharing
- [ ] Typing indicators
- [ ] Message read receipts across devices
- [ ] Deploy to cloud (e.g. Render, Railway)

---

## 👨‍💻 Author

Built with ❤️ using Vanilla JS + Node.js WebSockets.

**GitHub:** [Deb911/CHAT-SYSTEM](https://github.com/Deb911/CHAT-SYSTEM)
