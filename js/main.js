/* ===================== 路由与侧边栏 ===================== */
const content = document.getElementById('content'); const sidebar = document.getElementById('sidebar'); const overlay = document.getElementById('overlay'); const navList = document.getElementById('navList'); const pageTitle = document.getElementById('pageTitle'); const menuBtn = document.getElementById('menuBtn');
function currentId() { return location.hash.replace('#', '') || 'home'; }

function render(scrollTop) {
  const id = currentId();
  if (id !== lastId) {
    currentTab = 'res';
    lastId = id;
    listDateFilter = 'today';
    wishShowForm = false;
    wishEditingId = null;
    ysShowCharForm = false;     // ← 新增
    ysEditingCharId = null;     // ← 新增
    ysShowImportForm = false;   // ← 新增
    showEquipManage = false;    // ← 新增
    charFilterSet = 'all';      // ← 新增
  }
  let title = '主页';
  if (id === 'home') { content.innerHTML = renderHome(); }
  else if (id === HUILV_ID) { ensureHuilvDefaults(); content.innerHTML = renderHuilv(); title = '时空中的绘旅人'; }
  else if (id === BENGTIE_ID) { content.innerHTML = renderBengtie(); title = '崩坏·星穹铁道'; }  
  else if (id === YUANSHEN_ID) { content.innerHTML = renderYuanshen(); title = '原神'; }
  else if (id === SHIJIE_ID) { content.innerHTML = renderShijie(); title = '世界之外'; }
  else if (id === WEIDING_ID) { content.innerHTML = renderWeiding(); title = '未定事件簿'; }
  else if (id === HUAYISHAN_ID) { content.innerHTML = renderHuayishan(); title = '花亦山心之月'; }
  else if (id === YEMU_ID) { content.innerHTML = renderYemu(); title = '夜幕之下'; }
  else if (id === DAIHAOYUAN_ID) { content.innerHTML = renderDaihaoyuan(); title = '代号鸢'; }
  else { const g = GAMES.find(x => x.id === id); if (!g) { location.hash = 'home'; return; } content.innerHTML = renderGame(id); title = g.name; }
  pageTitle.textContent = title;
  [...navList.querySelectorAll('.nav-item')].forEach(el => { el.classList.toggle('active', el.dataset.id === id); });
  if (scrollTop) window.scrollTo(0, 0);
  startEventCountdown();
}

function buildNav() {
  navList.innerHTML = '';

  const home = document.createElement('div');
  home.className = 'nav-item';
  home.dataset.id = 'home';
  home.innerHTML = '<span class="icon">🏠</span><span>主页</span>';
  navList.appendChild(home);

  const sep = document.createElement('div');
  sep.className = 'sidebar-header';
  sep.textContent = '游戏';
  navList.appendChild(sep);

  GAMES.forEach(g => {
    if (isGameHidden(g.id)) return;
    const el = document.createElement('div');
    el.className = 'nav-item';
    el.dataset.id = g.id;
    el.innerHTML = `<span class="icon">${g.icon}</span><span>${esc(g.name)}</span>`;
    navList.appendChild(el);
  });
}
function openSidebar() { sidebar.classList.add('open'); overlay.classList.add('show'); }
function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('show'); }
menuBtn.onclick = () => { sidebar.classList.contains('open') ? closeSidebar() : openSidebar(); };
overlay.onclick = closeSidebar;
navList.onclick = e => { const item = e.target.closest('.nav-item'); if (!item) return; location.hash = item.dataset.id; closeSidebar(); };

