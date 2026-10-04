# Terra Ultimate Mod HUD 🚀🎮

An all-in-one client mod for **Terra** (Hack Club) featuring an adjustable **Speed Multiplier** (up to 2.5x), a live **Speedometer**, and a real-time **Server-Synced RGB Clothes Loop** that broadcasts color cycling to every player in the lobby.

---

## ✨ Features

- **Adjustable Speed Multiplier:** Scale walk and sprint speed from **1.0x to 2.5x** in real-time.
- **Live Speedometer:** Displays true movement velocity in units per second.
- **Server-Synced RGB Clothes:** Intercepts and mutates live Colyseus MessagePack binary frames to broadcast rainbow cycling across the lobby.
- **Integrated HUD:** Docked, non-intrusive control panel in the bottom-right corner with live status toggles.

---

## ⚠️ Setup Requirement: Unlocking Speed in DevTools

Terra locks its speed settings inside private code. To let the script change your speed, you only have to do this **once** in your browser:

### For Chrome, Brave, Edge & Opera
1. Open the game in your browser and press **`F12`** to open Developer Tools.
2. Click the **Sources** tab at the top.
3. In the left file tree, look under `top` > `terra.hackclub.com` > `assets` and click the main script file (it starts with `index-` and ends in `.js`).
4. Click the **`{ }`** icon at the very bottom-left of the code box to format the code so it's readable.
5. Press **`Ctrl + F`** (or `Cmd + F` on Mac) and search for:
   ```text
   PLAYER_SPEED
   ```
6. You will see a block of code that looks like this:
   ```javascript
   const M = {
     PLAYER_SPEED: 3.6,
     PLAYER_SPRINT_SPEED: 6,
     // ...
   };
   ```
7. Find the closing brace `};` at the end of that block. **Right-click the line number** right below it.
8. Click **Add logpoint...**
9. In the box that appears, paste this exact text:
   ```javascript
   window.M = M
   ```
10. Press **Enter**. You will see an orange marker on that line number.
11. Refresh the page (**`F5`**). The slider on the HUD will now control your speed.

---

### For Firefox
1. Open the game and press **`F12`**.
2. Click the **Debugger** tab at the top.
3. Under the file list on the left, find and open the file named `index-....js`.
4. Click the **`{ }`** icon at the bottom of the screen to un-minify the code.
5. Press **`Ctrl + F`** (or `Cmd + F`) and search for:
   ```text
   PLAYER_SPEED
   ```
6. Look for the `const M = { ... };` block.
7. **Right-click the line number** right below that block and select **Add logpoint**.
8. Paste this exact line:
   ```javascript
   (window.M = M, false)
   ```
9. Press **Enter** and refresh the page (**`F5`**).

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
