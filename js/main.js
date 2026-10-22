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

  // ★ 只有点的地方没有 data-act 时，才走 data-goto 跳转
  if (!t.dataset.act) {
    const goto = t.closest('[data-goto]');
    if (goto) { location.hash = goto.dataset.goto; return; }
  }
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
    case 'addEv': {
      const nameEl = document.getElementById('evName');
      const name = nameEl.value.trim();
      if (!name) { nameEl.focus(); return; }

      // 日期 + 时 + 分 → 拼成 datetime-local 格式 YYYY-MM-DDTHH:MM
      // 日期留空 → 整个时间视为空（活动可以是"无起止时间"）
      const readDT = (prefix) => {
        const dateEl = document.getElementById(prefix + 'Date');
        if (!dateEl || !dateEl.value) return '';
        const hEl = document.getElementById(prefix + 'Hour');
        const mEl = document.getElementById(prefix + 'Min');
        const h = (hEl && hEl.value) || '00';
        const m = (mEl && mEl.value) || '00';
        return `${dateEl.value}T${h}:${m}`;
      };

      const start = readDT('evStart');
      const end   = readDT('evEnd');

      d.events.push({ id: uid(), name, start, end });
      saveDB();
      render(false);
      break;
    }
    case 'toggleEvDone': {
      // 主页上按钮带 data-game；游戏页上没带，用当前游戏
      const gameId = t.dataset.game || currentId();
      const dg = getGame(gameId);
      const ev = (dg.events || []).find(x => x.id === t.dataset.id);
      if (!ev) break;
      ev.done = !ev.done;
      saveDB();
      render(false);
      break;
    }
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
        // ===== 1. 解析 AI 文本 =====
    case 'aiParse': {
      const text = document.getElementById('aiTextArea').value.trim();
      if (!text) { alert('请先粘贴公告文本'); return; }
      
      // 判断游戏
      let defaultGameId = '';
      if (/绘旅人|颜料|画灵|采风|繪旅人|顏料|畫靈|採風/.test(text)) defaultGameId = HUILV_ID;
      else if (/星穹铁道|星琼|开拓者|专票|星穹鐵道|星瓊|開拓者|專票/.test(text)) defaultGameId = BENGTIE_ID;
      else if (/原神|原石|旅行者|纠缠之缘|原石|旅行者|糾纏之緣/.test(text)) defaultGameId = YUANSHEN_ID;
      else if (/世界之外|侧影|晶石|側影/.test(text)) defaultGameId = SHIJIE_ID;
      else if (/未定|律师|晶片|左然|莫弈|陆景和|夏彦|律師|陸景和|夏彥/.test(text)) defaultGameId = WEIDING_ID;
      else if (/花亦山|学子|名士|金叶子|學子|名士|金葉子/.test(text)) defaultGameId = HUAYISHAN_ID;
      else if (/夜幕|夜行者|金砖|骰子|夜幕|夜行者|金磚|骰子/.test(text)) defaultGameId = YEMU_ID;
      else if (/代号鸢|广陵王|殿下|白金|代號鳶|廣陵王|殿下|白金/.test(text)) defaultGameId = DAIHAOYUAN_ID;

      if (!defaultGameId) {
        alert('未能识别出属于哪个游戏。请确保文本中包含游戏名或专属词汇。');
        return;
      }

      const gameDefaultTime = {
        [YUANSHEN_ID]: '11:00', [BENGTIE_ID]: '11:00', [HUILV_ID]: '09:30',
        [SHIJIE_ID]: '10:00', [YEMU_ID]: '10:00', [HUAYISHAN_ID]: '09:00',
        [DAIHAOYUAN_ID]: '11:00', [WEIDING_ID]: '13:00'
      }[defaultGameId] || '10:00';

      const lines = text.split('\n');
      const results = [];
      let currentActName = '';

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        // 1. 智能提取名字（兼容繁体）
        let nameMatch = line.match(/[【《「](.*?)[》】」]/);
        if (nameMatch && nameMatch[1]) {
          let n = nameMatch[1].trim();
          if (n && !/时间|日期|说明|内容|時間|日期|說明|內容/.test(n)) currentActName = n;
        } else if (line.startsWith('◇')) {
          let n = line.replace(/^◇\s*/, '').trim();
          if (n && !/时间|日期|说明|内容|時間|日期|說明|內容/.test(n)) currentActName = n;
        } else if (/[丨|]/.test(line) && line.length < 30) {
          let parts = line.split(/[丨|]/);
          let best = '';
          parts.forEach(p => {
            p = p.trim();
            if (p.length > 2 && p.length > best.length && !/情报|公告|更新|开放|情報|公告|更新|開放/.test(p)) best = p;
          });
          if (best) currentActName = best.replace(/活动预告|限时活动|活动|预告|活動預告|限時活動|活動|預告/g, '').trim();
        } else if (i === 0 && line.length < 25 && !/活动|公告|时间|更新|说明|活動|公告|時間|更新|說明/.test(line)) {
          currentActName = line;
        }

        // 2. 解析时间
        let isRange = /(\d{1,2})[月\.\-\/](\d{1,2})/.test(line) && /[-~至]/.test(line) && !/(兑换|关卡|兌換|關卡)/.test(line);
        let isMaintenanceEnd = /(维护后(开启|开放)|維護後(開啟|開放))/.test(line) && /(结束|結束)/.test(line) && /(\d{1,2})[月\.\-\/](\d{1,2})/.test(line);

        if (isRange || isMaintenanceEnd) {
          const regex = /(?:(\d{4})[年\.\-\/])?(\d{1,2})[月\.\-\/](\d{1,2})[日]?(?:\s*(\d{1,2})[:：](\d{2}))?/g;
          let rawMatches = [...line.matchAll(regex)];
          
          // ★ 核心修复：过滤掉类似 "1-19" 这种没有"月/日"也没有"时:分"且没有4位年份的假日期
          let matches = rawMatches.filter(m => {
            let str = m[0];
            return /[月日]/.test(str) || /[:：]/.test(str) || m[1]; 
          });
          
          if (matches.length >= 2) { // 正常有两个时间
            let m1 = matches[0], m2 = matches[1];
            let y1 = m1[1] ? m1[1] : new Date().getFullYear();
            let startStr = `${y1}-${m1[2].padStart(2, '0')}-${m1[3].padStart(2, '0')}T${m1[4] ? m1[4].padStart(2, '0') : gameDefaultTime.split(':')[0]}:${m1[5] ? m1[5] : (m1[4] ? '00' : gameDefaultTime.split(':')[1])}`;
            
            let y2 = m2[1] ? m2[1] : y1;
            if (!m2[1] && parseInt(m2[2]) < parseInt(m1[2])) y2 = (parseInt(y1) + 1).toString();
            let endStr = `${y2}-${m2[2].padStart(2, '0')}-${m2[3].padStart(2, '0')}T${m2[4] ? m2[4].padStart(2, '0') : gameDefaultTime.split(':')[0]}:${m2[5] ? m2[5] : (m2[4] ? '00' : gameDefaultTime.split(':')[1])}`;

            let finalName = currentActName || '未命名活动';
            if (!results.some(r => r.name === finalName)) {
              results.push({ gameId: defaultGameId, name: finalName, start: startStr, end: endStr });
            }
          } else if (matches.length === 1 && isMaintenanceEnd) { 
            // 只有结束时间（如：将在维护后开启，10月28日23:59结束）
            let mEnd = matches[0];
            let today = new Date();
            let startStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}T${gameDefaultTime}`;
            
            let yEnd = mEnd[1] ? mEnd[1] : today.getFullYear();
            let endStr = `${yEnd}-${mEnd[2].padStart(2, '0')}-${mEnd[3].padStart(2, '0')}T${mEnd[4] ? mEnd[4].padStart(2, '0') : gameDefaultTime.split(':')[0]}:${mEnd[5] ? mEnd[5] : (mEnd[4] ? '00' : gameDefaultTime.split(':')[1])}`;

            let finalName = currentActName || '未命名活动';
            if (!results.some(r => r.name === finalName)) {
              results.push({ gameId: defaultGameId, name: finalName, start: startStr, end: endStr });
            }
          }
        }
      }

      if (results.length === 0) {
        alert('未能识别出完整的起止时间。请检查文本格式。');
        return;
      }

      window._aiParsedResults = results;

      const previewHtml = `
        <div style="padding:10px;background:#f8f9fa;border-radius:8px;border:1px solid #dee2e6;">
          <div style="font-size:13px;font-weight:600;margin-bottom:8px;color:#e8590c">识别到 ${results.length} 个活动，请确认：</div>
          ${results.map((r, idx) => `
            <div style="font-size:12px;margin-bottom:6px;padding-bottom:6px;border-bottom:1px dashed #ddd;">
              <b>${esc(r.name)}</b><br>
              <span style="color:#868e96">${r.start.replace('T', ' ')} ~ ${r.end.replace('T', ' ')}</span>
            </div>
          `).join('')}
          <button class="btn" data-act="aiConfirmImport" style="margin-top:10px;background:#2f9e44">✅ 确认导入这 ${results.length} 个活动</button>
        </div>
      `;
      document.getElementById('aiPreviewArea').innerHTML = previewHtml;
      break;
    }
    // ===== 2. 确认导入 =====
    case 'aiConfirmImport': {
      const results = window._aiParsedResults || [];
      if (!results.length) return;
      
      let count = 0;
      results.forEach(r => {
        const d = getGame(r.gameId);
        if (!d.events) d.events = [];
        d.events.push({ id: uid(), name: r.name, start: r.start, end: r.end });
        count++;
      });
      saveDB();
      window._aiParsedResults = null; // 清空
      alert(`成功导入 ${count} 个活动！`);
      render(false); // 刷新主页
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
    case 'addYearCardQuick': {
      if (!d.yearlyCard) d.yearlyCard = { startDate: '', records: [] };
      const amount = +t.dataset.amount || 0;
      const dateEl = document.getElementById('ycDate');
      const noteEl = document.getElementById('ycNote');
      const date = (dateEl && dateEl.value) || todayStr();
      const note = noteEl ? noteEl.value.trim() : '';
      d.yearlyCard.records.push({ id: uid(), date, amount, note });
      saveDB();
      render(false);
      break;
    }
    case 'delYearCard': {
      if (!confirm('删除这条年卡记录？')) return;
      if (d.yearlyCard) {
        d.yearlyCard.records = d.yearlyCard.records.filter(r => r.id !== t.dataset.id);
      }
      saveDB();
      render(false);
      break;
    }
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