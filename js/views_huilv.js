function renderHuilv() {
  const d = getGame(HUILV_ID);
  const labels = [
    ['res','💎 资源'],
    ['event','📅 活动'],
    ['gacha','🎴 抽卡'],
    ['pay','💰 充值'],
    ['yearcard','🎫 年卡'],
  ];
  let body = '';
  if (currentTab === 'res')           body = renderResTab(d);
  else if (currentTab === 'event')    body = renderEventTab(d);
  else if (currentTab === 'gacha')    body = renderGachaTab(d);
  else if (currentTab === 'yearcard') body = renderYearCardTab(d);
  else                                body = renderPayTab(d);
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
// ===================== 年卡 =====================
const YEAR_CARD_INIT_PURPLE = 180;
const YEAR_CARD_INIT_PAINT  = 10;
const YEAR_CARD_AMOUNTS = [50, 98, 138, 200];

function ycAmountColor(a) {
  if (a >= 200) return '#e8590c';
  if (a >= 138) return '#7048e8';
  if (a >= 98)  return '#3b5bdb';
  return '#2f9e44';
}

function renderYearCardTab(d) {
  const yc = d.yearlyCard || { startDate: '', records: [] };
  const records = [...(yc.records || [])].sort((a, b) => {
    if ((a.date || '') !== (b.date || '')) return (b.date || '').localeCompare(a.date || '');
    return (b.id || '').localeCompare(a.id || '');
  });

  const total = (yc.records || []).reduce((s, r) => s + (+r.amount || 0), 0);
  const count = (yc.records || []).length;
  const avg   = count ? Math.round(total / count) : 0;
  const purpleTotal = YEAR_CARD_INIT_PURPLE + total;   // 180 + 每周开出的
  // 各档位次数统计
  const tierCount = {};
  YEAR_CARD_AMOUNTS.forEach(a => { tierCount[a] = 0; });
  (yc.records || []).forEach(r => {
    const a = +r.amount || 0;
    if (tierCount[a] !== undefined) tierCount[a]++;
  });
  // 年卡起止提示
  let dayInfo = '';
  if (yc.startDate) {
    const startT = parseTime(yc.startDate);
    if (!isNaN(startT)) {
      const endT = startT + 365 * 24 * 3600 * 1000;
      const daysLeft = Math.ceil((endT - Date.now()) / (24 * 3600 * 1000));
      const ed = new Date(endT);
      const endStr = `${ed.getFullYear()}-${String(ed.getMonth()+1).padStart(2,'0')}-${String(ed.getDate()).padStart(2,'0')}`;
      dayInfo = daysLeft > 0
        ? `<div style="margin-top:6px;font-size:12px;color:#868e96">到期日 ${endStr}，还剩 <b>${daysLeft}</b> 天</div>`
        : `<div style="margin-top:6px;font-size:12px;color:#e03131">年卡已于 ${endStr} 到期</div>`;
    }
  }

  const listHtml = records.length ? records.map(r => `
    <div class="row">
      <div class="grow">
        <div class="name">${esc(r.date || '未填日期')}</div>
        ${r.note ? `<div class="sub">${esc(r.note)}</div>` : ''}
      </div>
      <span style="font-weight:600;color:${ycAmountColor(+r.amount || 0)}">+${r.amount || 0}</span>
      <button class="del" data-act="delYearCard" data-id="${r.id}">×</button>
    </div>
  `).join('') : `<div class="empty">还没有记录，点上面按钮记一笔</div>`;

  const quickBtns = YEAR_CARD_AMOUNTS.map(a =>
    `<button class="btn" data-act="addYearCardQuick" data-amount="${a}"
             style="flex:1;background:${ycAmountColor(a)};padding:10px 4px;font-size:15px">+${a}</button>`
  ).join('');

  return `
    <div class="stats">
      <div class="stat"><div class="num" style="color:#7048e8">${purpleTotal}</div><div class="lbl">紫钻总额</div></div>
      <div class="stat"><div class="num" style="color:#3b5bdb">${YEAR_CARD_INIT_PAINT}</div><div class="lbl">颜料</div></div>
      <div class="stat"><div class="num">${count}</div><div class="lbl">已开次数</div></div>
      <div class="stat"><div class="num">${avg}</div><div class="lbl">平均每次</div></div>
    </div>

    <div class="card" style="margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;margin-bottom:10px">📊 档位统计</div>
      <div style="display:flex;gap:8px">
        ${YEAR_CARD_AMOUNTS.map(a => `
          <div style="flex:1;text-align:center;padding:10px 4px;background:#f8f9fa;border-radius:8px">
            <div style="font-size:18px;font-weight:700;color:${ycAmountColor(a)}">${tierCount[a]}</div>
            <div style="font-size:11px;color:#868e96;margin-top:2px">${a} 档</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="card" style="margin-bottom:12px">
            <div style="font-size:13px;color:#495057;line-height:1.7">
        🎫 <b>购买时立刻到账</b>：180 紫钻 + 10 颜料<br>
        📅 <b>每周开一次</b>：50 / 98 / 138 / 200 紫钻<br>
        💰 <b>一年后</b>可全部提取
        ${dayInfo}
      </div>
      <div style="margin-top:10px;padding-top:10px;border-top:1px dashed #dee2e6;font-size:12px;color:#868e96">
        本周开出：<b style="color:#7048e8">${total}</b> 紫钻 ·
        起始 180 + 累计 ${total} = 总额 <b style="color:#7048e8">${purpleTotal}</b>
      </div>
    </div>

    <div class="card">
      <div style="font-size:13px;font-weight:600;margin-bottom:10px">记一笔本周开出</div>
      <div style="display:flex;gap:6px;margin-bottom:10px">
        ${quickBtns}
      </div>
      <input class="inp" id="ycDate" type="date" value="${todayStr()}">
      <input class="inp" id="ycNote" placeholder="备注（可选）" style="margin-top:8px">
      <div style="font-size:11px;color:#adb5bd;margin-top:6px">
        直接点上面的金额按钮就记录，日期和备注可选填。
      </div>
    </div>

    <div class="section-title">📋 历史记录（${count}）</div>
    <div class="list">${listHtml}</div>
  `;
}