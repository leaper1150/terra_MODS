// ==UserScript==
// @name         Terra Ultimate Mod HUD (High Speed + Server RGB)
// @namespace    terra.hackclub.ultimate
// @version      5.2
// @match        https://terra.hackclub.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
  const BASE_WALK = 3.6;
  const BASE_SPRINT = 6.0;
  let multiplier = 1.15; // Default +15% boost

  let activeSocket = null;
  let capturedTemplate = null;
  let rgbEnabled = false;
  let rgbInterval = null;

  // 1. Intercept WebSocket to capture connection and color packet template
  const origSend = window.WebSocket.prototype.send;
  window.WebSocket.prototype.send = function(data) {
    activeSocket = this;

    if (data instanceof Uint8Array && data.length > 20) {
      const text = Array.from(data).map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : ".").join("");
      if (text.includes("player.setClothesHue")) {
        capturedTemplate = new Uint8Array(data);
      }
    }
    return origSend.apply(this, arguments);
  };

  // 2. Apply speed changes to window.M
  const applySpeed = () => {
    const targetM = window.M;
    if (!targetM) return;
    try {
      targetM.PLAYER_SPEED = BASE_WALK * multiplier;
      targetM.PLAYER_SPRINT_SPEED = BASE_SPRINT * multiplier;
    } catch (_) {}
  };

  // 3. Create the On-Screen HUD with Expanded Speed Slider (up to 2.5x)
  const createHUD = () => {
    if (document.getElementById('terra-mod-hud')) return;

    const hud = document.createElement('div');
    hud.id = 'terra-mod-hud';
    hud.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      background: rgba(18, 18, 28, 0.95);
      border: 2px solid #5b7cfa;
      border-radius: 12px;
      padding: 12px 16px;
      color: #fff;
      font-family: monospace, sans-serif;
      font-size: 13px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7);
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 220px;
      user-select: none;
    `;

    hud.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #333; padding-bottom:6px;">
        <span style="font-weight:bold; color:#5b7cfa;">Terra Mod HUD</span>
        <span id="hud-status" style="font-size:10px; color:#4ade80; font-weight:bold;">ACTIVE</span>
      </div>

      <!-- Speedometer -->
      <div style="display:flex; justify-content:space-between; font-size:14px; font-weight:bold;">
        <span>Speed:</span>
        <span id="hud-speed" style="color:#4ade80;">0.0 u/s</span>
      </div>

      <!-- Expanded Speed Multiplier Slider (Max 2.5x) -->
      <div style="display:flex; flex-direction:column; gap:4px; border-top:1px solid #333; padding-top:6px;">
        <div style="display:flex; justify-content:space-between; font-size:11px; color:#bbb;">
          <span>Speed Boost:</span>
          <span id="hud-mult-val">+15% (1.15x)</span>
        </div>
        <input id="hud-slider" type="range" min="1.0" max="2.5" step="0.05" value="1.15" style="width:100%; cursor:pointer;">
      </div>

      <!-- Server RGB Toggle Button -->
      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #333; padding-top:6px;">
        <span style="font-size:12px; color:#bbb;">Server RGB:</span>
        <button id="rgb-toggle-btn" style="background:#ef4444; color:#fff; border:none; padding:4px 10px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:11px;">OFF</button>
      </div>
      <div id="rgb-subtext" style="font-size:9px; color:#888; text-align:right;">Change color once to prime</div>
    `;

    document.body.appendChild(hud);

    // Slider controls (now scaling up to 2.5x)
    const slider = document.getElementById('hud-slider');
    const multVal = document.getElementById('hud-mult-val');

    slider.addEventListener('input', (e) => {
      multiplier = parseFloat(e.target.value);
      const pct = Math.round((multiplier - 1) * 100);
      multVal.innerText = `+${pct}% (${multiplier.toFixed(2)}x)`;
      applySpeed();
    });

    // RGB Toggle button logic
    const toggleBtn = document.getElementById('rgb-toggle-btn');
    const subtext = document.getElementById('rgb-subtext');

    toggleBtn.addEventListener('click', () => {
      rgbEnabled = !rgbEnabled;
      if (rgbEnabled) {
        toggleBtn.innerText = "ON";
        toggleBtn.style.background = "#22c55e";
        subtext.innerText = capturedTemplate ? "Broadcasting RGB!" : "Change color once in menu!";
        startRgbLoop();
      } else {
        toggleBtn.innerText = "OFF";
        toggleBtn.style.background = "#ef4444";
        subtext.innerText = "Paused";
        stopRgbLoop();
      }
    });
  };

  // 4. Server-Synced RGB Loop
  const startRgbLoop = () => {
    if (rgbInterval) clearInterval(rgbInterval);
    let hue = 0;

    rgbInterval = setInterval(() => {
      if (!rgbEnabled || !activeSocket || activeSocket.readyState !== WebSocket.OPEN || !capturedTemplate) return;

      hue = (hue + 25) % 360;
      try {
        const packet = new Uint8Array(capturedTemplate);
        packet[packet.length - 1] = Math.floor((hue / 360) * 255);
        activeSocket.send(packet);
        document.getElementById('rgb-subtext').innerText = `Hue: ${hue}° (Active)`;
      } catch (e) {}
    }, 150);
  };

  const stopRgbLoop = () => {
    if (rgbInterval) clearInterval(rgbInterval);
  };

  // 5. Velocity Tracker & Constant Speed Enforcement
  let lastX = null;
  let lastZ = null;
  let lastTime = performance.now();
  let smoothSpeed = 0;

  const trackGameLoop = () => {
    applySpeed();

    const now = performance.now();
    const dt = (now - lastTime) / 1000;

    if (window.__playerPos) {
      const curX = window.__playerPos.x;
      const curZ = window.__playerPos.z;
      if (lastX !== null && dt > 0) {
        const dist = Math.hypot(curX - lastX, curZ - lastZ);
        smoothSpeed = smoothSpeed * 0.75 + (dist / dt) * 0.25;
      }
      lastX = curX;
      lastZ = curZ;
    }
    lastTime = now;

    const speedEl = document.getElementById('hud-speed');
    if (speedEl) {
      speedEl.innerText = `${smoothSpeed.toFixed(1)} u/s`;
    }

    requestAnimationFrame(trackGameLoop);
  };

  // 6. Initialize HUD
  const initInterval = setInterval(() => {
    if (document.body) {
      createHUD();
      requestAnimationFrame(trackGameLoop);
      clearInterval(initInterval);
    }
  }, 200);
})();
