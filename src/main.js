// ===== main.js（整個覆蓋貼上即可） =====

const btn = document.getElementById("btnCalc");
const table = document.getElementById("resultTable");
const diffTable = document.getElementById("diffTable");

// =========================
// 可調參數（對齊 AHK）
// =========================
const TRY_ALL_ORDERS = true;
const MAX_ORDER_TRIES = 10;
const REQUIRE_PERFECT = false;
const PICK_TIMELIMIT_MS = 300;
const MAX_CANDS_PER_TYPE = 600;

const ALLOW_SOFT = true;
const SLICE_SHIFT_STEP = 120;
const SLICE_TRIES = 4;

// =========================
// UI helpers（✅修正：桌機不切頁、手機切頁）
// =========================
// =========================
// UI helpers（✅桌機不切頁、手機切頁）
// =========================
function isDesktop() {
  return window.matchMedia("(min-width: 1024px)").matches;
}

// 桌機：永遠兩邊都顯示
function ensureDesktopTwoPane() {
  const pageInput = document.getElementById("pageInput");
  const pageResult = document.getElementById("pageResult");
  if (!pageInput || !pageResult) return;

  if (isDesktop()) {
    pageInput.classList.remove("hidden");
    pageResult.classList.remove("hidden");
  }
}

// 切頁：手機才切；桌機不切（右欄直接顯示）
function showResult() {
  const a = document.getElementById("pageInput");
  const b = document.getElementById("pageResult");
  if (!a || !b) return;

  if (isDesktop()) {
    a.classList.remove("hidden");
    b.classList.remove("hidden");
    return;
  }

  a.classList.add("hidden");
  b.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function back() {
  const a = document.getElementById("pageInput");
  const b = document.getElementById("pageResult");
  if (!a || !b) return;

  if (isDesktop()) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  b.classList.add("hidden");
  a.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// 讓 HTML 的 onclick="back()" 可用
window.back = back;

// 只在載入 & 變成桌機尺寸時，強制兩欄顯示（不去干擾手機切頁）
window.addEventListener("DOMContentLoaded", ensureDesktopTwoPane);
window.addEventListener("resize", ensureDesktopTwoPane);


// =========================
// 小工具
// =========================
function targetDByStage(stageIdx) {
  if (stageIdx === 1) return 48;
  if (stageIdx === 2) return 73;
  if (stageIdx === 3) return 106;
  if (stageIdx === 4) return 173;
  if (stageIdx === 5) return 138;
  if (stageIdx === 6) return 173; // 10階含第二頁：10階算法本體
  return 0;
}

function clearTable() {
  if (!table) return;
  while (table.rows.length > 1) table.deleteRow(1);
}
function clearDiffTable() {
  if (!diffTable) return;
  while (diffTable.rows.length > 1) diffTable.deleteRow(1);
}

// ====== 清空結果 ======
function clearResultUI() {
  clearTable();
  clearDiffTable();

  const saveBtn = document.getElementById("btnSaveImage");
  if (saveBtn) saveBtn.style.display = "none";
}

function addRow(seq, type, stageText, x, y, c, d, w = "", d2 = "") {
  const isPage2 = Number(document.getElementById("stage").value) === 6;
  const row = document.createElement("tr");

  if (type.includes("輔助")) row.classList.add("row_sup");
  else if (type.includes("控制")) row.classList.add("row_ctl");
  else if (type.includes("敏攻")) row.classList.add("row_agi");
  else if (type.includes("強攻")) row.classList.add("row_str");

  row.innerHTML = `
    <td>${seq}</td>
    <td>${type}</td>
    ${isPage2 ? `<td>${stageText}</td>` : ""}
    <td>${x}</td>
    <td>${y}</td>
    <td>${c}</td>
    <td>${d}</td>
    ${isPage2 ? `
  <td class="page2Col">${w || "-"}</td>
  <td class="page2Col">${d2 || "-"}</td>
` : ""}
  `;

  document.getElementById("resultTable").appendChild(row);
}

function addDiffRow(label, cost, have) {
  const diff = have - cost;
  const isLack = diff < 0;

  const row = document.createElement("tr");
  if (isLack) row.classList.add("rowLack");

  row.innerHTML = `
    <td>${label}</td>
    <td>${cost}</td>
    <td>${have}</td>
    <td>${diff}</td>
    <td>${isLack ? "不足" : "OK"}</td>
  `;

  document.getElementById("diffTable").appendChild(row);
}

// =========================
// D 模型（你原本的）
// =========================
function D_A(xVal) {
  if (xVal <= 0) return 0;
  if (xVal === 1) return 15;
  return 30;
}
function D_B(yVal) {
  if (yVal <= 0) return 0;
  if (yVal >= 6) return 24;
  return yVal * 4;
}

function D_C(cCost) {
  const map = {
    0: 0,
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    8: 14,
    10: 16,
    13: 27,
    18: 50,
    19: 51,
    20: 52,
    21: 53,
    22: 54,
    23: 55,
    24: 56,
    26: 64,
    28: 66,
    31: 77,
    36: 100
  };

  return map[cCost] ?? 999999;
}

function bonusFromCAndD(cCost, dVal) {
  let bonus = 0;

  if (cCost >= 26 && dVal >= 3) {
    bonus = 1;
    if (dVal >= 6) bonus++;
    if (dVal >= 9) bonus++;
    if (dVal >= 12) bonus++;
    if (dVal >= 22) bonus++;
    if (dVal >= 32) bonus++;
    return bonus;
  }

  if (cCost >= 18 && dVal >= 3) {
    bonus = 1;
    if (dVal >= 6) bonus++;
    if (dVal >= 16) bonus++;
    if (dVal >= 26) bonus++;
    return bonus;
  }

  if (cCost >= 8 && dVal >= 3) {
    bonus = 1;
    if (dVal >= 6) bonus++;
    if (dVal >= 16) bonus++;
    if (dVal >= 26) bonus++;
    return bonus;
  }

  if (cCost < 8 && dVal >= 10) {
    bonus = 1;
    if (dVal >= 20) bonus++;
    return bonus;
  }

  return 0;
}

// =========================
// AHK 同款：D 上限 capD
// =========================
function CapA_ToD(aVal) {
  if (aVal === 1) return 6;
  if (aVal === 2) return 9;
  return 0;
}
function CapB_ToD(bVal) {
  if (bVal <= 0) return 0;
  if (bVal === 1) return 6;
  if (bVal === 2) return 12;
  if (bVal === 3) return 15;
  if (bVal === 4) return 21;
  if (bVal === 5) return 27;
  return 30;
}
function CapC_ToD(cCost) {
  if (cCost >= 36) return 20;
  if (cCost >= 26) return 16;
  if (cCost >= 22) return 12;
  if (cCost >= 18) return 10;
  if (cCost >= 8) return 6;
  if (cCost >= 4) return 2;
  return 0;
}
function D_MaxByABC(aVal, bVal, cCost) {
  return 20 + CapA_ToD(aVal) + CapB_ToD(bVal) + CapC_ToD(cCost);
}

// =========================
// Candidates 生成（對齊 AHK）
// =========================
function genLegalCCosts() {
  const levels = [1, 2, 3, 4, 5, 6, 8, 10, 13, 18];
  const set = new Set([0]);

  for (const a of levels) set.add(a);
  for (const a of levels) {
    for (const b of levels) {
      const sum = a + b;
      if (sum <= 36) set.add(sum);
    }
  }
  return Array.from(set).sort((a, b) => a - b);
}

function genCandidatesByD(targetD) {
  const candidates = [];
  const xList = [0, 1, 2];
  const yList = [0, 1, 2, 3, 4, 5, 6];
  const cList = genLegalCCosts();

  for (const xVal of xList) {
    for (const yVal of yList) {
      for (const cCost of cList) {
        const base = D_A(xVal) + D_B(yVal) + D_C(cCost);
        if (base > targetD) continue;

        let capD = D_MaxByABC(xVal, yVal, cCost);
        if (capD > 79) capD = 79;

        for (let dVal = 0; dVal <= capD; dVal++) {
          const bonus = bonusFromCAndD(cCost, dVal);
          const totalD = base + dVal + bonus;
          if (totalD === targetD) {
            candidates.push({ x: xVal, y: yVal, c: cCost, d: dVal });
          }
        }
      }
    }
  }
  return candidates;
}

// =========================
// 缺額策略（對齊 AHK PolicySoftScore）
// =========================
function buildPolicyFromUI() {
  const picks = [
    document.getElementById("lack1")?.value || "none",
    document.getElementById("lack2")?.value || "none",
    document.getElementById("lack3")?.value || "none",
    document.getElementById("lack4")?.value || "none",
    document.getElementById("lack5")?.value || "none",
  ];

  const weights = [1, 20, 200, 2000, 20000];

  const ban = {
    x: true,
    y: true,
    c: true,
    d: true,
    w: true
  };

  const w = {};

  const anyAllow = picks.some(v => v !== "none");
  if (!anyAllow) return { enabled: false, ban, w };

  for (let i = 0; i < picks.length; i++) {
    const v = picks[i];

    if (v === "none") continue;

    ban[v] = false;
    w[v] = weights[i];
  }

  return { enabled: true, ban, w };
}

function policySoftScore(lackX, lackY, lackC, lackD, lackW, policy) {
  if (!policy.enabled) {
    return (
      lackC * 100 +
      lackD * 30 +
      lackW * 50 +
      lackY * 10 +
      lackX * 10
    );
  }

  if (policy.ban.x && lackX > 0) return 1e18;
  if (policy.ban.y && lackY > 0) return 1e18;
  if (policy.ban.c && lackC > 0) return 1e18;
  if (policy.ban.d && lackD > 0) return 1e18;
  if (policy.ban.w && lackW > 0) return 1e18;

  const wx = policy.w.x ?? 999999;
  const wy = policy.w.y ?? 999999;
  const wc = policy.w.c ?? 999999;
  const wd = policy.w.d ?? 999999;
  const ww = policy.w.w ?? 999999;

  return (
    (lackX * lackX) * wx +
    (lackY * lackY) * wy +
    (lackC * lackC) * wc +
    (lackD * lackD) * wd +
    (lackW * lackW) * ww
  );
}

// =========================
// 排序 / 去重 / 切片（對齊 AHK）
// =========================
function costD(p) {
  return p.d + (p.d2 || 0);
}

function costW(p) {
  return p.w || 0;
}
function uniqueCandidates(list) {
  const seen = new Set();
  const out = [];
  for (const p of list) {
    const key = `${p.stageText}-${p.x}-${p.y}-${p.c}-${p.d}-${p.w || 0}-${p.d2 || 0}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

function sliceCandidates(list, startIdx, limit) {
  const out = [];
  const len = list.length;
  if (!len || limit < 1) return out;

  let cur = ((startIdx - 1) % len + len) % len;
  for (let i = 0; i < limit; i++) {
    out.push(list[cur]);
    cur++;
    if (cur >= len) cur = 0;
  }
  return out;
}

function sortCandidatesByStock(cands, remC, remD, remX, remY, preferCommon = false) {
  const den = (x) => ((x + 1) <= 0 ? 1 : (x + 1));

  let wc, wd, wx, wy;

  if (preferCommon) {
    wc = 30 + (remD + 1) / den(remC) * 12;
    wd = 10;
    wx = 1 + 200 / den(remX);
    wy = 1 + 120 / den(remY);
  } else {
    wc = 1 + (remD + 1) / den(remC) * 6;
    wd = 1;
    wx = 20 + 2000 / den(remX);
    wy = 5 + 3000 / den(remY);
  }

  return [...cands].sort((a, b) => {
    const sa = a.c * wc + costD(a) * wd + a.x * wx + a.y * wy + costW(a) * 50;
    const sb = b.c * wc + costD(b) * wd + b.x * wx + b.y * wy + costW(b) * 50;
    return sa - sb;
  });
}

// =========================
// PickCombo（對齊 AHK）
// =========================
function pickCombo(cands, n, remX, remY, remC, remD, remW, modeHard, timeLimitMs, preferCommon, policy) {
  const start = performance.now();
  let bestScore = 1e18;
  let bestList = [];
  const chosen = [];

  const max0 = (v) => (v > 0 ? v : 0);

  function scoreHard(sumX, sumY, sumC, sumD, sumW) {
    const dx = remX - sumX;
    const dy = remY - sumY;
    const dc = remC - sumC;
    const dd = remD - sumD;
    if (dx < 0 || dy < 0 || dc < 0 || dd < 0) return 1e18;
    if (policy.ban.w && sumW > remW) return 1e18;

    let wC, wD, wX, wY;
    if (preferCommon) {
      wC = 2; wD = 2; wX = 25; wY = 25;
    } else {
      wC = 10; wD = 10; wX = 1; wY = 1;
    }
    return (dc * dc) * wC + (dd * dd) * wD + (dx * dx) * wX + (dy * dy) * wY;
  }

  function scoreSoft(sumX, sumY, sumC, sumD, sumW) {
    const lackX = max0(sumX - remX);
    const lackY = max0(sumY - remY);
    const lackC = max0(sumC - remC);
    const lackD = max0(sumD - remD);
    const lackW = max0(sumW - remW);
    return policySoftScore(lackX, lackY, lackC, lackD, lackW, policy);
  }

  function lowerBoundHard(sumX, sumY, sumC, sumD) {
    const dx = remX - sumX;
    const dy = remY - sumY;
    const dc = remC - sumC;
    const dd = remD - sumD;
    if (dx < 0 || dy < 0 || dc < 0 || dd < 0) return 1e18;
    return (dc * dc) * 10 + (dd * dd) * 10 + (dx * dx) + (dy * dy);
  }

  function recur(startIdx, left, sumX, sumY, sumC, sumD, sumW) {
    if (performance.now() - start > timeLimitMs) return;

    if (left === 0) {
      const sc = modeHard
        ? scoreHard(sumX, sumY, sumC, sumD, sumW)
        : scoreSoft(sumX, sumY, sumC, sumD, sumW);
      if (sc < bestScore) {
        bestScore = sc;
        bestList = chosen.slice();
      }
      return;
    }

    if (modeHard) {
      if (sumX > remX || sumY > remY || sumC > remC || sumD > remD || sumW > remW) return;
      if (lowerBoundHard(sumX, sumY, sumC, sumD) >= bestScore) return;
    }

    for (let i = startIdx; i < cands.length; i++) {
      const p = cands[i];
      chosen.push(p);
      recur(
        i,
        left - 1,
        sumX + p.x,
        sumY + p.y,
        sumC + p.c,
        sumD + costD(p),
        sumW + costW(p)
      );
      chosen.pop();
      if (performance.now() - start > timeLimitMs) return;
    }
  }

  if (n <= 0) return { score: 0, list: [] };
  if (!cands.length) return { score: 1e18, list: [] };

  recur(0, n, 0, 0, 0, 0, 0);
  return { score: bestScore, list: bestList };
}

// =========================
// permutations（對齊 AHK）
// =========================
function permutations(arr) {
  const res = [];
  const used = Array(arr.length).fill(false);
  const path = [];
  function dfs() {
    if (path.length === arr.length) {
      res.push(path.slice());
      return;
    }
    for (let i = 0; i < arr.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      path.push(arr[i]);
      dfs();
      path.pop();
      used[i] = false;
    }
  }
  dfs();
  return res;
}

function calcFinalLack(remX, remY, usedType, ownByType) {
  let lack = 0;
  if (remX < 0) lack += -remX;
  if (remY < 0) lack += -remY;

  for (const t of ["強攻", "敏攻", "控制", "輔助"]) {
    const diffC = ownByType[t].c - usedType[t].c;
    const diffD = ownByType[t].d - usedType[t].d;
    if (diffC < 0) lack += -diffC;
    if (diffD < 0) lack += -diffD;
  }
  return lack;
}

// =========================
// computeLikeAHK（核心流程）
// =========================

function computeLikeAHK({ candidates, counts, ownCommon, ownByType, policy }) {
  const typeNames = ["強攻", "敏攻", "控制", "輔助"];

  const ownSum = {};
  for (const t of typeNames) ownSum[t] = ownByType[t].c + ownByType[t].d;
  const baseOrder = [...typeNames].sort((a, b) => ownSum[a] - ownSum[b]);

  let bestLack = 1e18;
  let bestPicked = null;
  let bestUsedType = null;
  let bestRemX = 0;
  let bestRemY = 0;
  let bestOrder = null;
  let bestUsedW = 0;

  const ordersToTry = TRY_ALL_ORDERS
    ? [baseOrder, [...baseOrder].reverse(), ...permutations(baseOrder)].slice(0, MAX_ORDER_TRIES)
    : [baseOrder];

  for (const tryOrder of ordersToTry) {
    for (let sliceNo = 1; sliceNo <= SLICE_TRIES; sliceNo++) {
      let remX = ownCommon.x;
      let remY = ownCommon.y;
      let usedW = 0;

      const usedType = {
        "強攻": { c: 0, d: 0 },
        "敏攻": { c: 0, d: 0 },
        "控制": { c: 0, d: 0 },
        "輔助": { c: 0, d: 0 }
      };

      const picked = {};
      let ok = true;

      for (const typeName of tryOrder) {
        const n = counts[typeName] || 0;

        if (n === 0) {
          picked[typeName] = [];
          continue;
        }

        const remC = ownByType[typeName].c - usedType[typeName].c;
        const remD = ownByType[typeName].d - usedType[typeName].d;
        const remW = ownCommon.w == null ? 999999 : (ownCommon.w - usedW);
        const preferCommon = n > 2;

        let localAll = sortCandidatesByStock(candidates, remC, remD, remX, remY, preferCommon);
        localAll = uniqueCandidates(localAll);

        const limit = Math.max(1, Math.min(MAX_CANDS_PER_TYPE, localAll.length));
        const startAt = 1 + (sliceNo - 1) * SLICE_SHIFT_STEP;
        const localCands = sliceCandidates(localAll, startAt, limit);

        let res = pickCombo(
          localCands,
          n,
          remX,
          remY,
          remC,
          remD,
          remW,
          true,
          PICK_TIMELIMIT_MS,
          preferCommon,
          policy
        );

        if ((!res.list || res.list.length === 0) && ALLOW_SOFT) {
          res = pickCombo(
            localCands,
            n,
            remX,
            remY,
            remC,
            remD,
            remW,
            false,
            PICK_TIMELIMIT_MS,
            false,
            policy
          );
        }

        if (!res.list || res.list.length === 0) {
          ok = false;
          break;
        }

        picked[typeName] = res.list;

        let sumX = 0;
        let sumY = 0;
        let sumC = 0;
        let sumD = 0;
        let sumW = 0;

        for (const p of res.list) {
          sumX += p.x;
          sumY += p.y;
          sumC += p.c;
          sumD += costD(p);
          sumW += costW(p);
        }

        if (policy.ban.w && sumW > remW) {
          ok = false;
          break;
        }

        remX -= sumX;
        remY -= sumY;
        usedW += sumW;
        usedType[typeName].c += sumC;
        usedType[typeName].d += sumD;
      }

      if (!ok) continue;

      const lack = calcFinalLack(remX, remY, usedType, ownByType);

      if (lack === 0) {
        return { ok: true, picked, usedType, remX, remY, order: tryOrder, lack: 0, usedW };
      }

      if (!REQUIRE_PERFECT && lack < bestLack) {
        bestLack = lack;
        bestPicked = picked;
        bestUsedType = usedType;
        bestRemX = remX;
        bestRemY = remY;
        bestOrder = tryOrder;
        bestUsedW = usedW;
      }
    }
  }

  if (!bestOrder) return { ok: false };

  return {
    ok: true,
    picked: bestPicked,
    usedType: bestUsedType,
    remX: bestRemX,
    remY: bestRemY,
    order: bestOrder,
    lack: bestLack,
    usedW: bestUsedW
  };
}
// =========================
// 表單自動記憶（localStorage）
// =========================
const STORAGE_KEY = "herb_calc_form_v1";

function saveForm() {
  const data = {};
  document.querySelectorAll("input, select").forEach(el => {
    if (!el.id) return;
    data[el.id] = el.value;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadForm() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const data = JSON.parse(raw);

    for (const id in data) {
      const el = document.getElementById(id);
      if (el) el.value = data[id];
    }
  } catch (e) {
    console.warn("讀取表單失敗", e);
  }
}

function refreshStageUI() {
  const stage = Number(document.getElementById("stage")?.value);

  const commonTitle = document.getElementById("commonTitle");
  const thStage = document.getElementById("thStage");
  const ownW = document.getElementById("ownW");

  if (!commonTitle || !ownW) return;

  if (stage === 6) {
    commonTitle.textContent = "通用（相思 / 幽香 / 望穿）";
    ownW.classList.remove("hidden");
  } else {
    commonTitle.textContent = "通用（相思 / 幽香）";
    ownW.classList.add("hidden");
  }

  const showPage2 = stage === 6;
  const thW = document.getElementById("thW");
  const thD2 = document.getElementById("thD2");

  if (showPage2) {
    thStage?.classList.remove("hiddenCol");
    thW?.classList.remove("hiddenCol");
    thD2?.classList.remove("hiddenCol");
  } else {
    thStage?.classList.add("hiddenCol");
    thW?.classList.add("hiddenCol");
    thD2?.classList.add("hiddenCol");
  }
  clearResultUI();
}

window.addEventListener("DOMContentLoaded", () => {

  loadForm();
  refreshStageUI();

  document.querySelectorAll("input, select").forEach(el => {
    el.addEventListener("change", saveForm);
    el.addEventListener("input", saveForm);
  });

  document.getElementById("stage")?.addEventListener(
    "change",
    refreshStageUI
  );

});

// =========================
// 主流程：按鈕事件
// =========================
if (btn) btn.addEventListener("click", (e) => {
  e.preventDefault();

  btn.innerHTML = `
  計算中 <i class="fa-solid fa-spinner fa-spin"></i>`;
  btn.classList.add("btnLoading");
  btn.disabled = true;

  setTimeout(() => {
    try {
      clearResultUI();

      const stage = Number(document.getElementById("stage").value);
      const targetD = targetDByStage(stage);

      const isStage10WithPage2 = stage === 6;
      let ownW = Number(document.getElementById("ownW")?.value) || 0;
      const totalOwnW = ownW;

      const ownCommon = {
        x: Number(document.getElementById("ownX").value) || 0,
        y: Number(document.getElementById("ownY").value) || 0,
        w: ownW,
      };

      const ownByType = {
        "強攻": { c: Number(document.getElementById("ownC_str").value) || 0, d: Number(document.getElementById("ownD_str").value) || 0 },
        "敏攻": { c: Number(document.getElementById("ownC_agi").value) || 0, d: Number(document.getElementById("ownD_agi").value) || 0 },
        "控制": { c: Number(document.getElementById("ownC_ctl").value) || 0, d: Number(document.getElementById("ownD_ctl").value) || 0 },
        "輔助": { c: Number(document.getElementById("ownC_sup").value) || 0, d: Number(document.getElementById("ownD_sup").value) || 0 }
      };

      const counts = {
        "強攻": Number(document.getElementById("cnt_str").value) || 0,
        "敏攻": Number(document.getElementById("cnt_agi").value) || 0,
        "控制": Number(document.getElementById("cnt_ctl").value) || 0,
        "輔助": Number(document.getElementById("cnt_sup").value) || 0
      };

      const sumCounts = counts["強攻"] + counts["敏攻"] + counts["控制"] + counts["輔助"];
      if (sumCounts <= 0) {
        addRow(1, "（請至少輸入一個數量）", "-", "-", "-", "-", "-", "-", "-");
        showResult();
        return;
      }

      const policy = buildPolicyFromUI();
      let candidates;

      if (isStage10WithPage2) {
        const candidates9 = genCandidatesByD(138).map(p => ({
          ...p,
          stageText: "9+1",
          w: 2,
          d2: 10
        }));

        const candidates10 = genCandidatesByD(173).map(p => ({
          ...p,
          stageText: "10",
          w: 0,
          d2: 0
        }));

        candidates = [...candidates9, ...candidates10];
      } else {
        candidates = genCandidatesByD(targetD).map(p => ({
          ...p,
          stageText: "",
          w: 0,
          d2: 0
        }));
      }

      const res = computeLikeAHK({
        candidates,
        counts,
        ownCommon,
        ownByType,
        policy
      });

      if (!res.ok) {
        addRow(1, "（找不到解：請放寬缺額策略）", "-", "-", "-", "-", "-", "-", "-");
        showResult();
        return;
      }

      let seq = 1;
      const isSoft = res.lack > 0;

      for (const typeName of res.order) {
        const list = res.picked[typeName] || [];

        for (const p of list) {
          addRow(
            seq++,
            isSoft ? `${typeName}` : typeName,
            p.stageText || "",
            p.x,
            p.y,
            p.c,
            p.d,
            p.w || "",
            p.d2 || ""
          );
        }
      }

      addDiffRow("相思", ownCommon.x - res.remX, ownCommon.x);
      addDiffRow("幽香", ownCommon.y - res.remY, ownCommon.y);
      if (isStage10WithPage2) {
        addDiffRow("望穿", res.usedW || 0, totalOwnW);
      }

      for (const t of ["強攻", "敏攻", "控制", "輔助"]) {
        addDiffRow(`${t} 大草`, res.usedType[t].c, ownByType[t].c);
        addDiffRow(`${t} 小草`, res.usedType[t].d, ownByType[t].d);
      }

      showResult();
      btnSaveImage.style.display = "block";

    } catch (err) {
      console.error(err);
      alert("計算發生錯誤：\n" + (err?.message || err));
    } finally {
      btn.innerHTML = '開始計算 <i class="fa-solid fa-caret-right"></i>';
      btn.classList.remove("btnLoading");
      btn.disabled = false;
    }
  }, 20);
});

// ====== 教學彈窗 + 大草等級對照 ======
function cCostToLevelText(n) {
  const map = {
    1: "右1等",
    2: "右2等",
    3: "右3等",
    4: "右4等",
    5: "右5等",
    6: "右6等",
    7: "右6等+左1等",
    8: "右7等",
    9: "右7等+左1等",
    10: "右8等",
    11: "右8等+左1等",
    12: "右8等+左2等",
    13: "右9等",
    14: "右9等+左1等",
    15: "右9等+左2等",
    16: "右9等+左3等",
    17: "右9等+左4等",
    18: "右10等",
    19: "右10等+左1等",
    20: "右10等+左2等",
    21: "右10等+左3等",
    22: "右10等+左4等",
    23: "右10等+左5等",
    24: "右10等+左6等",
    25: "無該組合，請重新確認",
    26: "右10等+左7等",
    27: "無該組合，請重新確認",
    28: "右10等+左8等",
    29: "無該組合，請重新確認",
    30: "無該組合，請重新確認",
    31: "右10等+左9等",
    32: "無該組合，請重新確認",
    33: "無該組合，請重新確認",
    34: "無該組合，請重新確認",
    35: "無該組合，請重新確認",
    36: "右10等+左10等",
  };
  return map[n] ?? "請根據計算結果輸入(1~36)";
}

function setupTutorialUI() {
  const modal = document.getElementById("tutorialModal");
  const openBtn = document.getElementById("btnTutorial");
  const closeBtn = document.getElementById("btnTutorialClose");
  const backdrop = modal?.querySelector(".modalBackdrop");

  const input = document.getElementById("cCostInput");
  const output = document.getElementById("cCostOutput");

  if (!modal || !openBtn || !closeBtn || !input || !output) return;

  const open = () => {
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    // input.focus();
    output.textContent = cCostToLevelText(Number(input.value));
  };

  const close = () => {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  };

  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  backdrop?.addEventListener("click", close);

  // ESC 關閉
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) close();
  });

  // 輸入即時更新
  input.addEventListener("input", () => {
    const v = Number(String(input.value).trim());
    output.textContent = cCostToLevelText(v);
  });
}

window.addEventListener("DOMContentLoaded", setupTutorialUI);

const btnSaveImage = document.getElementById("btnSaveImage");
// 預設隱藏
btnSaveImage.style.display = "none";

btnSaveImage?.addEventListener("click", async () => {

  const target = document.getElementById("resultExportArea");

  const canvas = await html2canvas(target, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff"
  });

  const now = new Date();
  const fileName =
    `仙草共鳴_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}.png`;


  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  canvas.toBlob(async (blob) => {

    // 只有手機走分享
    if (isMobile && navigator.share && blob) {

      try {
        const file = new File(
          [blob],
          fileName,
          { type: "image/png" }
        );

        if (
          navigator.canShare &&
          navigator.canShare({ files: [file] })
        ) {
          await navigator.share({
            files: [file],
            title: "仙草共鳴計算結果"
          });
          return;
        }
      } catch (err) {
        console.log("分享取消", err);
      }
    }

    // 電腦維持原本下載
    const link = document.createElement("a");
    link.download = fileName;
    link.href = URL.createObjectURL(blob);
    link.click();

    URL.revokeObjectURL(link.href);

  }, "image/png");
});
