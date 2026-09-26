/* ===================== 未定事件簿 ===================== */

function renderWeiding() {
  const d = getGame(WEIDING_ID);
  const labels = [['res','💎 资源'], ['event','📅 活动'], ['gacha','🎴 抽卡'], ['pay','💰 充值']];
  let body = '';
  if (currentTab === 'res')        body = renderWdResTab(d);
  else if (currentTab === 'event') body = renderWdEventTab(d);
  else if (currentTab === 'gacha') body = renderWdGachaTab(d);
  else                             body = renderWdPayTab(d);
  return `<div class="tabs">${labels.map(([k, l]) => `<button class="tab ${currentTab===k?'active':''}" data-tab="${k}">${l}</button>`).join('')}</div>${body}`;
}

/* ---------- 资源页 ---------- */
function renderWdResTab(d) {
  const bank = d.resourceBank || { init: {}, records: [] };
  const totals = calcWdResTotals(d);

  const records = filterByListDate([...(bank.records || [])].sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  const dateUI = renderListDateUI();
  let filtered = records;
  if (wdResFilterType === 'income')  filtered = records.filter(r => r.type === 'income');
  else if (wdResFilterType === 'expense') filtered = records.filter(r => r.type === 'expense');

  let listHtml = '';
  if (!filtered.length) {
    listHtml = `<div class="list"><div class="empty">还没有流水记录</div></div>`;
  } else {
    const groups = {};
    filtered.forEach(r => { const key = r.date || '未知日期'; if (!groups[key]) groups[key] = []; groups[key].push(r); });
    const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    listHtml = dates.map(date => {
      const items = groups[date];
      return `<div class="group-title">📅 ${date}</div><div class="list">${items.map(renderWdBankRow).join('')}</div>`;
    }).join('');
  }

  const initForm = wdResShowForm === 'init' ? `
    <div class="card" style="margin-bottom:12px">
      <div style="font-size:14px;font-weight:600;margin-bottom:10px">⚙️ 设置初始值</div>
      <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
        ${WEIDING_RES_FIELDS.map(f => `
          <div style="flex:1;min-width:90px"><div style="font-size:12px;color:#666;margin-bottom:4px">${f.name}</div>
            <input class="inp" id="wdInit_${f.key}" type="number" value="${bank.init[f.key]||0}">
          </div>`).join('')}
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn ghost" data-act="wdCancelForm">取消</button>
        <button class="btn" data-act="wdSaveInit">保存</button>
      </div>
    </div>` : '';

  const incomeForm  = wdResShowForm === 'income'  ? renderResForm('wd', WEIDING_RES_FIELDS, 'income',  bank, WEIDING_INCOME_SOURCES)  : '';
  const expenseForm = wdResShowForm === 'expense' ? renderResForm('wd', WEIDING_RES_FIELDS, 'expense', bank, WEIDING_EXPENSE_TYPES)    : '';

  return `
    <div class="stats">
      ${WEIDING_RES_FIELDS.map(f => `
        <div class="stat"><div class="num" style="color:${f.color}">${totals[f.key]||0}</div><div class="lbl">${f.name}</div></div>
      `).join('')}
    </div>

    <div style="display:flex;gap:8px;margin-bottom:12px">
      <button class="btn" data-act="wdShowIncome">＋ 收入</button>
      <button class="btn ghost" data-act="wdShowExpense">－ 消耗</button>
      <button class="btn ghost" data-act="wdShowInit" style="flex:0 0 auto;padding:10px 14px">⚙️</button>
    </div>

    ${initForm}
    ${incomeForm}
    ${expenseForm}

    <div style="margin-bottom:12px">
      <select class="sel" id="wdResFilterType">
        <option value="all" ${wdResFilterType==='all'?'selected':''}>全部流水</option>
        <option value="income" ${wdResFilterType==='income'?'selected':''}>只看收入</option>
        <option value="expense" ${wdResFilterType==='expense'?'selected':''}>只看消耗</option>
      </select>
    </div>

    ${dateUI}${listHtml}
    ${renderWishlist('weiding', d)}
  `;
}

function renderWdBankRow(r) {
  const isIncome = r.type === 'income';
  const sign = isIncome ? '＋' : '－';
  const cls = isIncome ? 'badge green' : 'badge warn';
  const parts = [];
  WEIDING_RES_FIELDS.forEach(f => {
    if (r[f.key]) {
      const v = r[f.key];
      parts.push(`${f.name}${v>0?'+':''}${v}`);
    }
  });
  return `
    <div class="row">
      <div class="grow">
        <div class="name"><span class="${cls}">${sign} ${esc(r.category)}</span></div>
        <div class="sub">${parts.join(' · ')}${r.note ? ' · ' + esc(r.note) : ''}</div>
      </div>
      <button class="del" data-act="wdDelBankRec" data-id="${r.id}">×</button>
    </div>`;
}

/* ---------- 活动页 ---------- */
function renderWdEventTab(d) { return renderCommonEventTab(d); }

/* ---------- 抽卡页 ---------- */
function renderWdGachaTab(d) {
  const records = filterByListDate([...(d.gachaRecords || [])].sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  const dateUI = renderListDateUI();

  // 统计
  const totalHits = records.length;
  const upCount = records.filter(r => r.up).length;

  // 表单
  const hitForm = wdShowHitForm ? `
    <div class="card" style="margin-bottom:12px">
      <div id="wdHitTitle" style="font-size:14px;font-weight:600;margin-bottom:10px">✨ 记录出金</div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <div style="flex:1"><div style="font-size:12px;color:#666;margin-bottom:4px">日期</div><input class="inp" id="wdHitDate" type="date" value="${todayStr()}"></div>
        <div style="flex:1"><div style="font-size:12px;color:#666;margin-bottom:4px">第几抽出金</div><input class="inp" id="wdHitPity" type="number" min="1" placeholder="如 60"></div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <div style="flex:1.6"><div style="font-size:12px;color:#666;margin-bottom:4px">卡面名称</div><input class="inp" id="wdHitChar" placeholder="如 罪与罚"></div>
        <div style="flex:1"><div style="font-size:12px;color:#666;margin-bottom:4px">结果</div>
          <select class="inp" id="wdHitUp">
            <option value="1">当期UP</option>
            <option value="0">歪</option>
          </select>
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn ghost" data-act="wdCancelHit">取消</button>
        <button class="btn" data-act="wdSaveHit">保存</button>
      </div>
    </div>` : '';

  // 历史
  const histHtml = records.length ? records.map(r => `
    <div class="row">
      <div class="grow" data-act="wdEditHit" data-id="${r.id}" style="cursor:pointer">
        <div class="name">
          ${esc(r.char)}
          <span class="badge ${r.up?'green':'warn'}">${r.up?'UP':'歪'}</span>
        </div>
        <div class="sub">${fmtDate(r.date)} · 第 ${r.hitPity} 抽出金 · 点此修改</div>
      </div>
      <button class="del" data-act="wdDelHit" data-id="${r.id}">×</button>
    </div>`).join('') : `<div class="empty">还没有出金记录</div>`;

  return `
    <div class="stats">
      <div class="stat"><div class="num">${totalHits}</div><div class="lbl">出金次数</div></div>
      <div class="stat"><div class="num">${upCount}</div><div class="lbl">UP 次数</div></div>
      <div class="stat"><div class="num">${totalHits - upCount}</div><div class="lbl">歪的次数</div></div>
    </div>

    <div style="margin-bottom:12px">
      <button class="btn" data-act="wdShowHitForm" style="width:100%">＋ 记录出金</button>
    </div>

    ${hitForm}

    <div class="section-title">📜 出金记录（${records.length}）</div>
    <div class="list">${dateUI}${histHtml}</div>
  `;
}

/* ---------- 充值页 ---------- */
function renderWdPayTab(d) {
  const list = filterByListDate([...d.purchases].sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  const dateUI = renderListDateUI();
  const now = new Date();
  const curYM = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const curY = `${now.getFullYear()}`;
  const total = d.purchases.reduce((s, p) => s + (+p.amount || 0), 0);
  const monthTotal = d.purchases.filter(p => (p.date || '').startsWith(curYM)).reduce((s, p) => s + (+p.amount || 0), 0);
  const yearTotal = d.purchases.filter(p => (p.date || '').startsWith(curY)).reduce((s, p) => s + (+p.amount || 0), 0);

  const rowHtml = p => `
    <div class="row">
      <div class="grow"><div class="name">${esc(p.item)}</div><div class="sub">${esc(p.date)}${p.note ? ' · ' + esc(p.note) : ''}</div></div>
      <span style="font-weight:600;color:#e8590c">¥${(+p.amount || 0).toFixed(2)}</span>
      <button class="del" data-act="delPay" data-id="${p.id}">×</button>
    </div>`;

  let listHtml = '';
  if (!list.length) listHtml = `<div class="list"><div class="empty">还没有充值记录</div></div>`;
  else if (payGroupBy === 'all') listHtml = `<div class="list">${list.map(rowHtml).join('')}</div>`;
  else if (payGroupBy === 'year') {
    const groups = {};
    list.forEach(p => { const y = (p.date || '').slice(0,4) || '未知'; if (!groups[y]) groups[y] = []; groups[y].push(p); });
    listHtml = Object.keys(groups).sort((a,b)=>b.localeCompare(a)).map(y => {
      const items = groups[y]; const sum = items.reduce((s,p)=>s+(+p.amount||0),0);
      return `<div class="group-title">📅 ${y} 年 · 共 ¥${sum.toFixed(2)}（${items.length} 笔）</div><div class="list">${items.map(rowHtml).join('')}</div>`;
    }).join('');
  } else {
    const groups = {};
    list.forEach(p => { const ym = (p.date || '').slice(0,7) || '未知'; if (!groups[ym]) groups[ym] = []; groups[ym].push(p); });
    listHtml = Object.keys(groups).sort((a,b)=>b.localeCompare(a)).map(ym => {
      const items = groups[ym]; const sum = items.reduce((s,p)=>s+(+p.amount||0),0);
      const parts = ym.split('-');
      const label = parts.length === 2 ? `${parts[0]} 年 ${+parts[1]} 月` : ym;
      return `<div class="group-title">📅 ${label} · 共 ¥${sum.toFixed(2)}（${items.length} 笔）</div><div class="list">${items.map(rowHtml).join('')}</div>`;
    }).join('');
  }

  return `
    <div class="stats">
      <div class="stat"><div class="num">¥${monthTotal.toFixed(0)}</div><div class="lbl">本月</div></div>
      <div class="stat"><div class="num">¥${yearTotal.toFixed(0)}</div><div class="lbl">本年</div></div>
      <div class="stat"><div class="num">¥${total.toFixed(0)}</div><div class="lbl">累计</div></div>
      <div class="stat"><div class="num">${d.purchases.length}</div><div class="lbl">笔数</div></div>
    </div>
    <div class="card">
      <input class="inp" id="payItem" placeholder="买了什么">
      <div style="display:flex;gap:8px;margin-top:10px">
        <input class="inp" id="payAmount" type="number" step="0.01" placeholder="金额" style="flex:1">
        <input class="inp" id="payDate" type="date" value="${todayStr()}" style="flex:1.3">
      </div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn" data-act="addPay">添加记录</button>
      </div>
    </div>
    <div style="margin-bottom:12px">
      <select class="sel" id="payGroupBy">
        <option value="all" ${payGroupBy==='all'?'selected':''}>全部明细</option>
        <option value="month" ${payGroupBy==='month'?'selected':''}>按月份统计</option>
        <option value="year" ${payGroupBy==='year'?'selected':''}>按年份统计</option>
      </select>
    </div>
    ${dateUI}${listHtml}
  `;
}

/* ---------- 事件处理 ---------- */
function handleWdAction(act, t, d) {
  switch (act) {
    // ---- 资源 ----
    case 'wdShowIncome':  { wdResShowForm = 'income';  render(false); break; }
    case 'wdShowExpense': { wdResShowForm = 'expense'; render(false); break; }
    case 'wdShowInit':    { wdResShowForm = 'init';    render(false); break; }
    case 'wdCancelForm':  { wdResShowForm = '';        render(false); break; }

    case 'wdSaveInit': {
      WEIDING_RES_FIELDS.forEach(f => {
        const el = document.getElementById('wdInit_' + f.key);
        if (el) d.resourceBank.init[f.key] = +el.value || 0;
      });
      saveDB(); wdResShowForm = ''; render(false);
      break;
    }
    case 'wdSaveIncome': {
      if (saveResForm('wd', WEIDING_RES_FIELDS, 'income', d)) {
        wdResShowForm = ''; render(false);
      }
      break;
    }
    case 'wdSaveExpense': {
      if (saveResForm('wd', WEIDING_RES_FIELDS, 'expense', d)) {
        wdResShowForm = ''; render(false);
      }
      break;
    }
    case 'wdDelBankRec': {
      if (!confirm('删除这条流水？')) return;
      d.resourceBank.records = d.resourceBank.records.filter(r => r.id !== t.dataset.id);
      saveDB(); render(false);
      break;
    }

    // ---- 抽卡 ----
    case 'wdShowHitForm': {
      wdShowHitForm = true;
      wdHitEditingId = null;
      render(false);
      setTimeout(() => {
        const title = document.getElementById('wdHitTitle');
        if (title) title.textContent = '✨ 记录出金';
      }, 30);
      break;
    }
    case 'wdCancelHit': {
      wdShowHitForm = false;
      wdHitEditingId = null;
      render(false);
      break;
    }
    case 'wdEditHit': {
      const recId = t.dataset.id;
      const rec = (d.gachaRecords || []).find(r => r.id === recId);
      if (!rec) return;
      wdShowHitForm = true;
      wdHitEditingId = recId;
      render(false);
      setTimeout(() => {
        const title = document.getElementById('wdHitTitle');
        if (title) title.textContent = '✏️ 修改出金记录';
        document.getElementById('wdHitDate').value = rec.date || todayStr();
        document.getElementById('wdHitPity').value = rec.hitPity;
        document.getElementById('wdHitChar').value = rec.char || '';
        document.getElementById('wdHitUp').value = rec.up ? '1' : '0';
      }, 30);
      break;
    }
    case 'wdSaveHit': {
      const date = document.getElementById('wdHitDate').value || todayStr();
      const hitPity = +document.getElementById('wdHitPity').value;
      const char = document.getElementById('wdHitChar').value.trim();
      const up = document.getElementById('wdHitUp').value === '1';
      if (!hitPity) { alert('请填第几抽出金'); return; }
      if (!char) { alert('请填卡面名称'); return; }

      if (wdHitEditingId) {
        const rec = (d.gachaRecords || []).find(r => r.id === wdHitEditingId);
        if (rec) { rec.date = date; rec.hitPity = hitPity; rec.char = char; rec.up = up; }
      } else {
        d.gachaRecords.push({ id: uid(), date, hitPity, char, up });
      }
      saveDB();
      wdShowHitForm = false;
      wdHitEditingId = null;
      render(false);
      break;
    }
    case 'wdDelHit': {
      if (!confirm('删除这条出金记录？')) return;
      d.gachaRecords = d.gachaRecords.filter(r => r.id !== t.dataset.id);
      saveDB(); render(false);
      break;
    }
  }
}