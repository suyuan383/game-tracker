/* ---------- 抽卡（全新简化版 + 卡池管理） ---------- */
function renderGachaTab(d) {
  const records = d.gachaRecords || [];
  const customPools = d.customPools || [];

  // ===== 统计（基于全部记录，不受筛选影响）=====
  let totalPulls = 0;
  let hitCount = 0;
  records.forEach(r => {
    if (r.type === 'pull') {
      totalPulls += (+r.pullsUsed || 0);
      if (r.hitPity) hitCount++;
    }
  });
  const avg = hitCount ? (totalPulls / hitCount).toFixed(1) : '—';

  // ===== 筛选（卡池）=====
  const allPoolNames = [...new Set(records.map(r => r.poolName).filter(Boolean))];
  const poolOptions = allPoolNames.map(n =>
    `<option value="${esc(n)}" ${gachaFilterPool===n?'selected':''}>${esc(n)}</option>`).join('');

  let filtered = records;
  if (gachaFilterPool) filtered = filtered.filter(r => r.poolName === gachaFilterPool);

  // ===== 排序 =====
  filtered = [...filtered].sort((a, b) => {
    const d1 = a.date || '';
    const d2 = b.date || '';
    if (d1 !== d2) return d2.localeCompare(d1);
    return (b.id || '').localeCompare(a.id || '');
  });

  // ===== 日期筛选 =====
  filtered = filterByListDate(filtered);
  const dateUI = renderListDateUI();

  // ===== 分组 =====
  let listHtml = '';
  if (!filtered.length) {
    listHtml = `<div class="list"><div class="empty">当前筛选条件下没有记录</div></div>`;
  } else if (gachaGroupBy === 'time') {
    const groups = {};
    filtered.forEach(r => { const key = r.date || '未知日期'; if (!groups[key]) groups[key] = []; groups[key].push(r); });
    const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    listHtml = dates.map(date => {
      const items = groups[date];
      const dayPulls = items.filter(r => r.type === 'pull').reduce((s, r) => s + (+r.pullsUsed || 0), 0);
      return `<div class="group-title">📅 ${date}${dayPulls ? ` · 共投入 ${dayPulls} 抽` : ''}</div><div class="list">${items.map(r => renderRecordRow(r, false)).join('')}</div>`;
    }).join('');
  } else {
    const groups = {};
    filtered.forEach(r => { const key = r.poolName || '未命名卡池'; if (!groups[key]) groups[key] = []; groups[key].push(r); });
    listHtml = Object.keys(groups).map(poolName => {
      const items = groups[poolName];
      const totalP = items.filter(r => r.type === 'pull').reduce((s, r) => s + (+r.pullsUsed || 0), 0);
      const hitCnt = items.filter(r => r.type === 'pull' && r.hitPity).length;
      return `<div class="group-title">🎴 ${esc(poolName)} · ${totalP} 抽 · ${hitCnt} 金</div><div class="list">${items.map(r => renderRecordRow(r, true)).join('')}</div>`;
    }).join('');
  }

  // ===== datalist 合并预设 + 自定义 =====
  const allNamesForList = [...PRESET_POOL_NAMES, ...customPools];
  const datalist = `<datalist id="poolNameList">${allNamesForList.map(n => `<option value="${esc(n)}">`).join('')}</datalist>`;

  // ===== 自定义卡池列表 =====
  const customPoolList = customPools.length
    ? customPools.map((p, i) => `
        <div class="row" style="padding:8px 0;border-bottom:1px solid #f0f0f2">
          <span class="grow" style="font-size:14px">${esc(p)}</span>
          <button class="del" data-act="delCustomPool" data-index="${i}">×</button>
        </div>`).join('')
    : `<div class="sub" style="padding:8px 0">还没有自定义卡池</div>`;

  return `
    <div class="stats">
      <div class="stat"><div class="num">${totalPulls}</div><div class="lbl">总抽数</div></div>
      <div class="stat"><div class="num">${hitCount}</div><div class="lbl">出金次数</div></div>
      <div class="stat"><div class="num">${avg}</div><div class="lbl">平均出金</div></div>
    </div>

    <!-- 我的卡池管理 -->
    <div class="card">
      <div style="display:flex;gap:8px;align-items:center">
        <div style="flex:1;font-size:14px;font-weight:600">🎴 我的卡池列表（${customPools.length}）</div>
        <button class="mini" data-act="togglePoolManage">展开/收起</button>
      </div>
      <div id="poolManageBox" class="hide" style="margin-top:10px;border-top:1px dashed #ccc;padding-top:10px">
        <div style="display:flex;gap:8px">
          <input class="inp" id="newPoolNameInput" placeholder="输入卡池名，如 绘梦平安京" style="flex:1">
          <button class="btn" data-act="addCustomPool" style="flex:0 0 auto;padding:10px 16px">添加</button>
        </div>
        <div style="margin-top:8px">${customPoolList}</div>
      </div>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:12px">
      <button class="btn" data-act="showPullForm">＋ 抽卡记录</button>
      <button class="btn gold" data-act="showRewardForm">🎁 绘制奖励</button>
    </div>

    <div id="recordForm" class="card hide">
      ${datalist}
      <input type="hidden" id="recType" value="pull">
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <div style="flex:1"><div style="font-size:12px;color:#666;margin-bottom:4px">日期</div><input class="inp" id="recDate" type="date" value="${todayStr()}"></div>
        <div style="flex:1"><div style="font-size:12px;color:#666;margin-bottom:4px">卡池状态</div><select class="inp" id="recPoolStatus">${POOL_STATUSES.map(s => `<option value="${s}">${s}</option>`).join('')}</select></div>
      </div>
      <div style="margin-bottom:10px"><div style="font-size:12px;color:#666;margin-bottom:4px">卡池名称</div><input class="inp" id="recPoolName" list="poolNameList" placeholder="输入或从预设选择"></div>
      <div id="pullFields">
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <div style="flex:1"><div style="font-size:12px;color:#666;margin-bottom:4px">本次投入抽数</div><input class="inp" id="recPulls" type="number" min="0" placeholder="如 70"></div>
          <div style="flex:1"><div style="font-size:12px;color:#666;margin-bottom:4px">第几抽出金（留空=未出）</div><input class="inp" id="recHitPity" type="number" min="1" placeholder="如 66"></div>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <div style="flex:1.4"><div style="font-size:12px;color:#666;margin-bottom:4px">出金角色（可留空）</div><input class="inp" id="recChar" placeholder="如 路辰·诡念"></div>
          <div style="flex:1"><div style="font-size:12px;color:#666;margin-bottom:4px">UP/歪</div><select class="inp" id="recUp"><option value="1">UP</option><option value="0">歪</option></select></div>
        </div>
        <div style="margin-top:10px;padding:10px;border-radius:8px;background:#f8f9fa">
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
            <input type="checkbox" id="recUseResource" style="width:16px;height:16px">
            <span>同时记录资源消耗（自动扣除）</span>
          </label>
          <div id="recResourceFields" class="hide" style="display:flex;gap:8px;margin-top:10px">
            <div style="flex:1"><div style="font-size:12px;color:#666;margin-bottom:4px">消耗颜料</div><input class="inp" id="recUsePaint" type="number" placeholder="0"></div>
            <div style="flex:1"><div style="font-size:12px;color:#666;margin-bottom:4px">消耗紫钻</div><input class="inp" id="recUsePurple" type="number" placeholder="0"></div>
          </div>
        </div>
      </div>
      <div id="rewardFields" class="hide">
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <div style="flex:1"><div style="font-size:12px;color:#666;margin-bottom:4px">奖励档位</div><select class="inp" id="recRewardType"><option value="随机">130 随机</option><option value="自选">160 自选</option><option value="其他">其他</option></select></div>
          <div style="flex:1.4"><div style="font-size:12px;color:#666;margin-bottom:4px">获得角色</div><input class="inp" id="recRewardChar" placeholder="如 艾因·明珠"></div>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:6px">
        <button class="btn ghost" data-act="cancelRecord">取消</button>
        <button class="btn" data-act="saveRecord">保存</button>
      </div>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:12px;margin-top:4px">
      <select class="sel" id="gachaFilterPool" style="flex:1.5"><option value="">全部卡池</option>${poolOptions}</select>
      <select class="sel" id="gachaGroupBy" style="flex:1"><option value="time" ${gachaGroupBy==='time'?'selected':''}>按时间</option><option value="pool" ${gachaGroupBy==='pool'?'selected':''}>按卡池</option></select>
    </div>

    ${dateUI}
    ${listHtml}
  `;
}
function renderRecordRow(r, hideDate) {
  if (r.type === 'reward') {
    const rewardLabel = r.rewardType || '绘制奖励';
    return `<div class="row"><div class="grow"><div class="name">🎁 <span class="badge gold">绘制奖励·${esc(rewardLabel)}</span>${r.char ? ` → ${esc(r.char)}` : ''}</div><div class="sub">${hideDate ? '' : `${fmtDate(r.date)} · `}${esc(r.poolName || '')} · ${esc(r.poolStatus || '')}</div></div><button class="del" data-act="delRec" data-id="${r.id}">×</button></div>`;
  }
  const hitInfo = r.hitPity ? `第 ${r.hitPity} 抽出金` : '未出金';
  const badge = r.hitPity ? `<span class="badge ${r.up ? 'green' : 'warn'}">${r.up ? 'UP' : '歪'}</span>` : `<span class="badge over">未出</span>`;
  return `<div class="row"><div class="grow"><div class="name">${r.char ? esc(r.char) : '（无）'} ${badge}${r.poolStatus ? `<span class="badge">${esc(r.poolStatus)}</span>` : ''}</div><div class="sub">${hideDate ? '' : `${fmtDate(r.date)} · `}${esc(r.poolName || '')} · 投入 ${r.pullsUsed} 抽 · ${hitInfo}</div></div><button class="del" data-act="delRec" data-id="${r.id}">×</button></div>`;
}

function toggleRecordFields() {
  const type = document.getElementById('recType').value;
  const pullFields = document.getElementById('pullFields');
  const rewardFields = document.getElementById('rewardFields');
  if (type === 'pull') { pullFields.classList.remove('hide'); rewardFields.classList.add('hide'); }
  else { pullFields.classList.add('hide'); rewardFields.classList.remove('hide'); }
}
function toggleRecResourceFields() {
  const cb = document.getElementById('recUseResource');
  const fields = document.getElementById('recResourceFields');
  if (!cb || !fields) return;
  if (cb.checked) fields.classList.remove('hide');
  else fields.classList.add('hide');
}