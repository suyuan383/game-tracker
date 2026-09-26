function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }
function todayStr() { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; }
function fmtDate(s) { if (!s) return ''; const p = s.split('-'); return `${+p[1]}/${+p[2]}`; }
function fmtDT(s) { if (!s) return ''; const [d, t] = s.split('T'); const p = d.split('-'); let out = `${+p[1]}/${+p[2]}`; if (t) out += ' ' + t.slice(0,5); return out; }
function parseTime(s) { if (!s) return NaN; if (s.includes('T')) return new Date(s).getTime(); return new Date(s + 'T23:59:59').getTime(); }
function leftInfo(endStr) { 
  const end = parseTime(endStr); 
  if (isNaN(end)) return null; 
  const ms = end - Date.now(); 
  if (ms < 0) return { over: true, text: '已结束' }; 
  const d = Math.floor(ms/86400000); 
  const h = Math.floor((ms%86400000)/3600000); 
  const text = d > 0 ? `剩 ${d} 天` : (h > 0 ? `剩 ${h} 小时` : '即将结束'); 
  return { over: false, urgent: d < 3, text }; 
}
/* ===================== 活动页通用 ===================== */
let evTickTimer = null;

function fmtDuration(ms) {
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (d > 0) return `${d}天${h}时${m}分${s}秒`;
  if (h > 0) return `${h}时${m}分${s}秒`;
  if (m > 0) return `${m}分${s}秒`;
  return `${s}秒`;
}

function renderCommonEventTab(d) {
  const now = Date.now();
  const enriched = (d.events || []).map(ev => {
    const startT = ev.start ? parseTime(ev.start) : 0;
    const endT   = ev.end   ? parseTime(ev.end)   : Infinity;
    let st;
    if (endT !== Infinity && endT < now) st = 'ended';
    else if (startT && startT > now)     st = 'upcoming';
    else                                  st = 'ongoing';
    return { ...ev, _st: st };
  });

  const counts = {
    all: enriched.length,
    ongoing: enriched.filter(e => e._st === 'ongoing').length,
    upcoming: enriched.filter(e => e._st === 'upcoming').length,
    ended: enriched.filter(e => e._st === 'ended').length
  };

  let filtered = enriched;
  if (evFilterStatus === 'ongoing')       filtered = enriched.filter(e => e._st === 'ongoing');
  else if (evFilterStatus === 'upcoming') filtered = enriched.filter(e => e._st === 'upcoming');
  else if (evFilterStatus === 'ended')    filtered = enriched.filter(e => e._st === 'ended');

  filtered.sort((a, b) => {
    if (evFilterStatus === 'ended') return (b.end || '').localeCompare(a.end || '');
    const ka = a._st === 'upcoming' ? (a.start || '') : (a.end || '');
    const kb = b._st === 'upcoming' ? (b.start || '') : (b.end || '');
    return ka.localeCompare(kb);
  });

  const tabsHtml = `
    <div class="tabs" style="margin-bottom:12px">
      ${[['all','全部'],['ongoing','进行中'],['upcoming','未开始'],['ended','已结束']].map(([k,l]) =>
        `<button class="tab ${evFilterStatus===k?'active':''}" data-ev-filter="${k}">${l} (${counts[k]})</button>`
      ).join('')}
    </div>`;

  const listHtml = filtered.length
    ? filtered.map(renderEventRow).join('')
    : `<div class="empty">暂无活动</div>`;

  return `
    ${tabsHtml}
    <div class="list">${listHtml}</div>
    <div class="add-form" style="margin-top:12px"><input id="evName" placeholder="活动名称"></div>
    <div class="add-form" style="margin-top:8px">
      <input id="evStart" type="datetime-local">
      <input id="evEnd" type="datetime-local">
    </div>
    <div class="add-form" style="margin-top:8px"><button data-act="addEv">添加活动</button></div>
  `;
}

function renderEventRow(ev) {
  let badge = '';
  if (ev._st === 'ended') {
    badge = `<span class="badge over">已结束</span>`;
  } else if (ev._st === 'upcoming') {
    badge = `<span class="badge" data-cd-start="${esc(ev.start)}" style="background:#e7f5ff;color:#1971c2">计算中…</span>`;
  } else {
    badge = `<span class="badge" data-cd-end="${esc(ev.end)}" style="background:#ebfbee;color:#2f9e44">计算中…</span>`;
  }
  return `
    <div class="row">
      <div class="grow">
        <div class="name">${esc(ev.name)}</div>
        <div class="sub">${fmtDT(ev.start)}${ev.start && ev.end ? ' → ' : ''}${fmtDT(ev.end)}</div>
      </div>
      ${badge}
      <button class="del" data-act="delEv" data-id="${ev.id}">×</button>
    </div>`;
}

function startEventCountdown() {
  if (evTickTimer) { clearInterval(evTickTimer); evTickTimer = null; }
  const hasEl = document.querySelector('[data-cd-end],[data-cd-start]');
  if (!hasEl) return;
  const tick = () => {
    document.querySelectorAll('[data-cd-end]').forEach(el => {
      const t = parseTime(el.dataset.cdEnd);
      if (isNaN(t)) { el.textContent = ''; return; }
      const ms = t - Date.now();
      el.textContent = ms <= 0 ? '已结束' : '剩 ' + fmtDuration(ms);
    });
    document.querySelectorAll('[data-cd-start]').forEach(el => {
      const t = parseTime(el.dataset.cdStart);
      if (isNaN(t)) { el.textContent = '未开始'; return; }
      const ms = t - Date.now();
      el.textContent = ms <= 0 ? '即将开始' : '开 ' + fmtDuration(ms);
    });
  };
  tick();
  evTickTimer = setInterval(tick, 1000);
}

/* ===================== 资源页通用 ===================== */
function calcBankTotals(data, fields) {
  const totals = {};
  fields.forEach(f => { totals[f.key] = 0; });
  if (data && data.init) {
    fields.forEach(f => { totals[f.key] = +data.init[f.key] || 0; });
  }
  if (data && data.records) {
    data.records.forEach(r => {
      fields.forEach(f => { totals[f.key] += +r[f.key] || 0; });
    });
  }
  return totals;
}

function renderResForm(prefix, fields, type, data, catList) {
  const isIncome = type === 'income';
  const label = isIncome ? '＋ 收入记录' : '－ 消耗记录';
  const catLabel = isIncome ? '来源' : '消耗类型';
  const totals = calcBankTotals(data, fields);
  const s = isIncome ? 'in' : 'ex';

  const fieldRows = fields.map(f => `
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
      <span style="flex:0 0 70px;font-size:12px;color:#666">${f.name}</span>
      <input class="inp" id="${prefix}_${s}_${f.key}" type="number" placeholder="${isIncome?'本次增加':'本次消耗'}" style="flex:1">
      <input class="inp" id="${prefix}_${s}_after_${f.key}" type="number" placeholder="或填总数(现${totals[f.key]})" style="flex:1.3">
    </div>
  `).join('');

  return `
    <div class="card" style="margin-bottom:12px">
      <div style="font-size:14px;font-weight:600;margin-bottom:10px">${label}</div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <div style="flex:1"><div style="font-size:12px;color:#666;margin-bottom:4px">日期</div>
          <input class="inp" id="${prefix}_${s}Date" type="date" value="${todayStr()}"></div>
        <div style="flex:1.4"><div style="font-size:12px;color:#666;margin-bottom:4px">${catLabel}</div>
          <select class="inp" id="${prefix}_${s}Category" data-res-prefix="${prefix}" data-res-type="${isIncome ? 'income' : 'expense'}">
  ${catList.map(x => `<option value="${x}">${x}</option>`).join('')}
</select></div>
      </div>
      <div style="font-size:12px;color:#666;margin-bottom:6px">本次变化 / 操作后总数，二选一填写即可</div>
      ${fieldRows}
      <div style="margin-top:10px;margin-bottom:10px">
        <input class="inp" id="${prefix}_${s}Note" placeholder="备注">
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn ghost" data-act="${prefix}CancelForm">取消</button>
        <button class="btn" data-act="${prefix}${isIncome?'SaveIncome':'SaveExpense'}">保存</button>
      </div>
    </div>`;
}

