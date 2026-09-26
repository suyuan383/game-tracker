/* ===================== 世界之外 ===================== */

function renderShijie() {
  const d = getGame(SHIJIE_ID);
  const labels = [['res','💎 资源'], ['event','📅 活动'], ['gacha','🎴 抽卡'], ['pay','💰 充值']];
  let body = '';
  if (currentTab === 'res')        body = renderSjResTab(d);
  else if (currentTab === 'event') body = renderSjEventTab(d);
  else if (currentTab === 'gacha') body = renderSjGachaTab(d);
  else                             body = renderSjPayTab(d);
  return `<div class="tabs">${labels.map(([k, l]) => `<button class="tab ${currentTab===k?'active':''}" data-tab="${k}">${l}</button>`).join('')}</div>${body}`;
}

/* ---------- 资源页 ---------- */
function renderSjResTab(d) {
  const bank = d.resourceBank || { init: {}, records: [] };
  const totals = calcSjResTotals(d);

    const records = filterByListDate([...(bank.records || [])].sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  const dateUI = renderListDateUI();
  let filtered = records;
  if (sjResFilterType === 'income')  filtered = records.filter(r => r.type === 'income');
  else if (sjResFilterType === 'expense') filtered = records.filter(r => r.type === 'expense');

  let listHtml = '';
  if (!filtered.length) {
    listHtml = `<div class="list"><div class="empty">还没有流水记录</div></div>`;
  } else {
    const groups = {};
    filtered.forEach(r => { const key = r.date || '未知日期'; if (!groups[key]) groups[key] = []; groups[key].push(r); });
    const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    listHtml = dates.map(date => {
      const items = groups[date];
      return `<div class="group-title">📅 ${date}</div><div class="list">${items.map(renderSjBankRow).join('')}</div>`;
    }).join('');
  }

    const initForm = sjResShowForm === 'init' ? `
    <div class="card" style="margin-bottom:12px">
      <div style="font-size:14px;font-weight:600;margin-bottom:10px">⚙️ 设置初始值</div>
      <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
        ${SHIJIE_RES_FIELDS.map(f => `
          <div style="flex:1;min-width:90px"><div style="font-size:12px;color:#666;margin-bottom:4px">${f.name}</div>
            <input class="inp" id="sjInit_${f.key}" type="number" value="${bank.init[f.key]||0}">
          </div>`).join('')}
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn ghost" data-act="sjCancelForm">取消</button>
        <button class="btn" data-act="sjSaveInit">保存</button>
      </div>
    </div>` : '';

  const incomeForm  = sjResShowForm === 'income'  ? renderResForm('sj', SHIJIE_RES_FIELDS, 'income',  bank, SHIJIE_INCOME_SOURCES)  : '';
  const expenseForm = sjResShowForm === 'expense' ? renderResForm('sj', SHIJIE_RES_FIELDS, 'expense', bank, SHIJIE_EXPENSE_TYPES)    : '';

  return `
    <div class="stats">
      ${SHIJIE_RES_FIELDS.map(f => `
        <div class="stat"><div class="num" style="color:${f.color}">${totals[f.key]||0}</div><div class="lbl">${f.name}</div></div>
      `).join('')}
    </div>

    <div style="display:flex;gap:8px;margin-bottom:12px">
      <button class="btn" data-act="sjShowIncome">＋ 收入</button>
      <button class="btn ghost" data-act="sjShowExpense">－ 消耗</button>
      <button class="btn ghost" data-act="sjShowInit" style="flex:0 0 auto;padding:10px 14px">⚙️</button>
    </div>

    ${initForm}
    ${incomeForm}
    ${expenseForm}

    <div style="margin-bottom:12px">
      <select class="sel" id="sjResFilterType">
        <option value="all" ${sjResFilterType==='all'?'selected':''}>全部流水</option>
        <option value="income" ${sjResFilterType==='income'?'selected':''}>只看收入</option>
        <option value="expense" ${sjResFilterType==='expense'?'selected':''}>只看消耗</option>
      </select>
    </div>

    ${dateUI}${listHtml}
    ${renderWishlist('shijie', d)}
  `;
}

function renderSjBankRow(r) {
  const isIncome = r.type === 'income';
  const sign = isIncome ? '＋' : '－';
  const cls = isIncome ? 'badge green' : 'badge warn';
  const parts = [];
  SHIJIE_RES_FIELDS.forEach(f => {
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
      <button class="del" data-act="sjDelBankRec" data-id="${r.id}">×</button>
    </div>`;
}

/* ---------- 活动页 ---------- */
function renderSjEventTab(d) { return renderCommonEventTab(d); }

/* ---------- 抽卡页 ---------- */
function renderSjGachaTab(d) {
  const pools = d.gachaPools || [];
  if (!pools.length) return `<div class="empty">没有卡池</div>`;
  const activeId = d.gachaActiveId || pools[0].id;
  const pool = pools.find(p => p.id === activeId) || pools[0];
  const isPerm = pool.type === 'permanent';

  const poolOpts = pools.map(p =>
    `<option value="${p.id}" ${p.id===pool.id?'selected':''}>${esc(p.name)}${p.type==='permanent'?'':` [${esc(p.status||'首发')}]`}</option>`).join('');

  const pityLeft = pool.pityLeft;
  const maxPity = pool.maxPity || (isPerm ? 70 : 80);
  const totalPulls = pool.totalPulls || 0;
  const pityPct = Math.min(100, Math.round((maxPity - pityLeft) / maxPity * 100));

  // 出金表单
  const hitForm = sjShowHitForm ? `
    <div class="card" style="margin-bottom:12px">
      <input type="hidden" id="sjHitEditingId">
      <div id="sjHitTitle" style="font-size:14px;font-weight:600;margin-bottom:10px">✨ 记录出金</div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <div style="flex:1"><div style="font-size:12px;color:#666;margin-bottom:4px">日期</div><input class="inp" id="sjHitDate" type="date" value="${todayStr()}"></div>
        <div style="flex:1"><div style="font-size:12px;color:#666;margin-bottom:4px">第几抽出金</div><input class="inp" id="sjHitPity" type="number" min="1"></div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <div style="flex:${isPerm?'1':'1.4'}"><div style="font-size:12px;color:#666;margin-bottom:4px">角色名</div><input class="inp" id="sjHitChar" placeholder="如 顾时夜"></div>
        ${isPerm ? '' : `<div style="flex:1"><div style="font-size:12px;color:#666;margin-bottom:4px">结果</div>
          <select class="inp" id="sjHitUp"><option value="1">UP</option><option value="0">歪</option></select>
        </div>`}
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn ghost" data-act="sjCancelHit">取消</button>
        <button class="btn" data-act="sjSaveHit">保存</button>
      </div>
    </div>` : '';

  // 抽数奖励表单（仅限定池）
  const rewardForm = (sjShowRewardForm && !isPerm) ? `
    <div class="card" style="margin-bottom:12px">
      <div style="font-size:14px;font-weight:600;margin-bottom:10px">🎁 记录抽数奖励</div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <div style="flex:1"><div style="font-size:12px;color:#666;margin-bottom:4px">日期</div><input class="inp" id="sjRewardDate" type="date" value="${todayStr()}"></div>
        <div style="flex:1"><div style="font-size:12px;color:#666;margin-bottom:4px">档位</div>
          <select class="inp" id="sjRewardTier">
            <option value="100抽">100抽</option>
            <option value="200抽">200抽</option>
            <option value="其他">其他</option>
          </select>
        </div>
      </div>
      <div style="margin-bottom:10px">
        <div style="font-size:12px;color:#666;margin-bottom:4px">奖励类型</div>
        <select class="inp" id="sjRewardType">
          <option value="随机">随机UP</option>
          <option value="自选">自选UP</option>
          <option value="指定">指定角色</option>
        </select>
      </div>
      <div style="margin-bottom:10px"><input class="inp" id="sjRewardChar" placeholder="获得的角色名"></div>
      <div style="display:flex;gap:8px">
        <button class="btn ghost" data-act="sjCancelReward">取消</button>
        <button class="btn gold" data-act="sjSaveReward">保存</button>
      </div>
    </div>` : '';

  // ===== 下方内容：根据 sjViewMode 决定 =====
  let bottomHtml = '';

  if (sjViewMode === 'overview') {
    // 所有卡池概览
    const cards = pools.map(p => {
      const pIsPerm = p.type === 'permanent';
      const pLeft = p.pityLeft;
      const pMax = p.maxPity || (pIsPerm ? 70 : 80);
      const pPct = Math.min(100, Math.round((pMax - pLeft) / pMax * 100));
      const statusLine = pIsPerm
        ? `<span class="badge over">常驻池</span>`
        : (p.guaranteed
            ? `<span class="badge warn">🔶 大保底</span>`
            : `<span class="badge">🔷 小保底</span>`);
      const pullsLine = pIsPerm ? '' : `<span style="font-size:12px;color:#999;margin-left:8px">累计 ${p.totalPulls||0} 抽</span>`;
      return `
        <div class="card" style="margin-bottom:10px;cursor:pointer" data-act="sjGotoPool" data-id="${p.id}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div style="font-size:14px;font-weight:600">${esc(p.name)}${pIsPerm?'':`（${esc(p.status||'首发')}）`}</div>
            ${statusLine}
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px;color:#666;margin-bottom:4px">
            <span>距保底 ${pLeft} / ${pMax} 抽</span>
            ${pullsLine}
          </div>
          <div class="progress ${pLeft<=10?'danger':''}"><i style="width:${pPct}%"></i></div>
        </div>`;
    }).join('');
    bottomHtml = `
      <div class="section-title">📊 所有卡池概览（${pools.length}）</div>
      ${cards}`;
  } else {
    // 当前卡池抽卡记录
  const hist = filterByListDate([...(pool.history || [])].sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  const dateUI = renderListDateUI();
    const histHtml = hist.length ? hist.map(h => {
      if (h.type === 'reward') {
        return `
          <div class="row">
            <div class="grow">
              <div class="name">🎁 <span class="badge gold">抽数奖励·${esc(h.tier)}·${esc(h.rewardType)}</span></div>
              <div class="sub">${fmtDate(h.date)} · ${esc(h.char || '')}</div>
            </div>
            <button class="del" data-act="sjDelHist" data-id="${h.id}">×</button>
          </div>`;
      }
      const upBadge = isPerm ? '' : `<span class="badge ${h.up?'green':'warn'}">${h.up?'UP':'歪'}</span>`;
      return `
        <div class="row">
          <div class="grow" data-act="sjEditHit" data-id="${h.id}" style="cursor:pointer">
            <div class="name">${esc(h.char)} ${upBadge}</div>
            <div class="sub">${fmtDate(h.date)} · 第 ${h.hitPity} 抽出金 · 点此修改</div>
          </div>
          <button class="del" data-act="sjDelHist" data-id="${h.id}">×</button>
        </div>`;
    }).join('') : `<div class="empty">还没有记录</div>`;

    bottomHtml = `
      <div class="section-title">📜 ${esc(pool.name)} 抽卡记录（${hist.length}）</div>
      <div class="list">${dateUI}${histHtml}</div>`;
  }

  return `
    <div class="card" style="margin-bottom:12px">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
        <select class="sel" id="sjPoolSel" style="flex:1">${poolOpts}</select>
        <button class="mini" data-act="sjToggleNewPool">新增</button>
        ${isPerm ? '' : `<button class="mini danger" data-act="sjDelPool">删除</button>`}
      </div>

      <div style="font-size:14px;font-weight:600;margin-bottom:10px">📊 当前卡池：${esc(pool.name)}${isPerm?'':`（${esc(pool.status||'首发')}）`}</div>

      ${isPerm ? '' : `
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
          <span style="font-size:13px;color:#666">名称</span>
          <input class="val" id="sjPoolName" value="${esc(pool.name)}" style="flex:1;width:auto;text-align:left">
          <span style="font-size:13px;color:#666">状态</span>
          <select class="sel" id="sjPoolStatus" style="flex:0 0 80px">
            ${SHIJIE_POOL_STATUSES.map(s => `<option value="${s}" ${pool.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>`}

      <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap">
        <span style="font-size:13px;color:#666">保底上限</span>
        <input class="val" id="sjPoolMaxPity" type="number" value="${maxPity}" style="flex:0 0 60px">
        <span style="font-size:13px;color:#666">距保底</span>
        <input class="val" id="sjPoolPityLeft" type="number" value="${pityLeft}" style="flex:0 0 60px">
        ${isPerm ? '' : `<span style="font-size:13px;color:#666">累计抽数</span>
          <input class="val" id="sjPoolTotalPulls" type="number" value="${totalPulls}" style="flex:0 0 60px">`}
      </div>

      <div class="progress ${pityLeft<=10?'danger':''}"><i style="width:${pityPct}%"></i></div>
      <div class="sub" style="text-align:right;margin-bottom:10px">距保底 ${pityLeft} / ${maxPity} 抽</div>

      ${isPerm ? '' : `
        <div style="padding:10px;border-radius:8px;font-size:13px;margin-bottom:10px;background:${pool.guaranteed?'#fff4e6':'#eef2ff'};color:${pool.guaranteed?'#e8590c':'#3b5bdb'}">
          ${pool.guaranteed ? '🔶 大保底：下个金必为 UP' : '🔷 小保底：下个金有概率歪'}
        </div>`}

      <div style="display:flex;gap:6px;margin-bottom:10px">
        <button class="btn ghost" data-act="sjPityAdd" data-n="-1" style="flex:0 0 auto;padding:8px 12px">－1</button>
        <button class="btn" data-act="sjPityAdd" data-n="1">＋1 抽</button>
        <button class="btn" data-act="sjPityAdd" data-n="10">＋10 抽</button>
      </div>

      <div style="display:flex;gap:6px">
        <button class="btn gold" data-act="sjShowHitForm">记录出金</button>
        ${isPerm ? '' : `<button class="btn gold" data-act="sjShowRewardForm">记录抽数奖励</button>`}
      </div>
    </div>

    <div id="sjNewPoolForm" class="card hide" style="margin-bottom:12px">
      <div style="font-size:14px;font-weight:600;margin-bottom:10px">新增限定卡池</div>
      <div style="margin-bottom:8px"><input class="inp" id="sjNewPoolName" placeholder="卡池名称，如 群星启航"></div>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <div style="flex:1"><div style="font-size:12px;color:#666;margin-bottom:4px">状态</div>
          <select class="inp" id="sjNewPoolStatus">${SHIJIE_POOL_STATUSES.map(s => `<option value="${s}">${s}</option>`).join('')}</select>
        </div>
        <div style="flex:1"><div style="font-size:12px;color:#666;margin-bottom:4px">保底上限</div><input class="inp" id="sjNewPoolMaxPity" type="number" value="80"></div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <div style="flex:1"><div style="font-size:12px;color:#666;margin-bottom:4px">初始距保底</div><input class="inp" id="sjNewPoolPityLeft" type="number" value="80"></div>
        <div style="flex:1"><div style="font-size:12px;color:#666;margin-bottom:4px">初始累计抽数</div><input class="inp" id="sjNewPoolTotalPulls" type="number" value="0"></div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <div style="flex:1"><div style="font-size:12px;color:#666;margin-bottom:4px">保底状态</div>
          <select class="inp" id="sjNewPoolGuaranteed">
            <option value="0">小保底</option>
            <option value="1">大保底</option>
          </select>
        </div>
      </div>
      <div style="font-size:11px;color:#999;margin-bottom:10px">提示：复刻继承时，把距保底、累计抽数、保底状态改成继承过来的值即可。</div>
      <div style="display:flex;gap:8px">
        <button class="btn ghost" data-act="sjCancelNewPool">取消</button>
        <button class="btn" data-act="sjCreatePool">创建</button>
      </div>
    </div>

    ${hitForm}
    ${rewardForm}

    <div style="display:flex;gap:8px;margin-bottom:12px">
      <button class="btn ${sjViewMode==='history'?'':'ghost'}" data-act="sjViewHistory">当前卡池记录</button>
      <button class="btn ${sjViewMode==='overview'?'':'ghost'}" data-act="sjViewOverview">所有卡池概览</button>
    </div>

    ${bottomHtml}
  `;
}

/* ---------- 充值页 ---------- */
function renderSjPayTab(d) {
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

/* ---------- 世界之外事件处理 ---------- */
function handleSjAction(act, t, d) {
  const pools = d.gachaPools || [];
  const pool = pools.find(p => p.id === d.gachaActiveId) || pools[0];

  switch (act) {
    // ---- 资源 ----
    case 'sjShowIncome':  { sjResShowForm = 'income';  render(false); break; }
    case 'sjShowExpense': { sjResShowForm = 'expense'; render(false); break; }
    case 'sjShowInit':    { sjResShowForm = 'init';    render(false); break; }
    case 'sjCancelForm':  { sjResShowForm = '';        render(false); break; }

    case 'sjSaveInit': {
      SHIJIE_RES_FIELDS.forEach(f => {
        const el = document.getElementById('sjInit_' + f.key);
        if (el) d.resourceBank.init[f.key] = +el.value || 0;
      });
      saveDB(); sjResShowForm = ''; render(false);
      break;
    }
    case 'sjSaveIncome': {
      if (saveResForm('sj', SHIJIE_RES_FIELDS, 'income', d)) {
        sjResShowForm = ''; render(false);
      }
      break;
    }
    case 'sjSaveExpense': {
      if (saveResForm('sj', SHIJIE_RES_FIELDS, 'expense', d)) {
        sjResShowForm = ''; render(false);
      }
      break;
    }
    case 'sjDelBankRec': {
      if (!confirm('删除这条流水？')) return;
      d.resourceBank.records = d.resourceBank.records.filter(r => r.id !== t.dataset.id);
      saveDB(); render(false);
      break;
    }

    // ---- 视图切换 ----
    case 'sjViewHistory':  { sjViewMode = 'history';  render(false); break; }
    case 'sjViewOverview': { sjViewMode = 'overview'; render(false); break; }
    case 'sjGotoPool': {
      d.gachaActiveId = t.dataset.id;
      sjViewMode = 'history';
      saveDB(); render(false);
      break;
    }

    // ---- 卡池 ----
    case 'sjToggleNewPool': {
      const f = document.getElementById('sjNewPoolForm');
      if (f) f.classList.toggle('hide');
      break;
    }
    case 'sjCancelNewPool': {
      const f = document.getElementById('sjNewPoolForm');
      if (f) f.classList.add('hide');
      break;
    }
    case 'sjCreatePool': {
      const name = document.getElementById('sjNewPoolName').value.trim();
      const status = document.getElementById('sjNewPoolStatus').value;
      const maxPity = +document.getElementById('sjNewPoolMaxPity').value || 80;
      const pityLeft = +document.getElementById('sjNewPoolPityLeft').value || maxPity;
      const totalPulls = +document.getElementById('sjNewPoolTotalPulls').value || 0;
      const guaranteed = document.getElementById('sjNewPoolGuaranteed').value === '1';
      if (!name) { alert('请输入卡池名称'); return; }
      const newPool = {
        id: uid(), type: 'limited', name, status,
        maxPity, pityLeft, totalPulls, guaranteed,
        history: []
      };
      d.gachaPools.push(newPool);
      d.gachaActiveId = newPool.id;
      saveDB(); render(false);
      break;
    }
    case 'sjDelPool': {
      if (pool.type === 'permanent') { alert('常驻池不能删除'); return; }
      if (pools.length <= 1) { alert('至少保留一个卡池'); return; }
      if (!confirm('删除当前卡池？所有历史记录会一并删除。')) return;
      d.gachaPools = pools.filter(p => p.id !== pool.id);
      d.gachaActiveId = d.gachaPools[0].id;
      saveDB(); render(false);
      break;
    }
    case 'sjPityAdd': {
      const n = +t.dataset.n || 1;
      pool.pityLeft = Math.max(0, Math.min(pool.maxPity, pool.pityLeft - n));
      if (pool.type !== 'permanent') {
        if (n > 0) pool.totalPulls = (pool.totalPulls || 0) + n;
        if (n < 0) pool.totalPulls = Math.max(0, (pool.totalPulls || 0) + n);
      }
      saveDB(); render(false);
      break;
    }

    // ---- 出金 ----
    case 'sjShowHitForm': {
      sjShowHitForm = true; sjShowRewardForm = false; render(false);
      break;
    }
    case 'sjCancelHit': { sjShowHitForm = false; render(false); break; }
    case 'sjEditHit': {
      const recId = t.dataset.id;
      const rec = (pool.history || []).find(h => h.id === recId && h.type !== 'reward');
      if (!rec) return;
      sjShowHitForm = true; sjShowRewardForm = false;
      render(false);
      setTimeout(() => {
        const editEl = document.getElementById('sjHitEditingId');
        if (editEl) editEl.value = recId;
        const titleEl = document.getElementById('sjHitTitle');
        if (titleEl) titleEl.textContent = '✏️ 修改出金记录';
        const dateEl = document.getElementById('sjHitDate');
        if (dateEl) dateEl.value = rec.date || todayStr();
        const pityEl = document.getElementById('sjHitPity');
        if (pityEl) pityEl.value = rec.hitPity;
        const charEl = document.getElementById('sjHitChar');
        if (charEl) charEl.value = rec.char || '';
        const upEl = document.getElementById('sjHitUp');
        if (upEl) upEl.value = rec.up ? '1' : '0';
      }, 50);
      break;
    }
    case 'sjSaveHit': {
      const isPerm = pool.type === 'permanent';
      const date = document.getElementById('sjHitDate').value || todayStr();
      const hitPity = +document.getElementById('sjHitPity').value;
      const char = document.getElementById('sjHitChar').value.trim();
      let up = true;
      if (!isPerm) {
        const upEl = document.getElementById('sjHitUp');
        if (upEl) up = upEl.value === '1';
      }
      if (!hitPity || !char) { alert('请填写完整'); return; }
      const editingId = document.getElementById('sjHitEditingId').value;
      if (editingId) {
        const rec = (pool.history || []).find(h => h.id === editingId);
        if (rec) { rec.date = date; rec.hitPity = hitPity; rec.char = char; rec.up = up; }
      } else {
        pool.history.push({ id: uid(), type: 'hit', date, hitPity, char, up });
        pool.pityLeft = pool.maxPity;
        if (!isPerm) {
          pool.guaranteed = !up;
        }
      }
      saveDB(); sjShowHitForm = false; render(false);
      break;
    }

    // ---- 抽数奖励 ----
    case 'sjShowRewardForm': {
      if (pool.type === 'permanent') return;
      sjShowRewardForm = true; sjShowHitForm = false; render(false);
      break;
    }
    case 'sjCancelReward': { sjShowRewardForm = false; render(false); break; }
    case 'sjSaveReward': {
      const date = document.getElementById('sjRewardDate').value || todayStr();
      const tier = document.getElementById('sjRewardTier').value;
      const rewardType = document.getElementById('sjRewardType').value;
      const char = document.getElementById('sjRewardChar').value.trim();
      if (!char) { alert('请填获得的角色名'); return; }
      pool.history.push({ id: uid(), type: 'reward', date, tier, rewardType, char });
      saveDB(); sjShowRewardForm = false; render(false);
      break;
    }

    case 'sjDelHist': {
      if (!confirm('删除这条记录？')) return;
      pool.history = (pool.history || []).filter(h => h.id !== t.dataset.id);
      saveDB(); render(false);
      break;
    }
  }
}