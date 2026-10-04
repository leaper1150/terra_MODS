# Terra Ultimate Mod HUD 🚀🎮

An all-in-one client mod for **Terra** (Hack Club) featuring an adjustable **Speed Multiplier** (up to 2.5x), a live **Speedometer**, and a real-time **Server-Synced RGB Clothes Loop** that broadcasts color cycling to every player in the lobby.

Created by **Yousuf Yaghmour**.

---

## ✨ Features

- **Adjustable Speed Multiplier:** Scale walk and sprint speed from **1.0x to 2.5x** in real-time.
- **Live Speedometer:** Displays true movement velocity in units per second.
- **Server-Synced RGB Clothes:** Intercepts and mutates live Colyseus MessagePack binary frames to broadcast rainbow cycling across the lobby.
- **Integrated HUD:** Docked, non-intrusive control panel in the bottom-right corner with live status toggles.

---

## ⚠️ Essential Requirement: Unlocking Player Speed

Because Terra bundles its constants (`PLAYER_SPEED` and `PLAYER_SPRINT_SPEED`) inside a closed JavaScript module scope, the Tampermonkey script **cannot** modify speed variables until that object is exposed to the global `window` scope.

You must expose `M` using your browser's Developer Tools debugger once. Choose your browser instructions below:

---

### Method A: Mozilla Firefox (Recommended)

1. Open [terra.hackclub.com](https://terra.hackclub.com/) and press **`F12`** (or `Ctrl + Shift + I` / `Cmd + Option + I`).
2. Navigate to the **Debugger** tab.
3. Press **`Ctrl + P`** (or `Cmd + P` on macOS) to open the file search bar, type `index-`, and hit **Enter** to open the main bundle script (e.g., `index-cTSz2Ld8.js`).
4. Click the **`{}` (Pretty-print)** icon at the bottom-left of the script view to format minified code.
5. Press **`Ctrl + F`** (or `Cmd + F`) and search for:
   ```text
   PLAYER_SPEED:
