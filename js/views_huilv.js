function renderHuilv() {
  const d = getGame(HUILV_ID);
  const labels = [['res','💎 资源'], ['event','📅 活动'], ['gacha','🎴 抽卡'], ['pay','💰 充值']];
  let body = '';
  if (currentTab === 'res')        body = renderResTab(d);
  else if (currentTab === 'event') body = renderEventTab(d);
  else if (currentTab === 'gacha') body = renderGachaTab(d);
  else                             body = renderPayTab(d);
  return `<div class="tabs">${labels.map(([k, l]) => `<button class="tab ${currentTab===k?'active':''}" data-tab="${k}">${l}</button>`).join('')}</div>${body}`;
}

function renderResTab(d) {
  const bank = d.resourceBank || { init: { purple: 0, red: 0, paint: 0 }, records: [] };
  const totals = calcResourceTotals(d);

  // ===== 流水列表 =====
    const records = filterByListDate([...(bank.records || [])].sort((a, b) => {
    const d1 = a.date || '', d2 = b.date || '';
    if (d1 !== d2) return d2.localeCompare(d1);
    return (b.id || '').localeCompare(a.id || '');
  }));
  const dateUI = renderListDateUI();
  let filtered = records;
  if (resFilterType === 'income')  filtered = records.filter(r => r.type === 'income');
  else if (resFilterType === 'expense') filtered = records.filter(r => r.type === 'expense');

  let listHtml = '';
  if (!filtered.length) {
    listHtml = `<div class="list"><div class="empty">还没有流水记录</div></div>`;
  } else {
    const groups = {};
    filtered.forEach(r => { const key = r.date || '未知日期'; if (!groups[key]) groups[key] = []; groups[key].push(r); });
    const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    listHtml = dates.map(date => {
      const items = groups[date];
      return `<div class="group-title">📅 ${date}</div><div class="list">${items.map(renderBankRow).join('')}</div>`;
    }).join('');
  }

   const initForm = huilvResShowForm === 'init' ? `
    <div class="card" style="margin-bottom:12px">
      <div style="font-size:14px;font-weight:600;margin-bottom:10px">⚙️ 设置初始值</div>
      <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
        ${HL_RES_FIELDS.map(f => `
          <div style="flex:1;min-width:90px"><div style="font-size:12px;color:#666;margin-bottom:4px">${f.name}</div>
            <input class="inp" id="huilvInit_${f.key}" type="number" value="${bank.init[f.key]||0}">
          </div>`).join('')}
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn ghost" data-act="huilvCancelForm">取消</button>
        <button class="btn" data-act="huilvSaveInit">保存</button>
      </div>
    </div>` : '';

  const incomeForm  = huilvResShowForm === 'income'  ? renderResForm('huilv', HL_RES_FIELDS, 'income',  bank, INCOME_SOURCES)  : '';
  const expenseForm = huilvResShowForm === 'expense' ? renderResForm('huilv', HL_RES_FIELDS, 'expense', bank, EXPENSE_TYPES)    : '';

  return `
    <div class="stats">
      <div class="stat"><div class="num" style="color:#7048e8">${totals.purple}</div><div class="lbl">紫钻</div></div>
      <div class="stat"><div class="num" style="color:#e8590c">${totals.red}</div><div class="lbl">红钻</div></div>
      <div class="stat"><div class="num" style="color:#3b5bdb">${totals.paint}</div><div class="lbl">颜料</div></div>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:12px">
      <button class="btn" data-act="huilvShowIncome">＋ 收入</button>
      <button class="btn ghost" data-act="huilvShowExpense">－ 消耗</button>
      <button class="btn ghost" data-act="huilvShowInit" style="flex:0 0 auto;padding:10px 14px">⚙️</button>
    </div>

    ${initForm}
    ${incomeForm}
    ${expenseForm}

    <div style="margin-bottom:12px">
      <select class="sel" id="resFilterType">
        <option value="all" ${resFilterType==='all'?'selected':''}>全部流水</option>
        <option value="income" ${resFilterType==='income'?'selected':''}>只看收入</option>
        <option value="expense" ${resFilterType==='expense'?'selected':''}>只看消耗</option>
      </select>
    </div>

    ${dateUI}${listHtml}
    ${renderWishlist('huilv', d)}
  `;
}

function renderBankRow(r) {
  const isIncome = r.type === 'income';
  const sign = isIncome ? '＋' : '－';
  const cls = isIncome ? 'badge green' : 'badge warn';
  const parts = [];
  if (r.purple) parts.push(`紫钻${r.purple>0?'+':''}${r.purple}`);
  if (r.red)    parts.push(`红钻${r.red>0?'+':''}${r.red}`);
  if (r.paint)  parts.push(`颜料${r.paint>0?'+':''}${r.paint}`);
  return `
    <div class="row">
      <div class="grow">
        <div class="name"><span class="${cls}">${sign} ${esc(r.category)}</span></div>
        <div class="sub">${parts.join(' · ')}${r.note ? ' · ' + esc(r.note) : ''}</div>
      </div>
      <button class="del" data-act="delBankRec" data-id="${r.id}">×</button>
    </div>`;
}
function renderEventTab(d) { return renderCommonEventTab(d); }

