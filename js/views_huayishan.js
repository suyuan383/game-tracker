/* ===================== 花亦山心之月 ===================== */

function renderHuayishan() {
  const d = getGame(HUAYISHAN_ID);
  const labels = [['res','💎 资源'], ['event','📅 活动'], ['gacha','🎴 抽卡'], ['pay','💰 充值']];
  let body = '';
  if (currentTab === 'res')        body = renderHyResTab(d);
  else if (currentTab === 'event') body = renderHyEventTab(d);
  else if (currentTab === 'gacha') body = renderHyGachaTab(d);
  else                             body = renderHyPayTab(d);
  return `<div class="tabs">${labels.map(([k, l]) => `<button class="tab ${currentTab===k?'active':''}" data-tab="${k}">${l}</button>`).join('')}</div>${body}`;
}

/* ---------- 资源页 ---------- */
function renderHyResTab(d) {
  const bank = d.resourceBank || { init: {}, records: [] };
  const totals = calcHyResTotals(d);

  const records = filterByListDate([...(bank.records || [])].sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  const dateUI = renderListDateUI();
  let filtered = records;
  if (hyResFilterType === 'income')  filtered = records.filter(r => r.type === 'income');
  else if (hyResFilterType === 'expense') filtered = records.filter(r => r.type === 'expense');

  let listHtml = '';
  if (!filtered.length) {
    listHtml = `<div class="list"><div class="empty">还没有流水记录</div></div>`;
  } else {
    const groups = {};
    filtered.forEach(r => { const key = r.date || '未知日期'; if (!groups[key]) groups[key] = []; groups[key].push(r); });
    const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    listHtml = dates.map(date => {
      const items = groups[date];
      return `<div class="group-title">📅 ${date}</div><div class="list">${items.map(renderHyBankRow).join('')}</div>`;
    }).join('');
  }

    const initForm = hyResShowForm === 'init' ? `
    <div class="card" style="margin-bottom:12px">
      <div style="font-size:14px;font-weight:600;margin-bottom:10px">⚙️ 设置初始值</div>
      <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
        ${HUAYISHAN_RES_FIELDS.map(f => `
          <div style="flex:1;min-width:90px"><div style="font-size:12px;color:#666;margin-bottom:4px">${f.name}</div>
            <input class="inp" id="hyInit_${f.key}" type="number" value="${bank.init[f.key]||0}">
          </div>`).join('')}
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn ghost" data-act="hyCancelForm">取消</button>
        <button class="btn" data-act="hySaveInit">保存</button>
      </div>
    </div>` : '';

  const incomeForm  = hyResShowForm === 'income'  ? renderResForm('hy', HUAYISHAN_RES_FIELDS, 'income',  bank, HUAYISHAN_INCOME_SOURCES)  : '';
  const expenseForm = hyResShowForm === 'expense' ? renderResForm('hy', HUAYISHAN_RES_FIELDS, 'expense', bank, HUAYISHAN_EXPENSE_TYPES)    : '';

  return `
    <div class="stats">
      ${HUAYISHAN_RES_FIELDS.map(f => `
        <div class="stat"><div class="num" style="color:${f.color}">${totals[f.key]||0}</div><div class="lbl">${f.name}</div></div>
      `).join('')}
    </div>

    <div style="display:flex;gap:8px;margin-bottom:12px">
      <button class="btn" data-act="hyShowIncome">＋ 收入</button>
      <button class="btn ghost" data-act="hyShowExpense">－ 消耗</button>
      <button class="btn ghost" data-act="hyShowInit" style="flex:0 0 auto;padding:10px 14px">⚙️</button>
    </div>

    ${initForm}
    ${incomeForm}
    ${expenseForm}

    <div style="margin-bottom:12px">
      <select class="sel" id="hyResFilterType">
        <option value="all" ${hyResFilterType==='all'?'selected':''}>全部流水</option>
        <option value="income" ${hyResFilterType==='income'?'selected':''}>只看收入</option>
        <option value="expense" ${hyResFilterType==='expense'?'selected':''}>只看消耗</option>
      </select>
    </div>

    ${dateUI}${listHtml}
    ${renderWishlist('huayishan', d)}
  `;
}

function renderHyBankRow(r) {
  const isIncome = r.type === 'income';
  const sign = isIncome ? '＋' : '－';
  const cls = isIncome ? 'badge green' : 'badge warn';
  const parts = [];
  HUAYISHAN_RES_FIELDS.forEach(f => {
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
      <button class="del" data-act="hyDelBankRec" data-id="${r.id}">×</button>
    </div>`;
}

/* ---------- 活动页 ---------- */
function renderHyEventTab(d) { return renderCommonEventTab(d); }

/* ---------- 抽卡页 ---------- */
function renderHyGachaTab(d) {
  const allRecords = d.gachaRecords || [];

  // 筛选
  let records = allRecords;
  if (hyFilterPool && hyFilterPool !== 'all') {
    records = records.filter(r => r.poolType === hyFilterPool);
  }
  records = filterByListDate([...records].sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  const dateUI = renderListDateUI();

  // 统计
  const totalHits = records.length;
  const upCount = records.filter(r => r.up).length;
  const limitedCount = allRecords.filter(r => r.poolType === 'limited').length;
  const pool100Count = allRecords.filter(r => r.poolType === 'pool100').length;

  // 表单
  const hitForm = hyShowHitForm ? `
    <div class="card" style="margin-bottom:12px">
      <div id="hyHitTitle" style="font-size:14px;font-weight:600;margin-bottom:10px">✨ 记录出金</div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <div style="flex:1"><div style="font-size:12px;color:#666;margin-bottom:4px">日期</div><input class="inp" id="hyHitDate" type="date" value="${todayStr()}"></div>
        <div style="flex:1"><div style="font-size:12px;color:#666;margin-bottom:4px">卡池</div>
          <select class="inp" id="hyHitPool">
            ${HUAYISHAN_POOLS.map(p => `<option value="${p.key}">${p.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <div style="flex:1"><div style="font-size:12px;color:#666;margin-bottom:4px">第几抽出金</div><input class="inp" id="hyHitPity" type="number" min="1" placeholder="如 60"></div>
        <div style="flex:1.4"><div style="font-size:12px;color:#666;margin-bottom:4px">卡面名称</div><input class="inp" id="hyHitChar" placeholder="如 破阵子"></div>
      </div>
      <div style="margin-bottom:10px">
        <div style="font-size:12px;color:#666;margin-bottom:4px">结果</div>
        <select class="inp" id="hyHitUp">
          <option value="1">当期UP</option>
          <option value="0">歪</option>
        </select>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn ghost" data-act="hyCancelHit">取消</button>
        <button class="btn" data-act="hySaveHit">保存</button>
      </div>
    </div>` : '';

  // 历史
  const histHtml = records.length ? records.map(r => {
    const poolCfg = HUAYISHAN_POOLS.find(p => p.key === r.poolType);
    const poolName = poolCfg ? poolCfg.name : '未知池';
    return `
      <div class="row">
        <div class="grow" data-act="hyEditHit" data-id="${r.id}" style="cursor:pointer">
          <div class="name">
            ${esc(r.char)}
            <span class="badge ${r.up?'green':'warn'}">${r.up?'UP':'歪'}</span>
            <span class="badge">${esc(poolName)}</span>
          </div>
          <div class="sub">${fmtDate(r.date)} · 第 ${r.hitPity} 抽出金 · 点此修改</div>
        </div>
        <button class="del" data-act="hyDelHit" data-id="${r.id}">×</button>
      </div>`;
  }).join('') : `<div class="empty">还没有出金记录</div>`;

  return `
    <div class="stats">
      <div class="stat"><div class="num">${limitedCount}</div><div class="lbl">限定池</div></div>
      <div class="stat"><div class="num">${pool100Count}</div><div class="lbl">100抽池</div></div>
      <div class="stat"><div class="num">${upCount}</div><div class="lbl">UP次数</div></div>
    </div>

    <div style="margin-bottom:12px">
      <button class="btn" data-act="hyShowHitForm" style="width:100%">＋ 记录出金</button>
    </div>

    ${hitForm}

    <div style="margin-bottom:12px">
      <select class="sel" id="hyFilterPool">
        <option value="" ${hyFilterPool===''?'selected':''}>全部卡池</option>
        <option value="limited" ${hyFilterPool==='limited'?'selected':''}>只看限定池</option>
        <option value="pool100" ${hyFilterPool==='pool100'?'selected':''}>只看100抽池</option>
      </select>
    </div>

    <div class="section-title">📜 出金记录（${records.length}${hyFilterPool?' · 已筛选':''}）</div>
    <div class="list">${dateUI}${histHtml}</div>
  `;
}

/* ---------- 充值页 ---------- */
function renderHyPayTab(d) {
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
function handleHyAction(act, t, d) {
  switch (act) {
    // ---- 资源 ----
    case 'hyShowIncome':  { hyResShowForm = 'income';  render(false); break; }
    case 'hyShowExpense': { hyResShowForm = 'expense'; render(false); break; }
    case 'hyShowInit':    { hyResShowForm = 'init';    render(false); break; }
    case 'hyCancelForm':  { hyResShowForm = '';        render(false); break; }

    case 'hySaveInit': {
      HUAYISHAN_RES_FIELDS.forEach(f => {
        const el = document.getElementById('hyInit_' + f.key);
        if (el) d.resourceBank.init[f.key] = +el.value || 0;
      });
      saveDB(); hyResShowForm = ''; render(false);
      break;
    }
    case 'hySaveIncome': {
      if (saveResForm('hy', HUAYISHAN_RES_FIELDS, 'income', d)) {
        hyResShowForm = ''; render(false);
      }
      break;
    }
    case 'hySaveExpense': {
      if (saveResForm('hy', HUAYISHAN_RES_FIELDS, 'expense', d)) {
        hyResShowForm = ''; render(false);
      }
      break;
    }
    case 'hyDelBankRec': {
      if (!confirm('删除这条流水？')) return;
      d.resourceBank.records = d.resourceBank.records.filter(r => r.id !== t.dataset.id);
      saveDB(); render(false);
      break;
    }

    // ---- 抽卡 ----
    case 'hyShowHitForm': {
      hyShowHitForm = true;
      hyHitEditingId = null;
      render(false);
      setTimeout(() => {
        const title = document.getElementById('hyHitTitle');
        if (title) title.textContent = '✨ 记录出金';
        const poolSel = document.getElementById('hyHitPool');
        if (poolSel && hyFilterPool && hyFilterPool !== 'all') poolSel.value = hyFilterPool;
      }, 30);
      break;
    }
    case 'hyCancelHit': {
      hyShowHitForm = false;
      hyHitEditingId = null;
      render(false);
      break;
    }
    case 'hyEditHit': {
      const recId = t.dataset.id;
      const rec = (d.gachaRecords || []).find(r => r.id === recId);
      if (!rec) return;
      hyShowHitForm = true;
      hyHitEditingId = recId;
      render(false);
      setTimeout(() => {
        const title = document.getElementById('hyHitTitle');
        if (title) title.textContent = '✏️ 修改出金记录';
        document.getElementById('hyHitDate').value = rec.date || todayStr();
        document.getElementById('hyHitPool').value = rec.poolType || 'limited';
        document.getElementById('hyHitPity').value = rec.hitPity;
        document.getElementById('hyHitChar').value = rec.char || '';
        document.getElementById('hyHitUp').value = rec.up ? '1' : '0';
      }, 30);
      break;
    }
    case 'hySaveHit': {
      const date = document.getElementById('hyHitDate').value || todayStr();
      const poolType = document.getElementById('hyHitPool').value;
      const hitPity = +document.getElementById('hyHitPity').value;
      const char = document.getElementById('hyHitChar').value.trim();
      const up = document.getElementById('hyHitUp').value === '1';
      if (!hitPity) { alert('请填第几抽出金'); return; }
      if (!char) { alert('请填卡面名称'); return; }

      if (hyHitEditingId) {
        const rec = (d.gachaRecords || []).find(r => r.id === hyHitEditingId);
        if (rec) { rec.date = date; rec.poolType = poolType; rec.hitPity = hitPity; rec.char = char; rec.up = up; }
      } else {
        d.gachaRecords.push({ id: uid(), date, poolType, hitPity, char, up });
      }
      saveDB();
      hyShowHitForm = false;
      hyHitEditingId = null;
      render(false);
      break;
    }
    case 'hyDelHit': {
      if (!confirm('删除这条出金记录？')) return;
      d.gachaRecords = d.gachaRecords.filter(r => r.id !== t.dataset.id);
      saveDB(); render(false);
      break;
    }
  }
}