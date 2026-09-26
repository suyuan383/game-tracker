/* ===================== 夜幕之下 ===================== */

function renderYemu() {
  const d = getGame(YEMU_ID);
  const labels = [['res','💎 资源'], ['event','📅 活动'], ['gacha','🎴 抽卡'], ['pay','💰 充值']];
  let body = '';
  if (currentTab === 'res')        body = renderYmResTab(d);
  else if (currentTab === 'event') body = renderYmEventTab(d);
  else if (currentTab === 'gacha') body = renderYmGachaTab(d);
  else                             body = renderYmPayTab(d);
  return `<div class="tabs">${labels.map(([k, l]) => `<button class="tab ${currentTab===k?'active':''}" data-tab="${k}">${l}</button>`).join('')}</div>${body}`;
}

/* ---------- 资源页 ---------- */
function renderYmResTab(d) {
  const bank = d.resourceBank || { init: {}, records: [] };
  const totals = calcYmResTotals(d);

  const records = filterByListDate([...(bank.records || [])].sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  const dateUI = renderListDateUI();
  let filtered = records;
  if (ymResFilterType === 'income')  filtered = records.filter(r => r.type === 'income');
  else if (ymResFilterType === 'expense') filtered = records.filter(r => r.type === 'expense');

  let listHtml = '';
  if (!filtered.length) {
    listHtml = `<div class="list"><div class="empty">还没有流水记录</div></div>`;
  } else {
    const groups = {};
    filtered.forEach(r => { const key = r.date || '未知日期'; if (!groups[key]) groups[key] = []; groups[key].push(r); });
    const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    listHtml = dates.map(date => {
      const items = groups[date];
      return `<div class="group-title">📅 ${date}</div><div class="list">${items.map(renderYmBankRow).join('')}</div>`;
    }).join('');
  }

  const initForm = ymResShowForm === 'init' ? `
    <div class="card" style="margin-bottom:12px">
      <div style="font-size:14px;font-weight:600;margin-bottom:10px">⚙️ 设置初始值</div>
      <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
        ${YEMU_RES_FIELDS.map(f => `
          <div style="flex:1;min-width:90px"><div style="font-size:12px;color:#666;margin-bottom:4px">${f.name}</div>
            <input class="inp" id="ymInit_${f.key}" type="number" value="${bank.init[f.key]||0}">
          </div>`).join('')}
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn ghost" data-act="ymCancelForm">取消</button>
        <button class="btn" data-act="ymSaveInit">保存</button>
      </div>
    </div>` : '';

  const incomeForm  = ymResShowForm === 'income'  ? renderResForm('ym', YEMU_RES_FIELDS, 'income',  bank, YEMU_INCOME_SOURCES)  : '';
  const expenseForm = ymResShowForm === 'expense' ? renderResForm('ym', YEMU_RES_FIELDS, 'expense', bank, YEMU_EXPENSE_TYPES)    : '';

  return `
    <div class="stats">
      ${YEMU_RES_FIELDS.map(f => `
        <div class="stat"><div class="num" style="color:${f.color}">${totals[f.key]||0}</div><div class="lbl">${f.name}</div></div>
      `).join('')}
    </div>

    <div style="display:flex;gap:8px;margin-bottom:12px">
      <button class="btn" data-act="ymShowIncome">＋ 收入</button>
      <button class="btn ghost" data-act="ymShowExpense">－ 消耗</button>
      <button class="btn ghost" data-act="ymShowInit" style="flex:0 0 auto;padding:10px 14px">⚙️</button>
    </div>

    ${initForm}
    ${incomeForm}
    ${expenseForm}

    <div style="margin-bottom:12px">
      <select class="sel" id="ymResFilterType">
        <option value="all" ${ymResFilterType==='all'?'selected':''}>全部流水</option>
        <option value="income" ${ymResFilterType==='income'?'selected':''}>只看收入</option>
        <option value="expense" ${ymResFilterType==='expense'?'selected':''}>只看消耗</option>
      </select>
    </div>

    ${dateUI}${listHtml}
    ${renderWishlist('yemu', d)}
  `;
}

function renderYmBankRow(r) {
  const isIncome = r.type === 'income';
  const sign = isIncome ? '＋' : '－';
  const cls = isIncome ? 'badge green' : 'badge warn';
  const parts = [];
  YEMU_RES_FIELDS.forEach(f => {
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
      <button class="del" data-act="ymDelBankRec" data-id="${r.id}">×</button>
    </div>`;
}

/* ---------- 活动页 ---------- */
function renderYmEventTab(d) { return renderCommonEventTab(d); }

/* ---------- 抽卡页 ---------- */
function renderYmGachaTab(d) {
  const banks = d.gachaBanks || {};
  const records = filterByListDate([...(d.gachaRecords || [])].sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  const dateUI = renderListDateUI();

  const poolCards = YEMU_POOLS.map(pool => {
    const bank = banks[pool.key] || { pity: pool.max, max: pool.max, guaranteed: false };
    const left = bank.pity;
    const isOver = left <= 0;
    const statusBadge = pool.hasGuaranteed
      ? (bank.guaranteed
          ? `<span class="badge warn">🔶 大保底（下个金必UP）</span>`
          : `<span class="badge">🔷 小保底（可能歪）</span>`)
      : `<span class="badge over">常驻无UP</span>`;
    const pct = Math.min(100, Math.round((pool.max - left) / pool.max * 100));

    return `
      <div class="card" style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="font-size:15px;font-weight:600">🎴 ${pool.name}</div>
          ${statusBadge}
        </div>
        <div style="display:flex;justify-content:space-between;font-size:14px;align-items:baseline;margin-bottom:4px">
          <span>距保底</span>
          <span><b style="color:${isOver?'#e03131':'#3b5bdb'};font-size:20px">${left}</b> / ${pool.max} 抽</span>
        </div>
        <div class="progress ${isOver?'danger':''}"><i style="width:${pct}%"></i></div>
        <div style="display:flex;gap:6px;margin-top:10px">
          <button class="btn ghost" data-act="ymPityAdd" data-pool="${pool.key}" data-n="-1" style="flex:0 0 auto;padding:8px 12px">－1</button>
          <button class="btn" data-act="ymPityAdd" data-pool="${pool.key}" data-n="1">＋1 抽</button>
          <button class="btn" data-act="ymPityAdd" data-pool="${pool.key}" data-n="10">＋10 抽</button>
          <button class="btn gold" data-act="ymShowHitForm" data-pool="${pool.key}" style="flex:0 0 auto;padding:8px 12px">记录出金</button>
        </div>
        <div style="margin-top:8px;display:flex;justify-content:flex-end">
          <button class="mini" data-act="ymPityReset" data-pool="${pool.key}">重置本池保底</button>
        </div>
      </div>`;
  }).join('');

  const histHtml = records.length ? records.map(r => {
    const poolCfg = YEMU_POOLS.find(p => p.key === r.poolType);
    const poolName = poolCfg ? poolCfg.name : '未知池';
    const upBadge = poolCfg && poolCfg.hasGuaranteed
      ? `<span class="badge ${r.up ? 'green' : 'warn'}">${r.up ? 'UP' : '歪'}</span>`
      : '';
    return `
      <div class="row">
        <div class="grow" data-act="ymEditGachaRec" data-id="${r.id}" style="cursor:pointer">
          <div class="name">${esc(r.char || '（未填）')} ${upBadge}</div>
          <div class="sub">${fmtDate(r.date)} · ${poolName} · 第 ${r.hitPity} 抽出金 · 点此修改</div>
        </div>
        <button class="del" data-act="ymDelGachaRec" data-id="${r.id}">×</button>
      </div>`;
  }).join('') : `<div class="empty">还没有出金记录</div>`;

  return `
    <div class="section-title">📊 当前保底进度</div>
    ${poolCards}

    <div class="section-title">✨ 记录出金</div>
    <div class="card hide" id="ymHitForm">
      <input type="hidden" id="ymHitPool">
      <input type="hidden" id="ymEditingRecId">
      <div id="ymHitFormTitle" style="font-size:14px;font-weight:600;margin-bottom:10px">✨ 记录出金</div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <div style="flex:1"><div style="font-size:12px;color:#666;margin-bottom:4px">日期</div><input class="inp" id="ymHitDate" type="date" value="${todayStr()}"></div>
        <div style="flex:1"><div style="font-size:12px;color:#666;margin-bottom:4px">卡池</div>
          <select class="inp" id="ymHitPoolSel">
            ${YEMU_POOLS.map(p => `<option value="${p.key}">${p.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <div style="flex:1"><div style="font-size:12px;color:#666;margin-bottom:4px">第几抽出金</div><input class="inp" id="ymHitPity" type="number" min="1" value="1"></div>
        <div style="flex:1.4"><div style="font-size:12px;color:#666;margin-bottom:4px">角色名</div><input class="inp" id="ymHitChar" placeholder="如 沈星回"></div>
      </div>
      <div id="ymHitUpGroup" style="margin-bottom:10px">
        <div style="font-size:12px;color:#666;margin-bottom:4px">本次结果</div>
        <select class="inp" id="ymHitUp">
          <option value="1">UP（没歪）</option>
          <option value="0">歪了</option>
        </select>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn ghost" data-act="ymCancelHit">取消</button>
        <button class="btn" data-act="ymSaveHit">保存</button>
      </div>
    </div>

    <div class="section-title">📜 出货历史（${records.length}）</div>
    <div class="list">${dateUI}${histHtml}</div>
  `;
}

/* ---------- 充值页 ---------- */
function renderYmPayTab(d) {
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
function handleYmAction(act, t, d) {
  switch (act) {
    // ---- 资源 ----
    case 'ymShowIncome':  { ymResShowForm = 'income';  render(false); break; }
    case 'ymShowExpense': { ymResShowForm = 'expense'; render(false); break; }
    case 'ymShowInit':    { ymResShowForm = 'init';    render(false); break; }
    case 'ymCancelForm':  { ymResShowForm = '';        render(false); break; }

    case 'ymSaveInit': {
      YEMU_RES_FIELDS.forEach(f => {
        const el = document.getElementById('ymInit_' + f.key);
        if (el) d.resourceBank.init[f.key] = +el.value || 0;
      });
      saveDB(); ymResShowForm = ''; render(false);
      break;
    }
    case 'ymSaveIncome': {
      if (saveResForm('ym', YEMU_RES_FIELDS, 'income', d)) {
        ymResShowForm = ''; render(false);
      }
      break;
    }
    case 'ymSaveExpense': {
      if (saveResForm('ym', YEMU_RES_FIELDS, 'expense', d)) {
        ymResShowForm = ''; render(false);
      }
      break;
    }
    case 'ymDelBankRec': {
      if (!confirm('删除这条流水？')) return;
      d.resourceBank.records = d.resourceBank.records.filter(r => r.id !== t.dataset.id);
      saveDB(); render(false);
      break;
    }

    // ---- 抽卡 ----
    case 'ymPityAdd': {
      const poolKey = t.dataset.pool;
      const n = +t.dataset.n || 1;
      const bank = d.gachaBanks[poolKey];
      if (!bank) return;
      bank.pity = Math.max(0, bank.pity - n);
      saveDB(); render(false);
      break;
    }
    case 'ymPityReset': {
      const poolKey = t.dataset.pool;
      if (!confirm('把本池距保底重置为最大值？')) return;
      const bank = d.gachaBanks[poolKey];
      if (!bank) return;
      const poolCfg = YEMU_POOLS.find(p => p.key === poolKey);
      bank.pity = poolCfg.max;
      saveDB(); render(false);
      break;
    }
    case 'ymShowHitForm': {
      const poolKey = t.dataset.pool;
      const form = document.getElementById('ymHitForm');
      const sel = document.getElementById('ymHitPoolSel');
      if (!form) return;
      form.classList.remove('hide');
      document.getElementById('ymHitPool').value = poolKey;
      document.getElementById('ymEditingRecId').value = '';
      document.getElementById('ymHitFormTitle').textContent = '✨ 记录出金';
      if (sel) sel.value = poolKey;

      const bank = d.gachaBanks[poolKey];
      const poolCfg = YEMU_POOLS.find(p => p.key === poolKey);
      const defaultPity = poolCfg.max - bank.pity + 1;
      document.getElementById('ymHitPity').value = Math.max(1, defaultPity);

      const upGrp = document.getElementById('ymHitUpGroup');
      if (poolCfg.hasGuaranteed) upGrp.classList.remove('hide');
      else upGrp.classList.add('hide');

      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;
    }
    case 'ymEditGachaRec': {
      const recId = t.dataset.id;
      const rec = (d.gachaRecords || []).find(r => r.id === recId);
      if (!rec) return;
      const form = document.getElementById('ymHitForm');
      form.classList.remove('hide');
      document.getElementById('ymEditingRecId').value = recId;
      document.getElementById('ymHitFormTitle').textContent = '✏️ 修改出金记录';
      document.getElementById('ymHitDate').value = rec.date || todayStr();
      document.getElementById('ymHitPoolSel').value = rec.poolType;
      document.getElementById('ymHitPity').value = rec.hitPity;
      document.getElementById('ymHitChar').value = rec.char || '';
      document.getElementById('ymHitUp').value = rec.up ? '1' : '0';

      const poolCfg = YEMU_POOLS.find(p => p.key === rec.poolType);
      const upGrp = document.getElementById('ymHitUpGroup');
      if (poolCfg && poolCfg.hasGuaranteed) upGrp.classList.remove('hide');
      else upGrp.classList.add('hide');

      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;
    }
    case 'ymCancelHit': {
      const form = document.getElementById('ymHitForm');
      if (form) form.classList.add('hide');
      break;
    }
    case 'ymSaveHit': {
      const poolKey = document.getElementById('ymHitPoolSel').value;
      const poolCfg = YEMU_POOLS.find(p => p.key === poolKey);
      const date = document.getElementById('ymHitDate').value || todayStr();
      const hitPity = +document.getElementById('ymHitPity').value;
      const char = document.getElementById('ymHitChar').value.trim();
      if (!hitPity) { alert('请填第几抽出金'); return; }
      if (!char) { alert('请填角色名'); return; }

      let isUp = true;
      if (poolCfg.hasGuaranteed) {
        isUp = document.getElementById('ymHitUp').value === '1';
      }

      const editingId = document.getElementById('ymEditingRecId').value;

      if (editingId) {
        const rec = (d.gachaRecords || []).find(r => r.id === editingId);
        if (rec) {
          rec.date = date;
          rec.poolType = poolKey;
          rec.poolName = poolCfg.name;
          rec.hitPity = hitPity;
          rec.char = char;
          rec.up = isUp;
        }
      } else {
        d.gachaRecords.push({
          id: uid(), date, poolType: poolKey, poolName: poolCfg.name,
          hitPity, char, up: isUp
        });
        const bank = d.gachaBanks[poolKey];
        bank.pity = poolCfg.max;
        if (poolCfg.hasGuaranteed) {
          bank.guaranteed = !isUp;
        }
      }

      saveDB();
      document.getElementById('ymHitForm').classList.add('hide');
      render(false);
      break;
    }
    case 'ymDelGachaRec': {
      if (!confirm('删除这条出货记录？保底进度不会回滚。')) return;
      d.gachaRecords = d.gachaRecords.filter(r => r.id !== t.dataset.id);
      saveDB(); render(false);
      break;
    }
  }
}