function renderPayTab(d) {
    const list = filterByListDate([...d.purchases].sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  const dateUI = renderListDateUI();
  const now = new Date();
  const curYM = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const curY = `${now.getFullYear()}`;

  const total = d.purchases.reduce((s, p) => s + (+p.amount || 0), 0);
  const monthTotal = d.purchases.filter(p => (p.date || '').startsWith(curYM)).reduce((s, p) => s + (+p.amount || 0), 0);
  const yearTotal = d.purchases.filter(p => (p.date || '').startsWith(curY)).reduce((s, p) => s + (+p.amount || 0), 0);

  // 单行渲染
  const rowHtml = p => `
    <div class="row">
      <div class="grow">
        <div class="name">${esc(p.item)}</div>
        <div class="sub">${esc(p.date)}${p.note ? ' · ' + esc(p.note) : ''}</div>
      </div>
      <span style="font-weight:600;color:#e8590c">¥${(+p.amount || 0).toFixed(2)}</span>
      <button class="del" data-act="delPay" data-id="${p.id}">×</button>
    </div>`;

  // ===== 分组渲染 =====
  let listHtml = '';
  if (!list.length) {
    listHtml = `<div class="list"><div class="empty">还没有充值记录</div></div>`;
  } else if (payGroupBy === 'all') {
    listHtml = `<div class="list">${list.map(rowHtml).join('')}</div>`;
  } else if (payGroupBy === 'year') {
    const groups = {};
    list.forEach(p => {
      const y = (p.date || '').slice(0, 4) || '未知';
      if (!groups[y]) groups[y] = [];
      groups[y].push(p);
    });
    listHtml = Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(y => {
      const items = groups[y];
      const sum = items.reduce((s, p) => s + (+p.amount || 0), 0);
      return `<div class="group-title">📅 ${y} 年 · 共 ¥${sum.toFixed(2)}（${items.length} 笔）</div>
              <div class="list">${items.map(rowHtml).join('')}</div>`;
    }).join('');
  } else {
    const groups = {};
    list.forEach(p => {
      const ym = (p.date || '').slice(0, 7) || '未知';
      if (!groups[ym]) groups[ym] = [];
      groups[ym].push(p);
    });
    listHtml = Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(ym => {
      const items = groups[ym];
      const sum = items.reduce((s, p) => s + (+p.amount || 0), 0);
      const parts = ym.split('-');
      const label = parts.length === 2 ? `${parts[0]} 年 ${+parts[1]} 月` : ym;
      return `<div class="group-title">📅 ${label} · 共 ¥${sum.toFixed(2)}（${items.length} 笔）</div>
              <div class="list">${items.map(rowHtml).join('')}</div>`;
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
      <input class="inp" id="payItem" placeholder="买了什么，如 月卡 / 特惠礼包">
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

function renderGame(id) {
  const d = getGame(id);

  const resHtml = d.resources.length
    ? d.resources.map(r => `
        <div class="row">
          <span class="name grow">${esc(r.name)}</span>
          <input class="val" type="number" value="${esc(r.value ?? '')}" data-res="${r.id}">
          <button class="del" data-act="delRes" data-id="${r.id}">×</button>
        </div>`).join('')
    : `<div class="empty">还没有资源</div>`;

  const preset = PRESET_RESOURCES[id] || [];
  const allNames = [...new Set([...preset, ...(d.resourceNames || [])])];
  const datalist = `<datalist id="resNameList">${allNames.map(n => `<option value="${esc(n)}">`).join('')}</datalist>`;

  const events = [...d.events].sort((a, b) => (a.end || '9999').localeCompare(b.end || '9999'));
  const evHtml = events.length
    ? events.map(ev => {
        const info = leftInfo(ev.end);
        const badge = info ? `<span class="badge ${info.over?'over':(info.urgent?'warn':'')}">${info.text}</span>` : '';
        return `
          <div class="row">
            <div class="grow">
              <div class="name">${esc(ev.name)}</div>
              <div class="sub">${fmtDT(ev.start)}${ev.start && ev.end ? ' → ' : ''}${fmtDT(ev.end)}</div>
            </div>
            ${badge}
            <button class="del" data-act="delEv" data-id="${ev.id}">×</button>
          </div>`;
      }).join('')
    : `<div class="empty">还没有活动</div>`;

  return `
    <div class="section-title">💎 资源</div>
    <div class="list">${resHtml}</div>
    ${datalist}
    <div class="add-form">
      <input id="resName" list="resNameList" placeholder="输入或从建议选择">
      <button data-act="addRes">添加</button>
    </div>

    <div class="section-title">📅 活动</div>
    <div class="list">${evHtml}</div>
    <div class="add-form"><input id="evName" placeholder="活动名称"></div>
    <div class="add-form" style="margin-top:8px">
      <input id="evStart" type="datetime-local">
      <input id="evEnd" type="datetime-local">
    </div>
    <div class="add-form" style="margin-top:8px">
      <button data-act="addEv">添加活动</button>
    </div>
  `;
}