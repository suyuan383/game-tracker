/* ===================== 原神 ===================== */

function renderYuanshen() {
  const d = getGame(YUANSHEN_ID);
  const labels = [['res','💎 资源'], ['event','📅 活动'], ['gacha','🎴 抽卡'], ['chars','👤 角色'], ['pay','💰 充值']];
  let body = '';
  if (currentTab === 'res')        body = renderYsResTab(d);
  else if (currentTab === 'event') body = renderYsEventTab(d);
  else if (currentTab === 'gacha') body = renderYsGachaTab(d);
  else if (currentTab === 'chars') body = renderYsCharsTab(d);
  else                             body = renderYsPayTab(d);
  return `<div class="tabs">${labels.map(([k, l]) => `<button class="tab ${currentTab===k?'active':''}" data-tab="${k}">${l}</button>`).join('')}</div>${body}`;
}

/* ---------- 资源页 ---------- */
function renderYsResTab(d) {
  const bank = d.resourceBank || { init: {}, records: [] };
  const totals = calcYsResTotals(d);

    const records = filterByListDate([...(bank.records || [])].sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  const dateUI = renderListDateUI();
  let filtered = records;
  if (ysResFilterType === 'income')  filtered = records.filter(r => r.type === 'income');
  else if (ysResFilterType === 'expense') filtered = records.filter(r => r.type === 'expense');

  let listHtml = '';
  if (!filtered.length) {
    listHtml = `<div class="list"><div class="empty">还没有流水记录</div></div>`;
  } else {
    const groups = {};
    filtered.forEach(r => { const key = r.date || '未知日期'; if (!groups[key]) groups[key] = []; groups[key].push(r); });
    const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    listHtml = dates.map(date => {
      const items = groups[date];
      return `<div class="group-title">📅 ${date}</div><div class="list">${items.map(renderYsBankRow).join('')}</div>`;
    }).join('');
  }

    const initForm = ysResShowForm === 'init' ? `
    <div class="card" style="margin-bottom:12px">
      <div style="font-size:14px;font-weight:600;margin-bottom:10px">⚙️ 设置初始值</div>
      <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
        ${YUANSHEN_RES_FIELDS.map(f => `
          <div style="flex:1;min-width:90px"><div style="font-size:12px;color:#666;margin-bottom:4px">${f.name}</div>
            <input class="inp" id="ysInit_${f.key}" type="number" value="${bank.init[f.key]||0}">
          </div>`).join('')}
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn ghost" data-act="ysCancelForm">取消</button>
        <button class="btn" data-act="ysSaveInit">保存</button>
      </div>
    </div>` : '';

  const incomeForm  = ysResShowForm === 'income'  ? renderResForm('ys', YUANSHEN_RES_FIELDS, 'income',  bank, YUANSHEN_INCOME_SOURCES)  : '';
  const expenseForm = ysResShowForm === 'expense' ? renderResForm('ys', YUANSHEN_RES_FIELDS, 'expense', bank, YUANSHEN_EXPENSE_TYPES)    : '';

  return `
    <div class="stats">
      ${YUANSHEN_RES_FIELDS.map(f => `
        <div class="stat"><div class="num" style="color:${f.color}">${totals[f.key]||0}</div><div class="lbl">${f.name}</div></div>
      `).join('')}
    </div>

    <div style="display:flex;gap:8px;margin-bottom:12px">
      <button class="btn" data-act="ysShowIncome">＋ 收入</button>
      <button class="btn ghost" data-act="ysShowExpense">－ 消耗</button>
      <button class="btn ghost" data-act="ysShowInit" style="flex:0 0 auto;padding:10px 14px">⚙️</button>
    </div>

    ${initForm}
    ${incomeForm}
    ${expenseForm}

    <div style="margin-bottom:12px">
      <select class="sel" id="ysResFilterType">
        <option value="all" ${ysResFilterType==='all'?'selected':''}>全部流水</option>
        <option value="income" ${ysResFilterType==='income'?'selected':''}>只看收入</option>
        <option value="expense" ${ysResFilterType==='expense'?'selected':''}>只看消耗</option>
      </select>
    </div>

    ${dateUI}${listHtml}
    ${renderWishlist('yuanshen', d)}
  `;
}

function renderYsBankRow(r) {
  const isIncome = r.type === 'income';
  const sign = isIncome ? '＋' : '－';
  const cls = isIncome ? 'badge green' : 'badge warn';
  const parts = [];
  YUANSHEN_RES_FIELDS.forEach(f => {
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
      <button class="del" data-act="ysDelBankRec" data-id="${r.id}">×</button>
    </div>`;
}

/* ---------- 活动页 ---------- */
function renderYsEventTab(d) { return renderCommonEventTab(d); }

/* ---------- 抽卡页 ---------- */
function renderYsGachaTab(d) {
  const banks = d.gachaBanks || {};
    const records = filterByListDate([...(d.gachaRecords || [])].sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  const dateUI = renderListDateUI();

  const poolCards = YUANSHEN_POOLS.map(pool => {
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
          <button class="btn ghost" data-act="ysPityAdd" data-pool="${pool.key}" data-n="-1" style="flex:0 0 auto;padding:8px 12px">－1</button>
          <button class="btn" data-act="ysPityAdd" data-pool="${pool.key}" data-n="1">＋1 抽</button>
          <button class="btn" data-act="ysPityAdd" data-pool="${pool.key}" data-n="10">＋10 抽</button>
          <button class="btn gold" data-act="ysShowHitForm" data-pool="${pool.key}" style="flex:0 0 auto;padding:8px 12px">记录出金</button>
        </div>
        <div style="margin-top:8px;display:flex;justify-content:flex-end">
          <button class="mini" data-act="ysPityReset" data-pool="${pool.key}">重置本池保底</button>
        </div>
      </div>`;
  }).join('');
  const poolStats = renderPoolStatsCards(calcLimitedPoolStats(d.gachaRecords || [], YUANSHEN_POOLS));
  const histHtml = records.length ? records.map(r => {
    const poolCfg = YUANSHEN_POOLS.find(p => p.key === r.poolType);
    const poolName = poolCfg ? poolCfg.name : '未知池';
    const upBadge = poolCfg && poolCfg.hasGuaranteed
      ? `<span class="badge ${r.up ? 'green' : 'warn'}">${r.up ? 'UP' : '歪'}</span>`
      : '';
    return `
      <div class="row">
        <div class="grow" data-act="ysEditGachaRec" data-id="${r.id}" style="cursor:pointer">
          <div class="name">${esc(r.char || '（未填）')} ${upBadge}</div>
          <div class="sub">${fmtDate(r.date)} · ${poolName} · 第 ${r.hitPity} 抽出金 · 点此修改</div>
        </div>
        <button class="del" data-act="ysDelGachaRec" data-id="${r.id}">×</button>
      </div>`;
  }).join('') : `<div class="empty">还没有出金记录</div>`;

  return `
        <div class="section-title">📊 当前保底进度</div>
    ${poolCards}

    ${poolStats}

    <div class="section-title">✨ 记录出金</div>
    <div class="card hide" id="ysHitForm">
      <input type="hidden" id="ysHitPool">
      <input type="hidden" id="ysEditingRecId">
      <div id="ysHitFormTitle" style="font-size:14px;font-weight:600;margin-bottom:10px">✨ 记录出金</div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <div style="flex:1"><div style="font-size:12px;color:#666;margin-bottom:4px">日期</div><input class="inp" id="ysHitDate" type="date" value="${todayStr()}"></div>
        <div style="flex:1"><div style="font-size:12px;color:#666;margin-bottom:4px">卡池</div>
          <select class="inp" id="ysHitPoolSel">
            ${YUANSHEN_POOLS.map(p => `<option value="${p.key}">${p.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <div style="flex:1"><div style="font-size:12px;color:#666;margin-bottom:4px">第几抽出金</div><input class="inp" id="ysHitPity" type="number" min="1" value="1"></div>
        <div style="flex:1.4"><div style="font-size:12px;color:#666;margin-bottom:4px">角色 / 武器名</div><input class="inp" id="ysHitChar" placeholder="如 那维莱特"></div>
      </div>
      <div id="ysHitUpGroup" style="margin-bottom:10px">
        <div style="font-size:12px;color:#666;margin-bottom:4px">本次结果</div>
        <select class="inp" id="ysHitUp">
          <option value="1">UP（没歪）</option>
          <option value="0">歪了</option>
        </select>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn ghost" data-act="ysCancelHit">取消</button>
        <button class="btn" data-act="ysSaveHit">保存</button>
      </div>
    </div>

    <div class="section-title">📜 出货历史（${records.length}）</div>
    <div class="list">${dateUI}${histHtml}</div>
  `;
}

/* ---------- 充值页 ---------- */
function renderYsPayTab(d) {
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
  if (!list.length) {
    listHtml = `<div class="list"><div class="empty">还没有充值记录</div></div>`;
  } else if (payGroupBy === 'all') {
    listHtml = `<div class="list">${list.map(rowHtml).join('')}</div>`;
  } else if (payGroupBy === 'year') {
    const groups = {};
    list.forEach(p => { const y = (p.date || '').slice(0,4) || '未知'; if (!groups[y]) groups[y] = []; groups[y].push(p); });
    listHtml = Object.keys(groups).sort((a,b)=>b.localeCompare(a)).map(y => {
      const items = groups[y];
      const sum = items.reduce((s,p)=>s+(+p.amount||0),0);
      return `<div class="group-title">📅 ${y} 年 · 共 ¥${sum.toFixed(2)}（${items.length} 笔）</div><div class="list">${items.map(rowHtml).join('')}</div>`;
    }).join('');
  } else {
    const groups = {};
    list.forEach(p => { const ym = (p.date || '').slice(0,7) || '未知'; if (!groups[ym]) groups[ym] = []; groups[ym].push(p); });
    listHtml = Object.keys(groups).sort((a,b)=>b.localeCompare(a)).map(ym => {
      const items = groups[ym];
      const sum = items.reduce((s,p)=>s+(+p.amount||0),0);
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
      <input class="inp" id="payItem" placeholder="买了什么，如 空月祝福 / 双倍首充">
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

/* ---------- 原神事件处理 ---------- */
function handleYsAction(act, t, d) {
  switch (act) {
        // ---- 角色练度 ----
    case 'ysShowAddChar': {
      ysShowCharForm = true; ysEditingCharId = null; ysShowImportForm = false;
      render(false);
      break;
    }
    case 'ysShowImport': {
      ysShowImportForm = true; ysShowCharForm = false; ysEditingCharId = null;
      render(false);
      break;
    }
    case 'ysCancelImport': {
      ysShowImportForm = false;
      render(false);
      break;
    }
    case 'ysCancelChar': {
      ysShowCharForm = false; ysEditingCharId = null;
      render(false);
      break;
    }
    case 'ysEditChar': {
      ysEditingCharId = t.dataset.id;
      ysShowCharForm = true; ysShowImportForm = false;
      render(false);
      break;
    }
    case 'ysSaveChar': {
      const name = document.getElementById('charName').value.trim();
      if (!name) { alert('请填角色名'); return; }
      const statusEl = document.getElementById('charStatus');
      const status = statusEl ? statusEl.value : 'pending';

      const gameId = currentId();
      const collectFn = (gameId === BENGTIE_ID) ? collectBtBuild : collectYsBuild;

      const actual = collectFn('a');
      const recommend = collectFn('r');
      if (!d.characters) d.characters = [];
      if (ysEditingCharId) {
        const c = d.characters.find(x => x.id === ysEditingCharId);
        if (c) { c.name = name; c.actual = actual; c.recommend = recommend; c.status = status; }
      } else {
        d.characters.push({ id: uid(), name, status, actual, recommend });
      }
      saveDB();
      ysShowCharForm = false; ysEditingCharId = null;
      render(false);
      break;
    }
    case 'ysDelChar': {
      if (!confirm('删除这个角色？')) return;
      d.characters = (d.characters || []).filter(c => c.id !== t.dataset.id);
      saveDB(); render(false);
      break;
    }
    case 'ysParseImport': {
      const text = document.getElementById('ysImportText').value;
      if (!text.trim()) { alert('请粘贴文本'); return; }

      const gameId = currentId();
      const isBt = (gameId === BENGTIE_ID);
      const parseFn = isBt ? parseBtBuildTextMulti : parseYsBuildTextMulti;
      const emptyFn = isBt ? emptyBtBuild : emptyYsBuild;

      const list = parseFn(text);
      if (!list.length) { alert('没有识别到任何角色，请检查格式'); return; }

      if (!d.characters) d.characters = [];
      let added = 0, merged = 0;
      list.forEach(parsed => {
        const exist = d.characters.find(c => (c.name || '').trim() === (parsed.name || '').trim());
        if (exist) {
          const mergeBuild = (target, src) => {
            Object.keys(src).forEach(k => {
              if (src[k]) target[k] = src[k];
            });
          };
          mergeBuild(exist.actual || (exist.actual = emptyFn()), parsed.actual);
          mergeBuild(exist.recommend || (exist.recommend = emptyFn()), parsed.recommend);
          merged++;
        } else {
          d.characters.push({
            id: uid(),
            name: parsed.name,
            status: 'pending',
            actual: parsed.actual,
            recommend: parsed.recommend
          });
          added++;
        }
      });

      saveDB();
      ysShowImportForm = false;
      ysShowCharForm = false;
      ysEditingCharId = null;
      render(false);
      alert(`导入完成：新增 ${added} 个，合并 ${merged} 个`);
      break;
    }
    // ---- 资源 ----
    case 'ysShowIncome':  { ysResShowForm = 'income';  render(false); break; }
    case 'ysShowExpense': { ysResShowForm = 'expense'; render(false); break; }
    case 'ysShowInit':    { ysResShowForm = 'init';    render(false); break; }
    case 'ysCancelForm':  { ysResShowForm = '';        render(false); break; }

    case 'ysSaveInit': {
      const bank = d.resourceBank;
      YUANSHEN_RES_FIELDS.forEach(f => {
        const el = document.getElementById('ysInit_' + f.key);
        if (el) bank.init[f.key] = +el.value || 0;
      });
      saveDB(); ysResShowForm = ''; render(false);
      break;
    }
    case 'ysSaveIncome': {
      if (saveResForm('ys', YUANSHEN_RES_FIELDS, 'income', d)) {
        ysResShowForm = ''; render(false);
      }
      break;
    }
    case 'ysSaveExpense': {
      if (saveResForm('ys', YUANSHEN_RES_FIELDS, 'expense', d)) {
        ysResShowForm = ''; render(false);
      }
      break;
    }
    case 'ysDelBankRec': {
      if (!confirm('删除这条流水？资源总数会同步回滚。')) return;
      d.resourceBank.records = d.resourceBank.records.filter(r => r.id !== t.dataset.id);
      saveDB(); render(false);
      break;
    }

    // ---- 抽卡 ----
    case 'ysPityAdd': {
      const poolKey = t.dataset.pool;
      const n = +t.dataset.n || 1;
      const bank = d.gachaBanks[poolKey];
      if (!bank) return;
      bank.pity = Math.max(0, bank.pity - n);
      saveDB(); render(false);
      break;
    }
    case 'ysPityReset': {
      const poolKey = t.dataset.pool;
      if (!confirm('把本池距保底重置为最大值？')) return;
      const bank = d.gachaBanks[poolKey];
      if (!bank) return;
      const poolCfg = YUANSHEN_POOLS.find(p => p.key === poolKey);
      bank.pity = poolCfg.max;
      saveDB(); render(false);
      break;
    }
    case 'ysShowHitForm': {
      const poolKey = t.dataset.pool;
      const form = document.getElementById('ysHitForm');
      const sel = document.getElementById('ysHitPoolSel');
      if (!form) return;
      form.classList.remove('hide');
      document.getElementById('ysHitPool').value = poolKey;
      document.getElementById('ysEditingRecId').value = '';
      document.getElementById('ysHitFormTitle').textContent = '✨ 记录出金';
      if (sel) sel.value = poolKey;

      const bank = d.gachaBanks[poolKey];
      const poolCfg = YUANSHEN_POOLS.find(p => p.key === poolKey);
      const defaultPity = poolCfg.max - bank.pity + 1;
      document.getElementById('ysHitPity').value = Math.max(1, defaultPity);

      const upGrp = document.getElementById('ysHitUpGroup');
      if (poolCfg.hasGuaranteed) upGrp.classList.remove('hide');
      else upGrp.classList.add('hide');

      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;
    }
    case 'ysEditGachaRec': {
      const recId = t.dataset.id;
      const rec = (d.gachaRecords || []).find(r => r.id === recId);
      if (!rec) return;
      const form = document.getElementById('ysHitForm');
      form.classList.remove('hide');
      document.getElementById('ysEditingRecId').value = recId;
      document.getElementById('ysHitFormTitle').textContent = '✏️ 修改出金记录';
      document.getElementById('ysHitDate').value = rec.date || todayStr();
      document.getElementById('ysHitPoolSel').value = rec.poolType;
      document.getElementById('ysHitPity').value = rec.hitPity;
      document.getElementById('ysHitChar').value = rec.char || '';
      document.getElementById('ysHitUp').value = rec.up ? '1' : '0';

      const poolCfg = YUANSHEN_POOLS.find(p => p.key === rec.poolType);
      const upGrp = document.getElementById('ysHitUpGroup');
      if (poolCfg && poolCfg.hasGuaranteed) upGrp.classList.remove('hide');
      else upGrp.classList.add('hide');

      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;
    }
    case 'ysCancelHit': {
      const form = document.getElementById('ysHitForm');
      if (form) form.classList.add('hide');
      break;
    }
    case 'ysSaveHit': {
      const poolKey = document.getElementById('ysHitPoolSel').value;
      const poolCfg = YUANSHEN_POOLS.find(p => p.key === poolKey);
      const date = document.getElementById('ysHitDate').value || todayStr();
      const hitPity = +document.getElementById('ysHitPity').value;
      const char = document.getElementById('ysHitChar').value.trim();
      if (!hitPity) { alert('请填第几抽出金'); return; }
      if (!char) { alert('请填角色/武器名'); return; }

      let isUp = true;
      if (poolCfg.hasGuaranteed) {
        isUp = document.getElementById('ysHitUp').value === '1';
      }

      const editingId = document.getElementById('ysEditingRecId').value;

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
      document.getElementById('ysHitForm').classList.add('hide');
      render(false);
      break;
    }
    case 'ysDelGachaRec': {
      if (!confirm('删除这条出货记录？保底进度不会回滚。')) return;
      d.gachaRecords = d.gachaRecords.filter(r => r.id !== t.dataset.id);
      saveDB(); render(false);
      break;
    }
  }
}