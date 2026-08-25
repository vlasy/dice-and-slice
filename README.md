# 🎲🍕 Dice & Slice — Dungeon Pizzeria

**▶️ Play it: https://vlasy.github.io/dice-and-slice/**

A funny, mobile-first web game inspired by **Slice & Dice** (dice-driven tactics) crossed with
**tavern management sims** — except nobody sane runs a tavern, so you run the only
**pizzeria in a dungeon**.

You roll your staff's dice each turn to prep ingredients and bake pizzas for monster
customers before their patience (and your reputation) runs out. Survive days, hire
weirdos, upgrade faces, and enjoy random nonsense events between shifts.

No frameworks, no build step, no dependencies. Three files: `index.html`, `style.css`, `game.js`.

## ▶️ How to play it

It's a static web app — any of these works:

**On your PC (WSL):**
```bash
cd dice-and-slice
python3 -m http.server 8123
# open http://localhost:8123
```

**On your Pixel 6A (same Wi-Fi as your PC):**

WSL2's `localhost` forwarding only works from Windows itself, so pick one:

- **Simplest:** copy the `dice-and-slice` folder to Windows and serve it there
  (`py -m http.server` in PowerShell), then visit `http://<your-pc-ip>:8123` on the phone.
- **From WSL directly:** forward the port once from an admin PowerShell:
  `netsh interface portproxy add v4tov4 listenport=8123 connectaddress=$(wsl hostname -I)` and open
  the Windows firewall for port 8123.
- **Forever:** drop the folder on any static host (GitHub Pages, Netlify drag-and-drop) — it's
  fully offline-capable and saves progress to the phone's `localStorage`.

**Pro tip:** in Chrome on the Pixel, open the menu → **Add to Home screen**. It then launches
fullscreen like a real app.

## 🎮 Rules in 30 seconds

- Each day has 3–6 waves of monster customers. Each turn: **roll the staff** (you start with
  3 dice), then tap dice to fill orders — dice automatically go to whichever customer needs
  them (tap a customer to focus them first). Bad roll? Free **🎲 Reroll** of unused dice —
  twice a turn on days 1–2.
- Orders are ingredient slots (🫓 dough, 🍅 sauce, 🧀 cheese, 🍖 toppings — **any order**)
  plus one or more 🔥 **bake** slots. Baking when everything's prepped **serves** the pizza for gold.
- 🕐 Patience drops 1 per turn for every waiting customer. When it hits zero they storm out
  and you lose ❤️ reputation. Zero hearts = the Guild shuts you down.
- Special faces: 🔪 any ingredient · 🥖 +patience to everyone · 💰 instant gold ·
  ☕ next face ×2 · 🎲 reroll your other dice. Tap the **📖 SPECIALS tab** on the right
  edge for a live legend, or **long-press any die** to see what its current face does.
- Between days: **hire staff** (each is one more die), **upgrade faces** (● → ●●● = stronger),
  buy equipment, and deal with events like a lich health inspector or a goblin frat booking.

Difficulty ramps: busier waves, bigger orders, shorter fuses, VIP dragons every 5th day.
**Everything autosaves continuously** (after every roll, die, wave, and purchase) — refresh the
page or close the browser mid-wave and **Continue** puts you back exactly where you were, on any
screen: mid-battle, the day summary, an event choice, or the shop. Death deletes the *run* save
(roguelite-style) and grants you a rank.

## 🏛️ Meta progression — the Franchise Ledger

Dying is a business expense. Every finished run banks **⭐ Fame** (days survived ×2 + pizzas served,
+10 bonus for reaching day 10), kept forever in separate storage — open **🏛️ Franchise** from the
title screen (or straight off the game-over screen) to spend it on:

- **Permanent perks** (stack across runs): 🪙 +starting gold · ❤️ +starting hearts ·
  🛋️ +customer patience · ☕ +1 free reroll every turn · 🎓 trained starting faces ·
  🪵 start with the Stone Hearth · 🐉 VIPs pay +50%
- **Unlockable staff** who permanently join the hire pool: 🏴‍☠️ **Captain Crumb** ("A mouse. A
  pirate. A mouse pirate.") and 👵 **Nonna** ("Your grandmother. Also a ghost. Also right.")

Also tracked: lifetime runs, best day, and total pizzas served.

## 🧪 Testing

`test-harness.html` is a self-playing test rig (not part of the game). Run it headless:

```bash
python3 -m http.server 8123 &
google-chrome --headless=new --no-sandbox --virtual-time-budget=20000 \
  --dump-dom "http://localhost:8123/test-harness.html?mode=test"   # 20 logic assertions
google-chrome ... "?mode=stress"      # bot plays 6 full days, must be error-free
google-chrome ... "?mode=layoutcheck" # no horizontal overflow at 412px (Pixel 6A width)
```

## 🗺️ Content map (for tinkering)

All content lives at the top of `game.js`: `STAFF` (10 hireable weirdos), `ITEMS`,
`CUSTT`/`FIRSTN`/`EPITHET` (customer name generator), quote banks, and `EVENTS`
(random between-day dilemmas). Add entries freely — no code changes needed elsewhere.

*A loving parody. Not affiliated with Slice & Dice or any tavern.*
