# Terra Ultimate Mod HUD 🚀🎮

An all-in-one client mod for **Terra** (Hack Club) featuring an adjustable **Speed Multiplier** (up to 2.5x), a live **Speedometer**, and a real-time **Server-Synced RGB Clothes Loop** that broadcasts color cycling to every player in the lobby.



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
   ```
6. Locate the object definition block (usually defined as `const M = { PLAYER_SPEED: 3.6, ... }` or a similar variable name).
7. Right-click the line number immediately **after** that definition and select **Add logpoint** (or **Conditional Breakpoint**).
8. Enter the following expression as the log message:
   ```javascript
   (window.M = M, false)
   ```
   *(The `, false` ensures the debugger exposes `M` to the global `window` object on load without pausing the game).*
9. Refresh the page (**`F5`**). Check the **Console** tab by typing `window.M` — if it returns an object, speed modifications are fully unlocked.

---

### Method B: Google Chrome, Brave & Chromium Browsers

1. Open [terra.hackclub.com](https://terra.hackclub.com/) and press **`F12`** (or `Ctrl + Shift + I` / `Cmd + Option + I`).
2. Go to the **Sources** tab.
3. Press **`Ctrl + P`** (or `Cmd + P` on macOS), type `index-`, and open the primary game JavaScript file.
4. Click the **`{}` (Pretty-print)** button in the lower toolbar if the file is minified.
5. Press **`Ctrl + F`** (or `Cmd + F`) and search for:
   ```text
   PLAYER_SPEED:
   ```
6. Identify the variable name assigned to the constants object (e.g., `const M = { ... }`).
7. Right-click the line number right below the object declaration and select **Add logpoint...**.
8. Paste:
   ```javascript
   window.M = M
   ```
9. Press **Enter** to save the logpoint (marked with an orange badge).
10. Refresh the page (**`F5`**). Verify by typing `window.M` into the **Console** tab.

---

### Method C: Apple Safari

1. Open **Safari > Settings > Advanced** and ensure **"Show features for web developers"** is enabled.
2. Go to [terra.hackclub.com](https://terra.hackclub.com/) and open Web Inspector with **`Option + Cmd + I`**.
3. Select the **Sources** tab.
4. Locate the main game script under the domain's script assets.
5. Search for `PLAYER_SPEED:` using **`Cmd + F`**.
6. Right-click the line number immediately following the constant dictionary and select **Add Conditional Breakpoint**.
7. Enter:
   ```javascript
   (window.M = M) && false
   ```
8. Reload the page (**`Cmd + R`**).

---

## 📦 Tampermonkey Userscript Installation

1. Install the [Tampermonkey](https://www.tampermonkey.net/) browser extension.
2. Open your Tampermonkey **Dashboard** and select the **`+` (Create a new script)** tab.
3. Replace the template contents with the code inside `terra-mod-hud.user.js` from this repository.
4. Press **`Ctrl + S`** (or `Cmd + S`) to save.
5. Reload Terra. The **Terra Mod HUD** panel will dock on the bottom-right of your screen.

---

## 🕹️ Controls & In-Game Usage

### 1. Speed Adjustment
- Move the **Speed Boost** slider on the HUD to scale movement velocity up to **2.50x**.
- The **Speed** readout tracks actual coordinates per second via continuous delta calculations.

### 2. Server-Synced RGB Clothes
Colyseus networks character color data via binary **MessagePack** packets on the `player.setClothesHue` channel:
1. Open the character customization menu in Terra.
2. Change your clothing color **once** manually.
3. The HUD sniffer captures the authorized binary packet footprint automatically.
4. Click the **Server RGB** button to switch from **OFF** to **ON**.
5. Your clothing will cycle through an RGB spectrum that broadcasts to all players on the server.

---

## 🛠️ Architecture Details

- **Binary Frame Interception:** Wraps `WebSocket.prototype.send` without breaking protocol handshakes, isolating the `0x0d` Colyseus message identifier for `player.setClothesHue`.
- **Packet Injection:** Mutates the terminating hue byte across regular 150 ms intervals to avoid triggering server-side rate limiters while maintaining animation continuity.
- **Delta Velocity Calculation:** Calculates instantaneous speed via Pythagorean displacement over frame delta time:
  
  $$\text{Speed} = \frac{\sqrt{\Delta x^2 + \Delta z^2}}{\Delta t}$$

---

## 📜 License

Distributed under the [MIT License](LICENSE).
