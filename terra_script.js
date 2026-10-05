// ==UserScript==
// @name         TERRA MOD
// @namespace    terra.hackclub.mod
// @version      1.0
// @description  A clean mod suite for Terra: Speed, Noclip, Phasing, RGB Flow, Jitter, and Staff Badge.
// @match        https://terra.hackclub.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  // --- Configuration Defaults ---
  window.__speedMultiplier = 1.35;
  window.__noclip = false;
  let phaseDistance = 3.5;

  let activeSocket = null;
  let capturedHueTemplate = null;

  // RGB State Variables
  let rgbMode = "off"; // Options: "off" | "smooth" | "strobe"
  let hueFloat = 0.0;
  let lastPacketSentTime = 0;
  const SEND_INTERVAL_MS = 33; // ~30 Hz update tick

  // Jitter State Variables
  let jitterActive = false;
  let jitterInterval = null;

  const pressedKeys = {};
  window.addEventListener('keydown', (e) => { pressedKeys[e.key.toLowerCase()] = true; });
  window.addEventListener('keyup', (e) => { pressedKeys[e.key.toLowerCase()] = false; });

  // --- 1. WebSocket Interceptor ---
  const origSend = window.WebSocket.prototype.send;
  window.WebSocket.prototype.send = function(data) {
    activeSocket = this;
    if (data instanceof Uint8Array && data.length > 10 && !capturedHueTemplate) {
      const text = Array.from(data).map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : ".").join("");
      if (text.includes("player.setClothesHue")) {
        capturedHueTemplate = new Uint8Array(data);
        const sub = document.getElementById('rgb-subtext');
        if (sub && rgbMode === "off") {
          sub.innerText = "Hue locked & ready!";
          sub.style.color = "#4ade80";
        }
      }
    }
    return origSend.apply(this, arguments);
  };

  // Helper to dispatch local chat text
  function sendLocalChat(text) {
    if (!text || !activeSocket || activeSocket.readyState !== WebSocket.OPEN) return;
    const r = window.__room || window.__hatDiagnostics?.room;
    if (r && r.send) {
      r.send("chat.send", { channel: "local", text: text });
    } else {
      console.warn("Direct room reference not found.");
    }
  }

  // --- 2. Unicode / Fancy Text Formatters ---
  const UnicodeConverters = {
    bold: (str) => str.split('').map(c => {
      const code = c.charCodeAt(0);
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D400 + (code - 65));
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D41A + (code - 97));
      if (code >= 48 && code <= 57) return String.fromCodePoint(0x1D7CE + (code - 48));
      return c;
    }).join(''),
    fullwidth: (str) => str.split('').map(c => {
      const code = c.charCodeAt(0);
      if (code >= 33 && code <= 126) return String.fromCharCode(code + 65248);
      return c;
    }).join(''),
    squared: (str) => str.split('').map(c => {
      const code = c.toUpperCase().charCodeAt(0);
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1F130 + (code - 65));
      return c;
    }).join('')
  };

  // --- 3. Dynamic Speed Engine Hook ---
  function updateSpeedEngine() {
    const target = window.ot || window.M;
    if (target) {
      if (!target._origWalk) {
        target._origWalk = target.PLAYER_SPEED || 3.6;
        target._origSprint = target.PLAYER_SPRINT_SPEED || 6.0;
      }
      target.PLAYER_SPEED = target._origWalk * window.__speedMultiplier;
      target.PLAYER_SPRINT_SPEED = target._origSprint * window.__speedMultiplier;
    }
  }

  // --- 4. Directional Phasing Engine ---
  function executePhase() {
    const p = window.__player;
    if (!p) {
      const sub = document.getElementById('phase-subtext');
      if (sub) { sub.innerText = "Tap W/A/S/D once first!"; sub.style.color = "#ef4444"; }
      return;
    }

    let dx = 0, dz = 0;
    if (pressedKeys['w'] || pressedKeys['arrowup']) dz -= 1;
    if (pressedKeys['s'] || pressedKeys['arrowdown']) dz += 1;
    if (pressedKeys['a'] || pressedKeys['arrowleft']) dx -= 1;
    if (pressedKeys['d'] || pressedKeys['arrowright']) dx += 1;
    if (dx === 0 && dz === 0) dz = -1;

    const len = Math.hypot(dx, dz);
    const ndx = dx / len;
    const ndz = dz / len;

    const steps = 4;
    const stepDist = phaseDistance / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      p.x += ndx * stepDist;
      p.z += ndz * stepDist;
      if (p.physicsState) {
        p.physicsState.x += ndx * stepDist;
        p.physicsState.z += ndz * stepDist;
      }
      currentStep++;
      if (currentStep >= steps) clearInterval(interval);
    }, 16);
  }

  // --- 5. Sprite Facing Micro-Jitter ---
  function toggleJitter() {
    jitterActive = !jitterActive;
    const btn = document.getElementById('jitter-btn');
    if (btn) {
      btn.innerText = jitterActive ? "ON" : "OFF";
      btn.style.background = jitterActive ? "#22c55e" : "#334155";
    }

    if (jitterActive) {
      let flip = false;
      jitterInterval = setInterval(() => {
        const p = window.__player;
        if (p && p.physicsState) {
          flip = !flip;
          const delta = flip ? 0.002 : -0.002;
          p.physicsState.x += delta;
          p.x += delta;
        }
      }, 33);
    } else {
      clearInterval(jitterInterval);
      jitterInterval = null;
    }
  }

  // --- 6. Custom Client-Side Staff Badge ---
  function applyHackBadge() {
    const p = window.__player;
    if (!p || !p.label) return;

    const nameText = p.displayName || p.username || "You";
    const badgeText = "hack";

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    ctx.font = "bold 24px Arial";
    const nameWidth = ctx.measureText(nameText).width;
    ctx.font = "bold 16px Arial";
    const badgeWidth = ctx.measureText(badgeText).width + 16;
    const badgeHeight = 24;

    const totalWidth = nameWidth + badgeWidth + 40;
    canvas.width = totalWidth;
    canvas.height = 42;

    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.beginPath();
    ctx.roundRect(0, 3, totalWidth, 36, 8);
    ctx.fill();

    ctx.fillStyle = "#ec3750";
    ctx.beginPath();
    ctx.roundRect(8, 9, badgeWidth, badgeHeight, 5);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(badgeText, 8 + (badgeWidth / 2), 9 + (badgeHeight / 2) + 1);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(nameText, 8 + badgeWidth + 10, 21);

    const texture = new (p.label.material.map ? p.label.material.map.constructor : Object)(canvas);
    texture.generateMipmaps = false;
    texture.minFilter = 1003;
    texture.needsUpdate = true;

    p.label.material.map = texture;
    p.label.material.needsUpdate = true;
    p.label.scale.set(totalWidth / 128, 0.35, 1);
  }

  // --- 7. Unicode & Emoji Chat Helper ---
  function openChatPrompt() {
    const raw = prompt("Enter text to format & send:");
    if (!raw) return;

    const style = prompt("Choose format:\n1: Bold (𝗕𝗢𝗟𝗗)\n2: Aesthetic (ＡＥＳＴＨＥＴＩＣ)\n3: Squared (🅂🅀🅄🄰🅁🄴🄳)\n4: Add Hack Club emojis", "1");
    let result = raw;

    if (style === "1") result = UnicodeConverters.bold(raw);
    else if (style === "2") result = UnicodeConverters.fullwidth(raw);
    else if (style === "3") result = UnicodeConverters.squared(raw);
    else if (style === "4") result = `:hackclub: ${raw} :fire:`;

    navigator.clipboard?.writeText(result);
    sendLocalChat(result);
    alert(`Formatted & copied:\n\n${result}`);
  }

  // --- 8. Floating User HUD ---
  const createHUD = () => {
    if (document.getElementById('terra-mod-hud')) return;

    const hud = document.createElement('div');
    hud.id = 'terra-mod-hud';
    hud.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; z-index: 999999;
      background: rgba(13, 17, 23, 0.94); border: 1.5px solid #38bdf8;
      border-radius: 10px; padding: 10px 14px; color: #f8fafc;
      font-family: monospace; font-size: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.7);
      display: flex; flex-direction: column; gap: 7px; width: 230px; user-select: none;
    `;

    hud.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #334155; padding-bottom:4px;">
        <span style="font-weight:bold; color:#38bdf8;">TERRA MOD</span>
        <span id="hud-status" style="font-size:10px; color:#facc15; font-weight:bold;">STANDBY</span>
      </div>

      <div style="display:flex; flex-direction:column; gap:2px;">
        <div style="display:flex; justify-content:space-between; font-size:11px; color:#cbd5e1;">
          <span>Speed [T]:</span>
          <span id="hud-mult-val">${window.__speedMultiplier.toFixed(2)}x</span>
        </div>
        <input id="hud-speed-slider" type="range" min="1.0" max="3.0" step="0.05" value="${window.__speedMultiplier}" style="width:100%; cursor:pointer;">
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #334155; padding-top:4px;">
        <span style="font-size:11px; color:#cbd5e1;">Noclip [C]:</span>
        <button id="noclip-btn" style="background:#334155; color:#fff; border:none; padding:2px 8px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:10px;">OFF</button>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:11px; color:#cbd5e1;">Phase [V]:</span>
        <button id="phase-btn" style="background:#8b5cf6; color:#fff; border:none; padding:2px 8px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:10px;">PHASE</button>
      </div>
      <div id="phase-subtext" style="font-size:9px; color:#64748b; text-align:right;">Press [V] to phase</div>

      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #334155; padding-top:4px;">
        <span style="font-size:11px; color:#cbd5e1;">Jitter Spin [J]:</span>
        <button id="jitter-btn" style="background:#334155; color:#fff; border:none; padding:2px 8px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:10px;">OFF</button>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #334155; padding-top:4px;">
        <span style="font-size:11px; color:#cbd5e1;">RGB Flow [R]:</span>
        <button id="rgb-toggle-btn" style="background:#ef4444; color:#fff; border:none; padding:2px 8px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:10px;">OFF</button>
      </div>
      <div id="rgb-subtext" style="font-size:9px; color:#64748b; text-align:right;">Slide hue once in settings</div>

      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #334155; padding-top:4px;">
        <button id="chat-format-btn" style="background:#0284c7; color:#fff; border:none; padding:3px 8px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:10px; width:48%;">UNICODE [Y]</button>
        <button id="badge-btn" style="background:#ec3750; color:#fff; border:none; padding:3px 8px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:10px; width:48%;">STAFF BADGE</button>
      </div>
    `;

    document.body.appendChild(hud);

    document.getElementById('hud-speed-slider').addEventListener('input', (e) => {
      window.__speedMultiplier = parseFloat(e.target.value);
      document.getElementById('hud-mult-val').innerText = `${window.__speedMultiplier.toFixed(2)}x`;
      updateSpeedEngine();
    });

    const noclipBtn = document.getElementById('noclip-btn');
    const toggleNoclip = () => {
      window.__noclip = !window.__noclip;
      noclipBtn.innerText = window.__noclip ? "ON" : "OFF";
      noclipBtn.style.background = window.__noclip ? "#22c55e" : "#334155";
    };
    noclipBtn.addEventListener('click', toggleNoclip);

    document.getElementById('phase-btn').addEventListener('click', executePhase);
    document.getElementById('jitter-btn').addEventListener('click', toggleJitter);

    const rgbBtn = document.getElementById('rgb-toggle-btn');
    const cycleRgbMode = () => {
      if (rgbMode === "off") rgbMode = "smooth";
      else if (rgbMode === "smooth") rgbMode = "strobe";
      else rgbMode = "off";

      rgbBtn.innerText = rgbMode.toUpperCase();
      rgbBtn.style.background = rgbMode === "strobe" ? "#f59e0b" : rgbMode === "smooth" ? "#22c55e" : "#ef4444";
      const sub = document.getElementById('rgb-subtext');
      if (sub) {
        sub.innerText = rgbMode === "strobe" ? "Strobe Mode active!" : rgbMode === "smooth" ? "Smooth Flow active!" : "Paused";
      }
    };
    rgbBtn.addEventListener('click', cycleRgbMode);

    document.getElementById('badge-btn').addEventListener('click', applyHackBadge);
    document.getElementById('chat-format-btn').addEventListener('click', openChatPrompt);

    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      if (k === 'h') hud.style.display = hud.style.display === 'none' ? 'flex' : 'none';
      if (k === 'c') toggleNoclip();
      if (k === 'v') executePhase();
      if (k === 'j') toggleJitter();
      if (k === 'r') cycleRgbMode();
      if (k === 'y') openChatPrompt();
      if (k === 't') {
        const presets = [1.0, 1.35, 1.75, 2.25];
        const next = presets.find(p => p > window.__speedMultiplier + 0.05) || presets[0];
        window.__speedMultiplier = next;
        document.getElementById('hud-speed-slider').value = next;
        document.getElementById('hud-mult-val').innerText = `${next.toFixed(2)}x`;
        updateSpeedEngine();
      }
    });
  };

  // --- 9. Main Background Loop ---
  let lastTime = performance.now();
  const engineLoop = (now) => {
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    updateSpeedEngine();

    const statusEl = document.getElementById('hud-status');
    if (statusEl) {
      if (window.__player) {
        statusEl.innerText = "ACTIVE";
        statusEl.style.color = "#4ade80";
      } else {
        statusEl.innerText = "STANDBY";
        statusEl.style.color = "#facc15";
      }
    }

    if (rgbMode !== "off" && activeSocket && activeSocket.readyState === WebSocket.OPEN && capturedHueTemplate) {
      if (rgbMode === "strobe") {
        hueFloat = (hueFloat + 0.33) % 1.0;
      } else {
        hueFloat = (hueFloat + (dt / 3.0)) % 1.0;
      }

      if (now - lastPacketSentTime >= SEND_INTERVAL_MS) {
        lastPacketSentTime = now;
        try {
          const packet = new Uint8Array(capturedHueTemplate);
          packet[packet.length - 1] = Math.round(hueFloat * 255);
          activeSocket.send(packet);
        } catch (_) {}
      }
    }

    requestAnimationFrame(engineLoop);
  };

  const initTimer = setInterval(() => {
    if (document.body) {
      createHUD();
      requestAnimationFrame(engineLoop);
      clearInterval(initTimer);
    }
  }, 200);
})();