function saveResForm(prefix, fields, type, d) {
  const isIncome = type === 'income';
  const s = isIncome ? 'in' : 'ex';
  const dateEl = document.getElementById(`${prefix}_${s}Date`);
  const catEl  = document.getElementById(`${prefix}_${s}Category`);
  const noteEl = document.getElementById(`${prefix}_${s}Note`);
  if (!dateEl || !catEl) return false;

  const date = dateEl.value || todayStr();
  const category = catEl.value;
  const note = noteEl ? noteEl.value.trim() : '';
  const rec = { id: uid(), date, type: isIncome ? 'income' : 'expense', category, note };

  const bank = d.resourceBank || { init: {}, records: [] };
  const cur = calcBankTotals(bank, fields);

  let any = false;
  fields.forEach(f => {
    const deltaEl = document.getElementById(`${prefix}_${s}_${f.key}`);
    const afterEl = document.getElementById(`${prefix}_${s}_after_${f.key}`);
    const delta = deltaEl ? (+deltaEl.value || 0) : 0;
    const afterRaw = afterEl ? afterEl.value : '';
    const after = afterRaw === '' ? null : +afterRaw;

    let v = 0;
    if (after !== null && !isNaN(after)) {
      v = after - cur[f.key];
    } else if (delta) {
      v = isIncome ? Math.abs(delta) : -Math.abs(delta);
    }
    if (v) any = true;
    rec[f.key] = v;
  });

  if (!any) { alert('至少填一项'); return false; }
  if (!d.resourceBank) d.resourceBank = { init: {}, records: [] };
  d.resourceBank.records.push(rec);
  saveDB();
  return true;
}
/* ===================== 列表日期筛选 ===================== */
function filterByListDate(records) {
  if (listDateFilter === 'all') return records;
  const target = listDateFilter === 'today' ? todayStr() : listDateFilter;
  return records.filter(r => (r.date || '') === target);
}

function renderListDateUI() {
  const isAll   = listDateFilter === 'all';
  const isToday = listDateFilter === 'today';
  const val = isAll ? '' : (isToday ? todayStr() : listDateFilter);
  return `
    <div style="display:flex;gap:6px;margin-bottom:12px;align-items:center">
      <input class="inp" type="date" id="listDateFilter" value="${val}" style="flex:1" ${isAll?'disabled':''}>
      <button class="mini" data-act="listDateToday" style="${isToday?'background:#3b5bdb;color:#fff':''}">今天</button>
      <button class="mini" data-act="listDateAll" style="${isAll?'background:#3b5bdb;color:#fff':''}">全部</button>
    </div>`;
}
/* ===================== 限定池出金统计 ===================== */
function calcLimitedPoolStats(records, pools) {
  return pools.filter(p => p.hasGuaranteed).map(p => {
    // 按时间正序（从旧到新）遍历，才能正确跟踪大小保底状态
    const recs = (records || [])
      .filter(r => r.poolType === p.key)
      .sort((a, b) => {
        const d1 = a.date || '', d2 = b.date || '';
        if (d1 !== d2) return d1.localeCompare(d2);
        return (a.id || '').localeCompare(b.id || '');
      });

    let guaranteed = false;   // 是否处于大保底状态
    let smallTotal = 0;       // 小保底总次数
    let smallUp = 0;          // 小保底命中次数
    let upCount = 0;          // UP 总数（含大保底）
    let totalPulls = 0;       // 所有出金累计抽数

    recs.forEach(r => {
      totalPulls += (+r.hitPity || 0);
      if (r.up) upCount++;

      if (guaranteed) {
        // 大保底出金，必UP，不计入概率统计
        guaranteed = false;
      } else {
        smallTotal++;
        if (r.up) {
          smallUp++;
        } else {
          guaranteed = true;   // 歪了，进入大保底
        }
      }
    });

    const total = recs.length;
    const offCount = total - upCount;
    const upRate = smallTotal ? ((smallUp / smallTotal) * 100).toFixed(1) + '%' : '—';
    const avg = upCount ? (totalPulls / upCount).toFixed(1) : '—';

    return {
      name: p.name,
      upCount, offCount, total,
      upRate, avg, totalPulls,
      smallTotal, smallUp
    };
  });
}

