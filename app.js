/* ============ 交互逻辑 ============ */

function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

// 一个可复现的伪随机生成器：同样的父母名字输入，得到同样的结果
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rand, arr) { return arr[Math.floor(rand() * arr.length)]; }

function extractGivenName(fullName) {
  const chars = fullName.trim().replace(/\s+/g, "");
  return chars.length >= 2 ? chars.slice(1) : chars;
}

/* ---------- 起名生成 ---------- */
document.getElementById("nameForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const father = document.getElementById("fatherName").value.trim();
  const mother = document.getElementById("motherName").value.trim();
  const surnameMode = document.getElementById("surname").value;
  const gender = document.getElementById("gender").value;
  if (!father || !mother) return;

  const fatherSurname = father[0];
  const motherSurname = mother[0];
  const surname =
    surnameMode === "father" ? fatherSurname :
    surnameMode === "mother" ? motherSurname :
    fatherSurname + motherSurname;

  const rand = mulberry32(hashStr(father + mother + surnameMode + gender));
  const bank = CHAR_BANK[gender] || CHAR_BANK.neutral;

  // 从父母姓名中提取有意义的用字，融入名字
  const parentChars = [...new Set((extractGivenName(father) + extractGivenName(mother)).split(""))];

  const fullnames = [];
  const used = new Set();
  while (fullnames.length < 6) {
    let given;
    if (rand() < 0.35 && parentChars.length >= 2) {
      // 「父母名入名」：取父亲名中一字 + 母亲名中一字
      given = pick(rand, parentChars) + pick(rand, bank).c;
    } else {
      given = pick(rand, bank).c + pick(rand, bank).c;
    }
    const full = surname + given;
    if (used.has(given) || full.length > 4) continue;
    used.add(given);
    fullnames.push({
      name: full,
      why: given.split("").map(ch => {
        const hit = bank.find(x => x.c === ch);
        if (hit) return `「${ch}」${hit.m}`;
        return `「${ch}」承自父母姓名，血脉相连`;
      }).join("；")
    });
  }

  // 乳名
  const nickPool = [...NICK_FOOD, ...NICK_NATURE, ...bank.slice(0, 8).map(x => x.c)];
  const prefixes = NICK_PATTERNS[gender] || NICK_PATTERNS.neutral;
  const nicknames = [];
  const usedNick = new Set();
  while (nicknames.length < 6) {
    let n;
    const r = rand();
    if (r < 0.4) {
      n = pick(rand, nickPool) + pick(rand, nickPool); // 叠字，如「圆圆」
      n = n[0];
    } else if (r < 0.7) {
      n = pick(rand, prefixes) + pick(rand, nickPool);
    } else {
      n = pick(rand, NICK_FOOD);
    }
    if (usedNick.has(n) || n.length > 4) continue;
    usedNick.add(n);
    nicknames.push({
      name: n,
      why: n.length <= 2 && n[0] === n[1]
        ? "叠字乳名，亲昵顺口，唤起来软糯可爱"
        : "取自生活趣物或自然意象，活泼好记"
    });
  }

  renderList("fullnames", fullnames);
  renderList("nicknames", nicknames);
  document.getElementById("results").classList.remove("hidden");
  document.getElementById("results").scrollIntoView({ behavior: "smooth", block: "start" });
});

function renderList(id, items) {
  document.getElementById(id).innerHTML = items
    .map(x => `<li><b>${x.name}</b><small>${x.why}</small></li>`)
    .join("");
}

/* ---------- 姓氏起源查询 ---------- */
const surnameList = document.getElementById("surnameList");
[...new Set([...Object.keys(SURNAME_DB), ...Object.keys(SURNAME_BRIEF)])]
  .sort((a, b) => a.localeCompare(b, "zh"))
  .forEach(s => {
    const opt = document.createElement("option");
    opt.value = s;
    surnameList.appendChild(opt);
  });

function lookupSurname() {
  const s = document.getElementById("surnameInput").value.trim();
  const box = document.getElementById("originResult");
  if (!s) return;
  const key = SURNAME_DB[s] || SURNAME_DB[s[0]] ? (SURNAME_DB[s] ? s : s[0]) : null;
  const detail = key ? SURNAME_DB[key] : null;
  const brief = SURNAME_BRIEF[s];
  if (detail) {
    box.innerHTML = `
      <h3>${s}姓 · ${detail.population}</h3>
      <p><b>【起源】</b>${detail.origin}</p>
      <p><b>【郡望】</b>${detail.junwang}</p>
      <p><b>【迁徙】</b>${detail.migration}</p>`;
  } else if (brief) {
    box.innerHTML = `
      <h3>${s}姓 · 起源简述</h3>
      <p><b>【起源】</b>${brief}</p>
      <p class="note">该姓收录于《百家姓》。各大姓的郡望、迁徙等详细资料正在陆续补充中。</p>`;
  } else {
    box.innerHTML = `<p>暂未收录「${s}」姓的详细资料。中国现有在用姓氏 6000 余个，本站已收录《百家姓》全部 504 个姓氏的起源简述。</p>`;
  }
}
document.getElementById("lookupBtn").addEventListener("click", lookupSurname);
document.getElementById("surnameInput").addEventListener("keydown", e => {
  if (e.key === "Enter") lookupSurname();
});

/* ---------- 百家姓全文 ---------- */
document.getElementById("baijiaxing-text").textContent = BAIJIAXING;
