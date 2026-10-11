(() => {
  const DATA = window.__CHORES__;
  if (!DATA || !DATA.kids) {
    document.body.innerHTML = "<p style='padding:2rem;font-family:system-ui'>Missing chores data. Run build.py.</p>";
    return;
  }

  const STORE_KEY = "chore-reward-chart-v1";
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function startOfWeek(d = new Date()) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - x.getDay()); // Sunday start
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function weekKey(d) {
    const s = startOfWeek(d);
    const y = s.getFullYear();
    const m = String(s.getMonth() + 1).padStart(2, "0");
    const day = String(s.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function fmtWeekRange(wk) {
    const [y, m, d] = wk.split("-").map(Number);
    const start = new Date(y, m - 1, d);
    const end = new Date(y, m - 1, d + 6);
    const opts = { month: "short", day: "numeric" };
    const yOpts = { month: "short", day: "numeric", year: "numeric" };
    return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, yOpts)}`;
  }

  function loadStore() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || "{}") || {};
    } catch {
      return {};
    }
  }

  function saveStore(store) {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }

  let store = loadStore();
  let currentWeek = weekKey(new Date());
  let todayIdx = new Date().getDay();

  // Ensure custom chore labels persist
  if (!store.labels) store.labels = {};
  if (!store.weeks) store.weeks = {};
  if (!store.spent) store.spent = {}; // kidId -> total spent points (lifetime)
  if (!store.redeems) store.redeems = {}; // kidId -> [{perkId, label, cost, at, week}]

  function ensureWeek(wk) {
    if (!store.weeks[wk]) store.weeks[wk] = { checks: {} };
    if (!store.weeks[wk].checks) store.weeks[wk].checks = {};
    return store.weeks[wk];
  }

  function checkKey(kidId, choreId, dayIdx) {
    return `${kidId}:${choreId}:${dayIdx}`;
  }

  function isChecked(wk, kidId, choreId, dayIdx) {
    const w = ensureWeek(wk);
    return !!w.checks[checkKey(kidId, choreId, dayIdx)];
  }

  function setChecked(wk, kidId, choreId, dayIdx, on) {
    const w = ensureWeek(wk);
    const k = checkKey(kidId, choreId, dayIdx);
    if (on) w.checks[k] = true;
    else delete w.checks[k];
    saveStore(store);
  }

  function choreLabel(kid, chore) {
    const key = `${kid.id}:${chore.id}`;
    return store.labels[key] || chore.label;
  }

  function setChoreLabel(kid, chore, label) {
    const key = `${kid.id}:${chore.id}`;
    const trimmed = (label || "").trim();
    if (!trimmed || trimmed === chore.label) delete store.labels[key];
    else store.labels[key] = trimmed;
    saveStore(store);
  }

  function pointsEarned(wk, kid) {
    let pts = 0;
    for (const chore of kid.chores) {
      for (let d = 0; d < 7; d++) {
        if (isChecked(wk, kid.id, chore.id, d)) pts += chore.pts;
      }
    }
    return pts;
  }

  function pointsSpent(kidId) {
    return store.spent[kidId] || 0;
  }

  function pointsAvailable(wk, kid) {
    // Available = earned this week - spent this week (track via redeems filtered by week)
    const earned = pointsEarned(wk, kid);
    const spentThisWeek = (store.redeems[kid.id] || [])
      .filter((r) => r.week === wk)
      .reduce((s, r) => s + r.cost, 0);
    return Math.max(0, earned - spentThisWeek);
  }

  function dayStreak(wk, kid) {
    // Count consecutive days (ending today or last complete day) where at least one daily chore done
    const daily = kid.chores.filter((c) => c.freq === "daily");
    if (!daily.length) return 0;
    let streak = 0;
    const end = currentWeek === wk ? todayIdx : 6;
    for (let d = end; d >= 0; d--) {
      const any = daily.some((c) => isChecked(wk, kid.id, c.id, d));
      if (any) streak++;
      else break;
    }
    return streak;
  }

  function perfectDays(wk, kid) {
    const daily = kid.chores.filter((c) => c.freq === "daily");
    if (!daily.length) return 0;
    let n = 0;
    for (let d = 0; d < 7; d++) {
      if (daily.every((c) => isChecked(wk, kid.id, c.id, d))) n++;
    }
    return n;
  }

  function kidById(id) {
    return DATA.kids.find((k) => k.id === id);
  }

  function renderBoard(kidId) {
    const kid = kidById(kidId);
    const section = $(`#view-${kidId}`);
    if (!kid || !section) return;
    const cls = kid.id;
    const earned = pointsEarned(currentWeek, kid);
    const avail = pointsAvailable(currentWeek, kid);
    const streak = dayStreak(currentWeek, kid);
    const perfect = perfectDays(currentWeek, kid);
    const stickers = DATA.streakStickers || [];

    const dayHeads = DAYS.map((d, i) => {
      const today = currentWeek === weekKey(new Date()) && i === todayIdx;
      return `<th class="${today ? "today-col" : ""}" title="${DAY_FULL[i]}">${d}</th>`;
    }).join("");

    const rows = kid.chores
      .map((chore) => {
        const cells = DAYS.map((_, i) => {
          const on = isChecked(currentWeek, kid.id, chore.id, i);
          const today = currentWeek === weekKey(new Date()) && i === todayIdx;
          return `<td><button type="button" class="check ${on ? "on" : ""} ${today ? "today-col" : ""}" data-check="${kid.id}|${chore.id}|${i}" aria-pressed="${on}" aria-label="${choreLabel(kid, chore)} ${DAYS[i]}"></button></td>`;
        }).join("");
        return `<tr>
          <td class="chore-col">
            <input class="chore-name" data-label="${kid.id}|${chore.id}" value="${escapeAttr(choreLabel(kid, chore))}" title="Click to edit">
            <span class="freq">${chore.freq}</span>
          </td>
          <td class="pts-col">${chore.pts}</td>
          ${cells}
        </tr>`;
      })
      .join("");

    const stickerHtml = stickers
      .map((s) => {
        const on = streak >= s.days;
        return `<span class="sticker ${on ? "on" : ""}" title="${s.label}">${s.emoji} ${s.label}</span>`;
      })
      .join("");

    const perksHtml = (DATA.perks || [])
      .map((p) => {
        const can = avail >= p.cost;
        return `<div class="perk">
          <div class="perk-top">
            <span class="perk-emoji">${p.emoji}</span>
            <span class="perk-label">${escapeHtml(p.label)}</span>
            <span class="perk-cost">${p.cost} pts</span>
          </div>
          <button type="button" class="btn sm ${can ? "primary" : ""}" data-redeem="${kid.id}|${p.id}" ${can ? "" : "disabled"}>Redeem</button>
        </div>`;
      })
      .join("");

    const redeems = (store.redeems[kid.id] || [])
      .filter((r) => r.week === currentWeek)
      .map((r) => `<li>${escapeHtml(r.emoji || "")} ${escapeHtml(r.label)} (−${r.cost})</li>`)
      .join("");

    section.innerHTML = `
      <div class="kid-board">
        <div class="kid-hero">
          <div class="panel ${cls}">
            <div class="panel-head">
              <div>
                <p class="eyebrow">This week's board</p>
                <h2>${kid.emoji} ${escapeHtml(kid.name)} <span style="font-weight:600;color:var(--muted);font-size:0.9rem">(${kid.short} · ${kid.age})</span></h2>
              </div>
              <div class="week-nav">
                <button type="button" class="btn ghost sm" data-week="-1" aria-label="Previous week">←</button>
                <span class="week-label">${fmtWeekRange(currentWeek)}</span>
                <button type="button" class="btn ghost sm" data-week="1" aria-label="Next week">→</button>
                <button type="button" class="btn ghost sm" data-week="0" title="Jump to this week">Today</button>
              </div>
            </div>
            <div class="stat-row">
              <div class="stat"><span class="n">${earned}</span><span class="l">Earned</span></div>
              <div class="stat"><span class="n">${avail}</span><span class="l">Available</span></div>
              <div class="stat"><span class="n">${streak}</span><span class="l">Day streak</span></div>
              <div class="stat"><span class="n">${perfect}</span><span class="l">Perfect days</span></div>
            </div>
            <div class="streak-row">${stickerHtml || '<span class="hint">Complete daily chores to unlock stickers</span>'}</div>
          </div>
          <div class="panel">
            <div class="panel-head">
              <div>
                <p class="eyebrow">How it works</p>
                <h3>Check → earn → redeem</h3>
              </div>
            </div>
            <p class="hint">Tap a box each day. Points add up this week. Spend them on perks (parent OK). Edit chore names anytime — they stick on this device.</p>
            <p class="hint" style="margin-top:0.6rem">Weekly chores only need one check any day. Daily ones count toward streaks.</p>
          </div>
        </div>

        <div class="panel ${cls}">
          <div class="panel-head">
            <h3>Weekly grid</h3>
            <p class="hint">Pts shown per check · ${kid.chores.length} chores</p>
          </div>
          <div class="grid-wrap">
            <table class="chore-grid" aria-label="${kid.short} chore grid">
              <thead>
                <tr>
                  <th class="chore-col">Chore</th>
                  <th class="pts-col">Pts</th>
                  ${dayHeads}
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <div>
              <p class="eyebrow">Points → perks</p>
              <h3>Reward menu</h3>
            </div>
            <span class="pill soft">${avail} pts free</span>
          </div>
          <div class="perks-grid">${perksHtml}</div>
          <div class="redeemed">
            <strong>Redeemed this week</strong>
            ${redeems ? `<ul>${redeems}</ul>` : `<p class="hint">Nothing redeemed yet — keep checking boxes!</p>`}
          </div>
        </div>
      </div>
    `;
  }

  function renderPrint() {
    const both = $("#printBoth")?.checked !== false;
    const kids = both ? DATA.kids : [kidById(location.hash.replace("#", "") === "vic" ? "vic" : "char")].filter(Boolean);
    const wrap = $("#printSheets");
    if (!wrap) return;

    wrap.innerHTML = kids
      .map((kid) => {
        const dayHeads = DAYS.map((d) => `<th>${d}</th>`).join("");
        const rows = kid.chores
          .map((chore) => {
            const cells = DAYS.map((_, i) => {
              const on = isChecked(currentWeek, kid.id, chore.id, i);
              return `<td><span class="check ${on ? "on" : ""}"></span></td>`;
            }).join("");
            return `<tr>
              <td class="chore-col"><strong>${escapeHtml(choreLabel(kid, chore))}</strong> <span class="freq">${chore.freq}</span></td>
              <td class="pts-col">${chore.pts}</td>
              ${cells}
            </tr>`;
          })
          .join("");

        const perkChips = (DATA.perks || [])
          .slice(0, 8)
          .map((p) => `<span class="sheet-perk">${p.emoji} ${escapeHtml(p.label)} · ${p.cost}pts</span>`)
          .join("");

        const earned = pointsEarned(currentWeek, kid);
        const avail = pointsAvailable(currentWeek, kid);

        return `<article class="sheet ${kid.id}">
          <div class="sheet-head">
            <h2>${kid.emoji} ${escapeHtml(kid.name)}'s chore chart</h2>
            <div class="week-label">${fmtWeekRange(currentWeek)}</div>
          </div>
          <table class="chore-grid">
            <thead><tr><th class="chore-col">Chore</th><th class="pts-col">Pts</th>${dayHeads}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="sheet-perks">${perkChips}</div>
          <div class="sheet-foot">
            <span>Earned: ${earned} · Available: ${avail}</span>
            <span>Boyd fridge · TokenMax</span>
          </div>
        </article>`;
      })
      .join("");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  function updateChrome() {
    const pill = $("#weekPill");
    if (pill) pill.textContent = fmtWeekRange(currentWeek);
    const foot = $("#footPts");
    if (foot) {
      const bits = DATA.kids.map((k) => {
        const a = pointsAvailable(currentWeek, k);
        return `${k.short}: ${a} pts`;
      });
      foot.textContent = bits.join(" · ");
    }
  }

  function renderAll() {
    renderBoard("char");
    renderBoard("vic");
    renderPrint();
    updateChrome();
  }

  function shiftWeek(delta) {
    if (delta === 0) {
      currentWeek = weekKey(new Date());
    } else {
      const [y, m, d] = currentWeek.split("-").map(Number);
      const s = new Date(y, m - 1, d + delta * 7);
      currentWeek = weekKey(s);
    }
    renderAll();
  }

  function redeem(kidId, perkId) {
    const kid = kidById(kidId);
    const perk = (DATA.perks || []).find((p) => p.id === perkId);
    if (!kid || !perk) return;
    const avail = pointsAvailable(currentWeek, kid);
    if (avail < perk.cost) return;
    if (!store.redeems[kidId]) store.redeems[kidId] = [];
    store.redeems[kidId].push({
      perkId: perk.id,
      label: perk.label,
      emoji: perk.emoji,
      cost: perk.cost,
      at: new Date().toISOString(),
      week: currentWeek,
    });
    store.spent[kidId] = (store.spent[kidId] || 0) + perk.cost;
    saveStore(store);
    renderAll();
  }

  // Navigation
  const VIEWS = ["char", "vic", "print", "about"];

  function showView(name) {
    if (!VIEWS.includes(name)) name = "char";
    $$(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
    $$(".tab").forEach((t) => {
      const on = t.dataset.view === name;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    if (name === "print") renderPrint();
    const hash = `#${name}`;
    if (location.hash !== hash) history.replaceState(null, "", hash);
    document.body.classList.toggle("print-mode", name === "print");
  }

  function routeFromHash() {
    const h = (location.hash || "#char").replace("#", "").toLowerCase();
    showView(VIEWS.includes(h) ? h : "char");
  }

  // Events
  document.addEventListener("click", (e) => {
    const tab = e.target.closest(".tab");
    if (tab) {
      showView(tab.dataset.view);
      return;
    }
    const goto = e.target.closest("[data-goto]");
    if (goto) {
      showView(goto.dataset.goto);
      return;
    }
    const chk = e.target.closest("[data-check]");
    if (chk) {
      const [kidId, choreId, day] = chk.dataset.check.split("|");
      const on = !chk.classList.contains("on");
      setChecked(currentWeek, kidId, choreId, Number(day), on);
      renderAll();
      return;
    }
    const weekBtn = e.target.closest("[data-week]");
    if (weekBtn) {
      shiftWeek(Number(weekBtn.dataset.week));
      return;
    }
    const red = e.target.closest("[data-redeem]");
    if (red) {
      const [kidId, perkId] = red.dataset.redeem.split("|");
      redeem(kidId, perkId);
      return;
    }
  });

  document.addEventListener("change", (e) => {
    if (e.target.id === "printBoth") renderPrint();
    const lab = e.target.closest("[data-label]");
    if (lab) {
      const [kidId, choreId] = lab.dataset.label.split("|");
      const kid = kidById(kidId);
      const chore = kid?.chores.find((c) => c.id === choreId);
      if (kid && chore) {
        setChoreLabel(kid, chore, lab.value);
        renderPrint();
      }
    }
  });

  document.addEventListener("keydown", (e) => {
    const lab = e.target.closest("[data-label]");
    if (lab && e.key === "Enter") {
      e.preventDefault();
      lab.blur();
    }
  });

  $("#btnPrint")?.addEventListener("click", () => {
    showView("print");
    setTimeout(() => window.print(), 120);
  });
  $("#btnDoPrint")?.addEventListener("click", () => window.print());

  $("#btnExport")?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `chore-reward-save-${currentWeek}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    const hint = $("#aboutHint");
    if (hint) hint.textContent = "Save JSON downloaded.";
  });

  $("#btnReset")?.addEventListener("click", () => {
    if (!confirm(`Clear checks & redeems for week ${fmtWeekRange(currentWeek)}?`)) return;
    delete store.weeks[currentWeek];
    for (const kid of DATA.kids) {
      if (store.redeems[kid.id]) {
        store.redeems[kid.id] = store.redeems[kid.id].filter((r) => r.week !== currentWeek);
      }
    }
    saveStore(store);
    renderAll();
    const hint = $("#aboutHint");
    if (hint) hint.textContent = "This week reset.";
  });

  $("#btnResetAll")?.addEventListener("click", () => {
    if (!confirm("Reset ALL chore chart data on this device?")) return;
    store = { labels: {}, weeks: {}, spent: {}, redeems: {} };
    saveStore(store);
    renderAll();
    const hint = $("#aboutHint");
    if (hint) hint.textContent = "All data cleared.";
  });

  window.addEventListener("hashchange", routeFromHash);

  // Boot
  ensureWeek(currentWeek);
  renderAll();
  routeFromHash();
})();