function renderPoolStatsCards(stats) {
  if (!stats.length) return '';
  return `
    <div class="section-title">📈 出金统计</div>
    <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap">
      ${stats.map(s => `
        <div class="card" style="flex:1;min-width:160px;margin-bottom:0">
          <div style="font-size:13px;font-weight:600;color:#666;margin-bottom:8px">${esc(s.name)}</div>
          <div style="display:flex;gap:8px;margin-bottom:6px">
            <div style="flex:1">
              <div style="font-size:11px;color:#999">不歪概率</div>
              <div style="font-size:18px;font-weight:700;color:#2f9e44">${s.upRate}</div>
            </div>
            <div style="flex:1">
              <div style="font-size:11px;color:#999">UP平均抽数</div>
              <div style="font-size:18px;font-weight:700;color:#3b5bdb">${s.avg}</div>
            </div>
          </div>
          <div style="font-size:11px;color:#999;line-height:1.6">
            UP ${s.upCount} · 歪 ${s.offCount} · 共 ${s.total} 金<br>
            小保底命中 ${s.smallUp} / ${s.smallTotal}
          </div>
        </div>
      `).join('')}
    </div>`;
}
/* ===================== 心愿清单 ===================== */
function renderWishlist(gameId, d) {
  const rule = WISH_RULES[gameId];
  if (!rule) return '';

  const all = d.wishlist || [];
  const list = all.filter(w => !w.done);        // 未完成的心愿（参与进度）
  const doneList = all.filter(w => w.done);     // 已完成的心愿（不参与进度）

  // 把 resourceBank 的 init + records 拍平成 { key: 总数 }
  const bank = d.resourceBank || { init: {}, records: [] };
  const flat = {};
  const SKIP = ['date', 'id', 'type', 'category', 'note'];
  const keys = new Set();
  Object.keys(bank.init || {}).forEach(k => keys.add(k));
  (bank.records || []).forEach(r => Object.keys(r).forEach(k => keys.add(k)));
  keys.forEach(k => {
    if (SKIP.includes(k)) return;
    let total = +((bank.init || {})[k]) || 0;
    (bank.records || []).forEach(r => { total += +r[k] || 0; });
    flat[k] = total;
  });

  // 按 fields 统一换算
  let current = 0;
  (rule.fields || []).forEach(f => {
    const v = +flat[f.key] || 0;
    current += Math.floor(v / (f.divisor || 1));
  });

  const totalTarget = list.reduce((s, w) => s + (+w.target || 0), 0);

  // ===== 按优先级依次扣减，找出当前正在攒的那个心愿 =====
  let remaining = current;
  let activeIndex = -1;
  let activeProgress = 0;
  let activeTarget = 0;
  let activeWish = null;

  for (let i = 0; i < list.length; i++) {
    const t = +list[i].target || 0;
    if (remaining >= t) {
      remaining -= t;
    } else {
      activeIndex = i;
      activeProgress = remaining;
      activeTarget = t;
      activeWish = list[i];
      break;
    }
  }
  const allDone = list.length > 0 && activeIndex === -1;

  // ===== 表单 =====
  const formHtml = (wishShowForm || wishEditingId) ? (() => {
    const editing = wishEditingId ? all.find(w => w.id === wishEditingId) : null;
    return `
      <div class="card" style="margin-bottom:12px">
        <div style="font-size:14px;font-weight:600;margin-bottom:10px">${editing ? '✏️ 编辑心愿' : '＋ 添加心愿'}</div>
        <div style="margin-bottom:8px">
          <div style="font-size:12px;color:#666;margin-bottom:4px">想要的角色 / 武器</div>
          <input class="inp" id="wishName" value="${editing ? esc(editing.name) : ''}" placeholder="如 钟离">
        </div>
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <div style="flex:1">
            <div style="font-size:12px;color:#666;margin-bottom:4px">目标抽数</div>
            <input class="inp" id="wishTarget" type="number" min="1" value="${editing ? editing.target : 80}">
          </div>
          <div style="flex:1.4">
            <div style="font-size:12px;color:#666;margin-bottom:4px">备注（可空）</div>
            <input class="inp" id="wishNote" value="${editing ? esc(editing.note || '') : ''}" placeholder="如 攒大保底 / 武器池">
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn ghost" data-act="wishCancel">取消</button>
          <button class="btn" data-act="wishSave">保存</button>
        </div>
      </div>`;
  })() : '';

  // ===== 进度条（只基于未完成的心愿） =====
  let progressHtml = '';
  if (!list.length && !doneList.length) {
    // 什么都没
  } else if (!list.length) {
    progressHtml = `
      <div class="card" style="margin-bottom:12px">
        <div style="text-align:center;padding:10px 0">
          <div style="font-size:28px;margin-bottom:6px">🎉</div>
          <div style="font-size:15px;font-weight:600;color:#2f9e44">全部心愿已完成</div>
          <div style="font-size:12px;color:#999;margin-top:6px">当前可用 ${current} 抽</div>
        </div>
      </div>`;
  } else if (allDone) {
    progressHtml = `
      <div class="card" style="margin-bottom:12px">
        <div style="text-align:center;padding:10px 0">
          <div style="font-size:28px;margin-bottom:6px">🎉</div>
          <div style="font-size:15px;font-weight:600;color:#2f9e44">当前心愿已攒够</div>
          <div style="font-size:12px;color:#999;margin-top:6px">当前可用 ${current} 抽 · 共需 ${totalTarget} 抽</div>
        </div>
      </div>`;
  } else {
    const pct = activeTarget ? Math.min(100, Math.round(activeProgress / activeTarget * 100)) : 0;
    const remain = Math.max(0, activeTarget - activeProgress);
    progressHtml = `
      <div class="card" style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
          <span style="font-size:13px;color:#666">
            当前目标：<b style="color:#3b5bdb">${esc(activeWish.name)}</b>
          </span>
          <span><b style="color:#3b5bdb;font-size:20px">${activeProgress}</b>
            <span style="color:#999;font-size:13px"> / ${activeTarget} 抽</span></span>
        </div>
              <div style="height:12px;background:#eef0f4;border-radius:6px;overflow:hidden;margin:8px 0 4px">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#4c6ef5,#748ffc);border-radius:6px;transition:width .3s"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:6px">
          <span style="font-size:12px;color:#999">${pct}%</span>
          <span style="font-size:12px;color:#e8590c">还差 ${remain} 抽</span>
        </div>
        <div style="font-size:11px;color:#999;margin-top:8px;padding-top:8px;border-top:1px dashed #eee">
          已完成 ${doneList.length} 个 · 剩余 ${list.length} 个 · 全部待攒目标 ${totalTarget} 抽
        </div>
      </div>`;
  }

  // ===== 未完成心愿列表 =====
  const listHtml = list.length ? list.map((w, i) => {
    const isFirst = i === 0;
    const isLast  = i === list.length - 1;
    let statusBadge = '';
    if (i < activeIndex) {
      statusBadge = `<span class="badge green">✓ 已攒够</span>`;
    } else if (i === activeIndex) {
      statusBadge = `<span class="badge" style="background:#e7f5ff;color:#1971c2">进行中</span>`;
    } else {
      statusBadge = `<span class="badge over">待开启</span>`;
    }
    return `
    <div class="row">
      <div style="display:flex;flex-direction:column;gap:2px;margin-right:4px">
        <button class="mini" data-act="wishMoveUp" data-id="${w.id}"
          style="padding:2px 6px;font-size:12px;line-height:1;${isFirst?'opacity:.3;pointer-events:none':''}">▲</button>
        <button class="mini" data-act="wishMoveDown" data-id="${w.id}"
          style="padding:2px 6px;font-size:12px;line-height:1;${isLast?'opacity:.3;pointer-events:none':''}">▼</button>
      </div>
      <div class="grow">
        <div class="name">
          <span style="color:#999;font-size:12px;margin-right:4px">#${i+1}</span>
          ${esc(w.name)} ${statusBadge}
        </div>
        <div class="sub">目标 ${w.target} 抽${w.note ? ' · ' + esc(w.note) : ''}</div>
      </div>
      <button class="mini" data-act="wishDone" data-id="${w.id}" style="background:#ebfbee;color:#2f9e44">完成</button>
      <button class="mini" data-act="wishEdit" data-id="${w.id}">编辑</button>
      <button class="del" data-act="wishDel" data-id="${w.id}">×</button>
    </div>`;
  }).join('') : `<div class="sub" style="padding:14px 0;text-align:center">${doneList.length ? '所有心愿已完成' : '还没有心愿，点上方「＋ 添加心愿」开始'}</div>`;

  // ===== 已完成心愿列表 =====
  const doneHtml = doneList.length ? `
    <div class="section-title" style="font-size:13px;color:#999;margin-top:16px">✅ 已完成（${doneList.length}）</div>
    <div class="list">
      ${doneList.map(w => `
        <div class="row" style="opacity:.65">
          <div class="grow">
            <div class="name" style="text-decoration:line-through;color:#999">${esc(w.name)}</div>
            <div class="sub">目标 ${w.target} 抽${w.note ? ' · ' + esc(w.note) : ''}</div>
          </div>
          <button class="mini" data-act="wishUndone" data-id="${w.id}">恢复</button>
          <button class="del" data-act="wishDel" data-id="${w.id}">×</button>
        </div>`).join('')}
    </div>` : '';

  return `
    <div class="section-title">🎯 心愿清单</div>

    <div class="card" style="margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <div style="flex:1;font-size:13px;color:#666">
          当前可用限定抽：<b style="color:#3b5bdb;font-size:15px">${current}</b> 抽
        </div>
        <button class="mini" data-act="wishShowAdd">＋ 添加心愿</button>
      </div>
      <div style="font-size:11px;color:#999">换算规则：${esc(rule.label)}</div>
    </div>

    ${formHtml}
    ${progressHtml}

    ${list.length ? `<div class="list">${listHtml}</div>` : listHtml}
    ${doneHtml}
  `;
}
/* ===================== 圣遗物下拉框（通用） ===================== */
function renderSetNameSelect(gameId, id, currentName) {
  const names = getAllSetNames(gameId);
  const opts = ['<option value="">-- 选择套装 --</option>']
    .concat(names.map(n => `<option value="${esc(n)}" ${n===currentName?'selected':''}>${esc(n)}</option>`))
    .concat(['<option value="__scatter__" ' + (currentName==='散件'?'selected':'') + '>散件</option>']);
  return `<select class="inp" id="${id}">${opts.join('')}</select>`;
}

