# ♟ Bughouse Chess — 4-Player Co-op

A 4-player cooperative chess game with 2 simultaneous boards, built with React Native (Expo) + Node.js WebSocket server. Runs as a web app and can be deployed to the Android Play Store.

---

## How the Game Works

| Slot | Board | Color | Team |
|------|-------|-------|------|
| 0    | Board 1 | ⬜ White | Team A |
| 1    | Board 2 | ⬛ Black | Team A |
| 2    | Board 1 | ⬛ Black | Team B |
| 3    | Board 2 | ⬜ White | Team B |

**Team A**: Slot 0 + Slot 1 &nbsp;|&nbsp; **Team B**: Slot 2 + Slot 3

### Rules
- When you capture a piece, your **teammate** receives it in their **reserve**.
- Instead of making a normal move, you can **drop** a piece from your reserve onto any empty square.
- **Pawns** cannot be dropped on rank 1 or rank 8.
- All other pieces can be dropped on any empty square.
- Checkmate on **either board** ends the game.

---

## 📋 Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- **Expo CLI**: `npm install -g expo-cli`
- **EAS CLI** (for Android build): `npm install -g eas-cli`

---

## 🖥 Running Locally

### Step 1 — Start the Server

```bash
cd server
npm install
npm start
```

The server runs at `ws://localhost:8080`. You'll see:
```
🎮 Bughouse Chess server running on ws://localhost:8080
```

### Step 2 — Start the App (Web browser)

Open a new terminal:

```bash
cd app
npm install
npm run web
```

This opens the app at `http://localhost:8081` (or similar) in your browser.

### Step 3 — Connect 4 Players

For local testing, open **4 browser tabs** all pointing to the same URL. In each tab:

1. Enter server URL: `ws://localhost:8080`
2. Enter a player name
3. Select a different **seat** (Slot 1–4) in each tab
4. Click **Join Game**

Once all 4 slots are filled, the game starts automatically.

### LAN Testing (multiple devices)

1. Find your computer's local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Start the server (it listens on all interfaces)
3. In the app, use `ws://YOUR_IP:8080` as the server URL
4. All devices must be on the same WiFi network

---

## 📱 Running on Android (Physical Device)

### With Expo Go App

```bash
cd app
npm run start
```

Scan the QR code with the **Expo Go** app (available on Play Store). Note: Use the LAN IP address for the server (not localhost).

### Build a Native APK for Testing

```bash
cd app
npm install -g eas-cli
eas login          # Create a free Expo account at expo.dev
eas build --platform android --profile preview
```

This builds an `.apk` you can download and install directly on your Android device.

---

## 🚀 Deploying the Server

### Option A — Railway (Recommended, Free Tier Available)

1. Push your project to GitHub
2. Go to [railway.app](https://railway.app) and sign in
3. Click **New Project** → **Deploy from GitHub Repo**
4. Select the repo, choose the `server/` folder
5. Railway auto-detects Node.js and runs `npm start`
6. Go to **Settings** → **Networking** → **Generate Domain**
7. Your server URL will be something like `wss://your-app.railway.app`

In the app, use `wss://your-app.railway.app` (note: `wss://` not `ws://` for secure connections).

### Option B — Render (Free Tier)

1. Go to [render.com](https://render.com) and sign in
2. Click **New** → **Web Service**
3. Connect your GitHub repo
4. Set **Root Directory** to `server`
5. **Build Command**: `npm install`
6. **Start Command**: `node server.js`
7. Set **Environment Variable**: `PORT=10000`
8. Render gives you a URL like `wss://your-app.onrender.com`

> ⚠️ Free tier on Render spins down after inactivity. Upgrade to Starter ($7/mo) for persistent connections.

### Option C — Heroku

```bash
cd server
heroku create your-bughouse-chess-server
git init
echo "node_modules/" > .gitignore
git add .
git commit -m "Deploy server"
heroku git:remote -a your-bughouse-chess-server
git push heroku main
```

---

## 📲 Deploying to the Android Play Store

### Step 1 — Set Up EAS

```bash
npm install -g eas-cli
eas login
```

Create an account at [expo.dev](https://expo.dev) if you don't have one.

### Step 2 — Configure Your App

Edit `app/app.json`:
```json
{
  "expo": {
    "android": {
      "package": "com.yourname.bughousechess"  // must be unique
    }
  }
}
```

Update the server URL to your deployed server in the app (or make it configurable in the lobby — it already is!).

### Step 3 — Build Production Bundle

```bash
cd app
eas build --platform android --profile production
```

This creates an `.aab` (Android App Bundle) file. Download it from the Expo dashboard.

### Step 4 — Submit to Google Play

1. Create a **Google Play Developer Account** at [play.google.com/console](https://play.google.com/console) ($25 one-time fee)
2. Create a new app in the console
3. Complete the store listing (title, description, screenshots)
4. Upload the `.aab` file to the **Internal Testing** track first
5. Once approved, promote to **Production**

**Or use EAS Submit** (automated):
```bash
eas submit --platform android
```

### Step 5 — Web Deployment (Bonus)

```bash
cd app
expo export --platform web
```

This creates a `dist/` folder you can deploy to **Netlify**, **Vercel**, or **GitHub Pages**:

```bash
# Netlify
npx netlify deploy --dir=dist --prod

# Vercel
npx vercel dist/
```

Users can play in their browser with no app download required!

---

## 🗂 Project Structure

```
bughouse-chess/
├── server/
│   ├── server.js          # WebSocket game server
│   ├── chessLogic.js      # Chess move validation
│   └── package.json
│
└── app/
    ├── App.js             # Root component
    ├── app.json           # Expo configuration
    ├── eas.json           # EAS build profiles
    └── src/
        ├── chess/
        │   └── logic.js   # Chess logic (client-side)
        ├── context/
        │   └── GameContext.js  # WebSocket & state
        ├── screens/
        │   ├── LobbyScreen.js  # Connection & seat selection
        │   └── GameScreen.js   # Main game view
        └── components/
            ├── ChessBoard.js       # 8×8 board
            ├── ReservePanel.js     # Captured pieces
            └── PromotionModal.js   # Pawn promotion
```

---

## 🎮 Gameplay Tips

- **Drop mode**: Tap a piece in your reserve to select it (highlighted green), then tap any blue square on the board to drop it.
- **Dropping a pawn**: Select the pawn from your reserve — valid squares are highlighted blue. Pawns cannot be dropped on rank 1 or rank 8.
- **Cancel drop**: Tap the selected piece again in the reserve.
- **Promotion**: When a pawn reaches the last rank, a promotion dialog appears automatically.
- **Check**: The king square turns red when in check.
- **Board tabs**: Use the tabs to switch between Board 1 and Board 2. Your board is marked with ⭐.
- **Board orientation**: Your pieces always appear at the bottom of the board.

---

## 🗂 Additional Documentation

See [DEVELOPMENT.md](DEVELOPMENT.md) for technical documentation including architecture, WebSocket protocol reference, component API, and a guide for adding new features.

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Connection failed" | Make sure server is running and the URL is correct |
| "Slot already taken" | Another player claimed that seat; choose a different one |
| Can't make moves or drops | All 4 players must be joined before the game starts |
| Board not updating | Check WiFi connection; try reconnecting |
| Server crashes | Restart with `npm start`; check Node.js version ≥ 18 |
| Expo app blank | Run `expo start --clear` to clear the cache |

---

## 📜 License

MIT — free to use, modify, and distribute.