/* ===================== 事件 ===================== */
content.addEventListener('click', e => {
  let t = e.target;
  if (t.dataset.tab) { currentTab = t.dataset.tab; render(false); return; }

  // ★ 新增：如果点击的是子元素，向上找到最近的带 data-act 的元素
  if (!t.dataset.act) {
    const actEl = t.closest('[data-act]');
    if (actEl) t = actEl;
  }

  const goto = t.closest('[data-goto]'); if (goto) { location.hash = goto.dataset.goto; return; }
  const act = t.dataset.act; 
     // 活动筛选
  if (t.dataset.evFilter) {
    evFilterStatus = t.dataset.evFilter;
    render(false);
    return;
  }if (!act) return;
 
  const id = currentId(); const d = getGame(id);
    // 星铁专属操作，交给 handleBtAction 处理
    // 星铁 / 原神专属操作
  if (id === BENGTIE_ID && act.startsWith('bt')) { handleBtAction(act, t, d); return; }
  if ((id === YUANSHEN_ID || id === BENGTIE_ID) && act.startsWith('ys')) { handleYsAction(act, t, d); return; }
  if (id === SHIJIE_ID && act.startsWith('sj')) { handleSjAction(act, t, d); return; }
  if (id === WEIDING_ID && act.startsWith('wd')) { handleWdAction(act, t, d); return; }
  if (id === HUAYISHAN_ID && act.startsWith('hy')) { handleHyAction(act, t, d); return; }
  if (id === YEMU_ID && act.startsWith('ym')) { handleYmAction(act, t, d); return; }
    switch (act) {
    case 'listDateToday': { listDateFilter = 'today'; render(false); break; }
    case 'listDateAll':   { listDateFilter = 'all';   render(false); break; }
    case 'evFilter': break;  // 由 data-ev-filter 单独处理，见下方
    case 'addRes': {
      const el = document.getElementById('resName');
      const name = el.value.trim();
      if (!name) { el.focus(); return; }
      d.resources.push({ id: uid(), name, value: '' });
      if (!d.resourceNames) d.resourceNames = [];
      if (!d.resourceNames.includes(name)) d.resourceNames.push(name);
      saveDB(); render(false);
      document.getElementById('resName')?.focus();
      break;
    }
    case 'delRes': { if (!confirm('删除？')) return; d.resources = d.resources.filter(r => r.id !== t.dataset.id); saveDB(); render(false); break; }
    case 'addEv': { const nameEl = document.getElementById('evName'); const startEl = document.getElementById('evStart'); const endEl = document.getElementById('evEnd'); const name = nameEl.value.trim(); if (!name) { nameEl.focus(); return; } d.events.push({ id: uid(), name, start: startEl.value, end: endEl.value }); saveDB(); render(false); break; }
    case 'delEv': { if (!confirm('删除？')) return; d.events = d.events.filter(ev => ev.id !== t.dataset.id); saveDB(); render(false); break; }

    // ===== 资源 Bank =====
        case 'huilvShowIncome':  { huilvResShowForm = 'income';  render(false); break; }
    case 'huilvShowExpense': { huilvResShowForm = 'expense'; render(false); break; }
    case 'huilvShowInit':    { huilvResShowForm = 'init';    render(false); break; }
    case 'huilvCancelForm':  { huilvResShowForm = '';        render(false); break; }

    case 'huilvSaveInit': {
      const bank = d.resourceBank;
      HL_RES_FIELDS.forEach(f => {
        const el = document.getElementById('huilvInit_' + f.key);
        if (el) bank.init[f.key] = +el.value || 0;
      });
      saveDB(); huilvResShowForm = ''; render(false);
      break;
    }

    case 'huilvSaveIncome': {
      if (saveResForm('huilv', HL_RES_FIELDS, 'income', d)) {
        huilvResShowForm = ''; render(false);
      }
      break;
    }
    case 'huilvSaveExpense': {
      if (saveResForm('huilv', HL_RES_FIELDS, 'expense', d)) {
        huilvResShowForm = ''; render(false);
      }
      break;
    }
    case 'cancelForm':  { resShowForm = '';        render(false); break; }

    case 'saveInit': {
      const bank = d.resourceBank;
      bank.init.purple = +document.getElementById('initPurple').value || 0;
      bank.init.red    = +document.getElementById('initRed').value    || 0;
      bank.init.paint  = +document.getElementById('initPaint').value  || 0;
      saveDB(); resShowForm = ''; render(false);
      break;
    }
    case 'toggleHidden': {
      toggleGameHidden(t.dataset.id);
      buildNav();
      render(false);
      break;
    }
    case 'saveIncome': {
      if (saveResForm('huilv', HL_RES_FIELDS, 'income', d)) {
        huilvResShowForm = ''; render(false);
      }
      break;
    }
    case 'saveExpense': {
      if (saveResForm('huilv', HL_RES_FIELDS, 'expense', d)) {
        huilvResShowForm = ''; render(false);
      }
      break;
    }
    case 'delBankRec': {
      if (!confirm('删除这条流水？资源总数会同步回滚。')) return;
      d.resourceBank.records = d.resourceBank.records.filter(r => r.id !== t.dataset.id);
      saveDB(); render(false);
      break;
    }

    // ===== 抽卡 & 卡池 =====
    case 'togglePoolManage': { const box = document.getElementById('poolManageBox'); if (box) box.classList.toggle('hide'); break; }
    case 'addCustomPool': {
      const input = document.getElementById('newPoolNameInput');
      const name = input.value.trim();
      if (!name) { input.focus(); return; }
      if (!d.customPools) d.customPools = [];
      if (d.customPools.includes(name)) { alert('该卡池已存在'); return; }
      d.customPools.push(name); saveDB(); render(false);
      break;
    }
    case 'delCustomPool': {
      const idx = +t.dataset.index;
      if (!confirm('删除这个自定义卡池？')) return;
      if (d.customPools) d.customPools.splice(idx, 1);
      saveDB(); render(false);
      break;
    }
        case 'wishShowAdd': { wishShowForm = true; wishEditingId = null; render(false); break; }
    case 'wishCancel':  { wishShowForm = false; wishEditingId = null; render(false); break; }
    case 'wishEdit':    { wishEditingId = t.dataset.id; wishShowForm = true; render(false); break; }
    case 'wishDel': {
      if (!confirm('删除这个心愿？')) return;
      d.wishlist = (d.wishlist || []).filter(w => w.id !== t.dataset.id);
      saveDB(); render(false);
      break;
    }
    case 'wishSave': {
      const name = document.getElementById('wishName').value.trim();
      const target = +document.getElementById('wishTarget').value || 0;
      const note = document.getElementById('wishNote').value.trim();
      if (!name) { alert('请输入角色/武器名'); return; }
      if (target <= 0) { alert('请输入有效目标抽数'); return; }
      if (!d.wishlist) d.wishlist = [];
      if (wishEditingId) {
        const w = d.wishlist.find(x => x.id === wishEditingId);
        if (w) { w.name = name; w.target = target; w.note = note; }
      } else {
        d.wishlist.push({ id: uid(), name, target, note });
      }
      saveDB();
      wishShowForm = false; wishEditingId = null;
      render(false);
      break;
    }
     case 'wishMoveUp': {
      const idx = (d.wishlist || []).findIndex(w => w.id === t.dataset.id);
      if (idx <= 0) return;
      const arr = d.wishlist;
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      saveDB(); render(false);
      break;
    }
    case 'wishMoveDown': {
      const idx = (d.wishlist || []).findIndex(w => w.id === t.dataset.id);
      if (idx < 0 || idx >= d.wishlist.length - 1) return;
      const arr = d.wishlist;
      [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
      saveDB(); render(false);
      break;
    }
    case 'wishDone': {
      const w = (d.wishlist || []).find(x => x.id === t.dataset.id);
      if (!w) return;
      w.done = true;
      saveDB(); render(false);
      break;
    }
    case 'wishUndone': {
      const w = (d.wishlist || []).find(x => x.id === t.dataset.id);
      if (!w) return;
      w.done = false;
      saveDB(); render(false);
      break;
    }
        // ===== 装备副本管理 =====
    case 'equipToggle': {
      showEquipManage = !showEquipManage;
      render(false);
      break;
    }
    case 'equipAdd': {
      const name = document.getElementById('eqName').value.trim();
      const s1 = document.getElementById('eqSet1').value.trim();
      const s2 = document.getElementById('eqSet2').value.trim();
      if (!name || (!s1 && !s2)) { alert('请填副本名和至少一个套装'); return; }
      const gameId = currentId();
      const ds = getEquipDungeons(gameId);
      ds.push({ id: uid(), name, sets: [s1, s2].filter(Boolean) });
      saveDB(); render(false);
      break;
    }
    case 'equipDel': {
      if (!confirm('删除这个副本？')) return;
      const gameId = currentId();
      const ds = getEquipDungeons(gameId);
      const idx = ds.findIndex(x => x.id === t.dataset.id);
      if (idx >= 0) ds.splice(idx, 1);
      saveDB(); render(false);
      break;
    }
    // ===== 数据备份 =====
    case 'exportAll': {
      const data = localStorage.getItem(STORE_KEY) || '{}';
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const now = new Date();
      const stamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
      const a = document.createElement('a');
      a.href = url;
      a.download = `game_tracker_${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      break;
    }
    case 'importAll': {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = () => {
        const file = input.files && input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const parsed = JSON.parse(ev.target.result);
            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
              throw new Error('格式不对');
            }
            if (!confirm('导入会覆盖当前所有数据，确定继续吗？')) return;
            localStorage.setItem(STORE_KEY, JSON.stringify(parsed));
            DB = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
            alert('导入成功！');
            render(true);
          } catch (err) {
            alert('导入失败：' + (err.message || '文件格式错误'));
          }
        };
        reader.onerror = () => alert('读取文件失败');
        reader.readAsText(file);
      };
      input.click();
      break;
    }
    case 'showPullForm': {
      const form = document.getElementById('recordForm');
      form.classList.remove('hide');
      document.getElementById('recType').value = 'pull';
      document.getElementById('recDate').value = todayStr();
      document.getElementById('recPoolName').value = gachaFilterPool || '';
      document.getElementById('recPulls').value = '';
      document.getElementById('recHitPity').value = '';
      document.getElementById('recChar').value = '';
      const cb = document.getElementById('recUseResource');
      if (cb) { cb.checked = false; toggleRecResourceFields(); }
      toggleRecordFields();
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;
    }
    case 'showRewardForm': {
      const form = document.getElementById('recordForm');
      form.classList.remove('hide');
      document.getElementById('recType').value = 'reward';
      document.getElementById('recDate').value = todayStr();
      document.getElementById('recPoolName').value = gachaFilterPool || '';
      document.getElementById('recRewardChar').value = '';
      toggleRecordFields();
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;
    }
    case 'cancelRecord': { document.getElementById('recordForm').classList.add('hide'); break; }
    case 'saveRecord': {
      const type = document.getElementById('recType').value;
      const date = document.getElementById('recDate').value || todayStr();
      const poolName = document.getElementById('recPoolName').value.trim();
      const poolStatus = document.getElementById('recPoolStatus').value;
      if (!poolName) { alert('请输入卡池名称'); return; }

      if (type === 'pull') {
        const pullsUsed = +document.getElementById('recPulls').value;
        const hitPityRaw = document.getElementById('recHitPity').value;
        const hitPity = hitPityRaw ? +hitPityRaw : null;
        const char = document.getElementById('recChar').value.trim();
        const up = document.getElementById('recUp').value === '1';
        if (!pullsUsed) { alert('请输入本次投入抽数'); return; }
        d.gachaRecords.push({ id: uid(), date, poolName, poolStatus, type: 'pull', pullsUsed, hitPity, char, up });

        // ★ 资源消耗联动
        const useRes = document.getElementById('recUseResource');
        if (useRes && useRes.checked) {
          const usePaint  = +document.getElementById('recUsePaint').value  || 0;
          const usePurple = +document.getElementById('recUsePurple').value || 0;
          if (usePaint || usePurple) {
            d.resourceBank.records.push({
              id: uid(), date, type: 'expense', category: '抽卡消耗',
              purple: -usePurple, red: 0, paint: -usePaint,
              note: poolName
            });
          }
        }
      } else {
        const rewardType = document.getElementById('recRewardType').value;
        const char = document.getElementById('recRewardChar').value.trim();
        d.gachaRecords.push({ id: uid(), date, poolName, poolStatus, type: 'reward', rewardType, char });
      }
      saveDB(); render(false); break;
    }
    case 'delRec': { if (!confirm('删除这条记录？')) return; d.gachaRecords = d.gachaRecords.filter(r => r.id !== t.dataset.id); saveDB(); render(false); break; }

    case 'addPay': { const itemEl = document.getElementById('payItem'); const amtEl = document.getElementById('payAmount'); const dateEl = document.getElementById('payDate'); const item = itemEl.value.trim(); const amount = +amtEl.value; if (!item) { itemEl.focus(); return; } if (!amount) { amtEl.focus(); return; } d.purchases.push({ id: uid(), item, amount, date: dateEl.value || todayStr(), note: '' }); saveDB(); render(false); break; }
    case 'delPay': { if (!confirm('删除？')) return; d.purchases = d.purchases.filter(p => p.id !== t.dataset.id); saveDB(); render(false); break; }
  }
});

content.addEventListener('input', e => {
  const t = e.target; const d = getGame(currentId());
    // 原神角色搜索
  if (t.id === 'ysCharSearch') {
    const q = t.value.trim().toLowerCase();
    document.querySelectorAll('[data-char-name]').forEach(el => {
      const name = (el.dataset.charName || '').toLowerCase();
      el.style.display = (!q || name.includes(q)) ? '' : 'none';
    });
    return;
  }
  if (t.dataset.res) { const r = d.resources.find(x => x.id === t.dataset.res); if (r) { r.value = t.value; saveDB(); } }
  if (currentId() === SHIJIE_ID) {
    const d = getGame(SHIJIE_ID);
    const p = d.gachaPools.find(x => x.id === d.gachaActiveId);
    if (p) {
      if (t.id === 'sjPoolName' && p.type !== 'permanent') { p.name = t.value; saveDB(); }
      else if (t.id === 'sjPoolMaxPity') {
        p.maxPity = Math.max(1, +t.value || (p.type === 'permanent' ? 70 : 80));
        saveDB();
      }
      else if (t.id === 'sjPoolPityLeft') {
        p.pityLeft = Math.max(0, Math.min(p.maxPity, +t.value || 0));
        saveDB();
      }
      else if (t.id === 'sjPoolTotalPulls' && p.type !== 'permanent') {
        p.totalPulls = Math.max(0, +t.value || 0);
        saveDB();
      }
    }
  }
});

content.addEventListener('change', e => {
  const t = e.target;

  if (t.id === 'recType') { toggleRecordFields(); }
  else if (t.id === 'gachaFilterPool') { gachaFilterPool = t.value; render(false); }
  else if (t.id === 'gachaGroupBy') { gachaGroupBy = t.value; render(false); }
  else if (t.id === 'payGroupBy') { payGroupBy = t.value; render(false); }
  else if (t.id === 'resFilterType') { resFilterType = t.value; render(false); }
  else if (t.id === 'recUseResource') { toggleRecResourceFields(); }
  else if (t.id === 'btResFilterType') { btResFilterType = t.value; render(false); }
  else if (t.id === 'btExCategory') {
    const type = t.value;
    const gainGrp = document.getElementById('btGainGroup');
    const exEls = BENGTIE_RES_FIELDS.map(f => document.getElementById('btEx_' + f.key));
    const gainEls = BENGTIE_RES_FIELDS.map(f => document.getElementById('btGain_' + f.key));
    // 清空
    [...exEls, ...gainEls].forEach(el => { if (el) el.value = ''; });
    // 兑换类的显示获得区
    if (type === '星琼兑专票' || type === '星琼兑普票' || type === '星辉兑换') {
      if (gainGrp) gainGrp.classList.remove('hide');
    } else {
      if (gainGrp) gainGrp.classList.add('hide');
    }
    // 默认值
    if (type === '星琼兑专票') {
      const ex = document.getElementById('btEx_jade'); if (ex) ex.value = 160;
      const gain = document.getElementById('btGain_specialTicket'); if (gain) gain.value = 1;
    } else if (type === '星琼兑普票') {
      const ex = document.getElementById('btEx_jade'); if (ex) ex.value = 160;
      const gain = document.getElementById('btGain_normalTicket'); if (gain) gain.value = 1;
    }
  } 
  else if (t.id === 'wdResFilterType') { wdResFilterType = t.value; render(false); }
  // 收入：充值才激活红钻框
  else if (t.id === 'inCategory') {
    const isCharge = t.value === '充值';
    const redInput = document.getElementById('inRed');
    if (redInput) {
      redInput.disabled = !isCharge;
      if (!isCharge) redInput.value = '';
    }
  }

  // 消耗类型联动
  else if (t.id === 'exCategory') {
    const type = t.value;
    const exPurple = document.getElementById('exPurple');
    const exRed    = document.getElementById('exRed');
    const exPaint  = document.getElementById('exPaint');
    const gainP    = document.getElementById('exGainPurple');
    const gainT    = document.getElementById('exGainPaint');
    const gainGrp  = document.getElementById('gainGroup');

    // 清空
    exPurple.value = ''; exRed.value = ''; exPaint.value = '';
    gainP.value = ''; gainT.value = '';
    gainGrp.classList.add('hide');

        if (type === '兑换颜料') {
      exPurple.value = 1200;
      gainT.value = 10;
      gainGrp.classList.remove('hide');
    } else if (type === '红钻兑换紫钻') {
      gainGrp.classList.remove('hide');
    } else if (type === '红钻兑换礼包') {
      gainGrp.classList.remove('hide');
    }
  }

  // 红钻兑换紫钻：1:1 联动
  else if (t.id === 'exRed') {
    const cat = document.getElementById('exCategory');
    if (cat && cat.value === '红钻兑换紫钻') {
      const gainP = document.getElementById('exGainPurple');
      if (gainP) gainP.value = t.value;
    }
  }
    else if (t.id === 'btHitPoolSel') {
    const poolCfg = BENGTIE_POOLS.find(p => p.key === t.value);
    const upGrp = document.getElementById('btHitUpGroup');
    if (upGrp) {
      if (poolCfg && poolCfg.hasGuaranteed) upGrp.classList.remove('hide');
      else upGrp.classList.add('hide');
    }
  }
  else if (t.id === 'ysResFilterType') { ysResFilterType = t.value; render(false); }
  else if (t.id === 'ysExCategory') {
    const type = t.value;
    const gainGrp = document.getElementById('ysGainGroup');
    const exEls = YUANSHEN_RES_FIELDS.map(f => document.getElementById('ysEx_' + f.key));
    const gainEls = YUANSHEN_RES_FIELDS.map(f => document.getElementById('ysGain_' + f.key));
    [...exEls, ...gainEls].forEach(el => { if (el) el.value = ''; });
    if (type === '原石兑纠缠之缘' || type === '原石兑相遇之缘' || type === '创世结晶兑换') {
      if (gainGrp) gainGrp.classList.remove('hide');
    } else {
      if (gainGrp) gainGrp.classList.add('hide');
    }
    if (type === '原石兑纠缠之缘') {
      const ex = document.getElementById('ysEx_primogem'); if (ex) ex.value = 160;
      const gain = document.getElementById('ysGain_intertwined'); if (gain) gain.value = 1;
    } else if (type === '原石兑相遇之缘') {
      const ex = document.getElementById('ysEx_primogem'); if (ex) ex.value = 160;
      const gain = document.getElementById('ysGain_fate'); if (gain) gain.value = 1;
    } else if (type === '创世结晶兑换') {
      const ex = document.getElementById('ysEx_crystal'); if (ex) ex.value = 300;
      const gain = document.getElementById('ysGain_primogem'); if (gain) gain.value = 300;
    }
  }
  else if (t.id === 'ysHitPoolSel') {
    const poolCfg = YUANSHEN_POOLS.find(p => p.key === t.value);
    const upGrp = document.getElementById('ysHitUpGroup');
    if (upGrp) {
      if (poolCfg && poolCfg.hasGuaranteed) upGrp.classList.remove('hide');
      else upGrp.classList.add('hide');
    }
  }
    else if (t.id === 'sjResFilterType') { sjResFilterType = t.value; render(false); }
  else if (t.id === 'sjPoolSel') {
    const d = getGame(SHIJIE_ID);
    d.gachaActiveId = t.value; saveDB(); render(false);
  }
  else if (t.id === 'sjPoolStatus') {
    const d = getGame(SHIJIE_ID);
    const p = d.gachaPools.find(x => x.id === d.gachaActiveId);
    if (p) { p.status = t.value; saveDB(); }
  }
  else if (t.id === 'hyResFilterType') { hyResFilterType = t.value; render(false); }
  else if (t.id === 'hyFilterPool')    { hyFilterPool = t.value; render(false); }
  else if (t.id === 'ymResFilterType') { ymResFilterType = t.value; render(false); }
  else if (t.id === 'ymExCategory') {
    const type = t.value;
    const gainGrp = document.getElementById('ymGainGroup');
    const exEls = YEMU_RES_FIELDS.map(f => document.getElementById('ymEx_' + f.key));
    const gainEls = YEMU_RES_FIELDS.map(f => document.getElementById('ymGain_' + f.key));
    [...exEls, ...gainEls].forEach(el => { if (el) el.value = ''; });
    if (type === '金砖兑钥匙') {
      if (gainGrp) gainGrp.classList.remove('hide');
    } else {
      if (gainGrp) gainGrp.classList.add('hide');
    }
  }
  else if (t.id === 'ymHitPoolSel') {
    const poolCfg = YEMU_POOLS.find(p => p.key === t.value);
    const upGrp = document.getElementById('ymHitUpGroup');
    if (upGrp) {
      if (poolCfg && poolCfg.hasGuaranteed) upGrp.classList.remove('hide');
      else upGrp.classList.add('hide');
    }
  }
  else if (t.id === 'homePayRange') { homePayRange = t.value; render(false); }
  else if (t.id === 'listDateFilter') { listDateFilter = t.value || 'today'; render(false); }
  else if (t.id === 'ysFilterLevel')  { ysFilterLevel  = t.value; render(false); }
  else if (t.id === 'ysFilterTalent') { ysFilterTalent = t.value; render(false); }
  else if (t.id === 'ysFilterStatus') { ysFilterStatus = t.value; render(false); }
  else if (t.id === 'charFilterSet') { charFilterSet = t.value; render(false); }
  else if (t.id === 'ysFilterLevel')  { ysFilterLevel  = t.value; render(false); }
  else if (t.id === 'ysFilterTalent') { ysFilterTalent = t.value; render(false); }
  else if (t.id === 'ysFilterStatus') { ysFilterStatus = t.value; render(false); }
  else if (t.id && /^[ar]_set1Name$/.test(t.id)) {
    // 套装1切换时，重绘表单以决定是否显示第二行
    // 但直接 render 会丢输入，所以手动控制 DOM
    const prefix = t.id.charAt(0);
    const countWrap = document.getElementById(prefix + '_set1CountWrap');
    const set2Wrap = document.getElementById(prefix + '_set2Wrap');
    const isScatter = t.value === '__scatter__' || t.value === '散件';
    if (isScatter) {
      if (countWrap) countWrap.innerHTML = '';
      if (set2Wrap) set2Wrap.style.display = 'none';
    } else {
      if (countWrap && !countWrap.innerHTML.trim()) {
        countWrap.innerHTML = `<select class="inp" id="${prefix}_set1Count">
          <option value="4">4件套</option><option value="2">2件套</option></select>`;
      }
      // 不自动显示，等用户选 2 件套
    }
  }
  // 收入来源切换 → 先清空再自动填默认值
  else if (t.dataset.resPrefix && t.dataset.resType === 'income') {
    const prefix = t.dataset.resPrefix;
    // 找出该游戏所有资源字段，全部清空「本次增加」的输入框
    const fieldMap = {
      huilv:     ['purple', 'red', 'paint'],
      bt:        ['jade', 'normalTicket', 'specialTicket', 'starlight'],
      ys:        ['primogem', 'fate', 'intertwined', 'crystal'],
      sj:        ['yellow', 'purple', 'shard'],
      wd:        ['chip', 'tear'],
      hy:        ['goldLeaf', 'token', 'jadeMark'],
      ym:        ['goldBrick', 'redBrick', 'limitedKey', 'normalKey']
    };
    const keys = fieldMap[prefix] || [];
    keys.forEach(k => {
      const input = document.getElementById(`${prefix}_in_${k}`);
      if (input) input.value = '';
    });

    // 再填默认值
    const defaults = (INCOME_DEFAULTS[prefix] || {})[t.value];
    if (defaults) {
      Object.keys(defaults).forEach(k => {
        const input = document.getElementById(`${prefix}_in_${k}`);
        if (input) input.value = defaults[k];
      });
    }
  }
  else if (t.id && /^[ar]_set1Count$/.test(t.id)) {
    const prefix = t.id.charAt(0);
    const set2Wrap = document.getElementById(prefix + '_set2Wrap');
    if (set2Wrap) set2Wrap.style.display = (t.value === '2') ? '' : 'none';
  }
});

window.addEventListener('hashchange', () => render(true));
buildNav(); render(true);