/* ===================== 圣遗物副本管理面板（通用） ===================== */
function renderEquipManagePanel(gameId) {
  if (!showEquipManage) return '';
  const dungeons = getEquipDungeons(gameId);

  const listHtml = dungeons.length ? dungeons.map(d => `
    <div class="row" style="padding:10px 0;border-bottom:1px solid #f0f0f2">
      <div class="grow">
        <div class="name">${esc(d.name)}</div>
        <div class="sub">${(d.sets||[]).map(s => esc(s)).join(' / ')}</div>
      </div>
      <button class="del" data-act="equipDel" data-id="${d.id}">×</button>
    </div>`).join('') : `<div class="sub" style="padding:10px 0;text-align:center">还没有副本</div>`;

  return `
    <div class="card" style="margin-bottom:12px">
      <div style="display:flex;align-items:center;margin-bottom:10px">
        <div style="flex:1;font-size:14px;font-weight:600">📚 副本管理</div>
        <button class="mini" data-act="equipToggle">关闭</button>
      </div>
      <div style="font-size:11px;color:#999;margin-bottom:10px;line-height:1.6">
        添加副本时填两个产出套装名。删除副本只影响下拉选项，已保存的角色数据不变。
      </div>
      <div style="display:flex;gap:6px;margin-bottom:8px">
        <input class="inp" id="eqName" placeholder="副本名" style="flex:1">
      </div>
      <div style="display:flex;gap:6px;margin-bottom:10px">
        <input class="inp" id="eqSet1" placeholder="套装1" style="flex:1">
        <input class="inp" id="eqSet2" placeholder="套装2" style="flex:1">
      </div>
      <div style="display:flex;gap:8px;margin-bottom:14px">
        <button class="btn" data-act="equipAdd">添加副本</button>
      </div>
      <div style="font-size:12px;font-weight:600;margin-bottom:6px">现有副本（${dungeons.length}）</div>
      ${listHtml}
    </div>`;
}