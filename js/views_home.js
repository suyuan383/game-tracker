function renderHome() {
  const now = Date.now();

  // ===== 进行中的活动（过滤隐藏游戏）=====
  const ongoing = [];
  GAMES.forEach(g => {
    if (isGameHidden(g.id)) return;
    const d = getGame(g.id);
    (d.events || []).forEach(ev => {
      const endT = parseTime(ev.end);
      if (isNaN(endT)) return;
      if (endT < now) return;
      const startT = ev.start ? parseTime(ev.start) : 0;
      if (startT && startT > now) return;
      const info = leftInfo(ev.end);
      if (info && !info.over) ongoing.push({ game: g, ev, info });
    });
  });
  ongoing.sort((a, b) => (a.ev.end || '').localeCompare(b.ev.end || ''));

  const eventHtml = `
    <div class="section-title">⏰ 进行中的活动（${ongoing.length}）</div>
    ${ongoing.length ? `
      <div class="list">
        ${ongoing.map(u => `
          <div class="row" data-goto="${u.game.id}">
            <span style="font-size:18px">${u.game.icon}</span>
            <div class="grow">
              <div class="name">${esc(u.ev.name)}</div>
              <div class="sub">${esc(u.game.name)} · 截止 ${fmtDT(u.ev.end)}</div>
            </div>
            <span class="badge ${u.info.urgent?'warn':''}">${u.info.text}</span>
          </div>`).join('')}
      </div>` : `<div class="list"><div class="empty">暂无进行中的活动</div></div>`}
  `;

  // ===== 氪金统计（过滤隐藏游戏）=====
  const nowDate = new Date();
  const curYM = `${nowDate.getFullYear()}-${String(nowDate.getMonth()+1).padStart(2,'0')}`;
  const curY = `${nowDate.getFullYear()}`;

  let totalAmount = 0;
  let count = 0;
  const gameStats = [];

  GAMES.forEach(g => {
    if (isGameHidden(g.id)) return;
    const d = getGame(g.id);
    let sum = 0;
    let cnt = 0;
    (d.purchases || []).forEach(p => {
      const date = p.date || '';
      if (homePayRange === 'month' && !date.startsWith(curYM)) return;
      if (homePayRange === 'year'  && !date.startsWith(curY))  return;
      const amt = +p.amount || 0;
      totalAmount += amt;
      count++;
      sum += amt;
      cnt++;
    });
    if (cnt > 0) gameStats.push({ game: g, sum, count: cnt });
  });

  gameStats.sort((a, b) => b.sum - a.sum);
  const rangeLabel = homePayRange === 'month' ? '本月' : (homePayRange === 'year' ? '本年' : '累计');

  const payHtml = `
    <div class="section-title">💰 氪金统计</div>
    <div style="margin-bottom:10px">
      <select class="sel" id="homePayRange" style="width:100%">
        <option value="all"   ${homePayRange==='all'  ?'selected':''}>全部累计</option>
        <option value="year"  ${homePayRange==='year' ?'selected':''}>本年</option>
        <option value="month" ${homePayRange==='month'?'selected':''}>本月</option>
      </select>
    </div>
    <div class="stats">
      <div class="stat"><div class="num">¥${totalAmount.toFixed(0)}</div><div class="lbl">${rangeLabel}总金额</div></div>
      <div class="stat"><div class="num">${count}</div><div class="lbl">笔数</div></div>
    </div>
    ${gameStats.length ? `
      <div class="list">
        ${gameStats.map(s => `
          <div class="row" data-goto="${s.game.id}">
            <span style="font-size:18px">${s.game.icon}</span>
            <div class="grow">
              <div class="name">${esc(s.game.name)}</div>
              <div class="sub">${s.count} 笔</div>
            </div>
            <span style="font-weight:600;color:#e8590c">¥${s.sum.toFixed(2)}</span>
          </div>`).join('')}
      </div>` : `<div class="list"><div class="empty">暂无充值记录</div></div>`}
  `;

  // ===== 显示管理 =====
  const manageHtml = `
    <div class="section-title">👁 显示管理</div>
    <div class="card" style="margin-bottom:20px">
      <div style="font-size:12px;color:#999;margin-bottom:10px;line-height:1.6">
        关闭后侧边栏和主页不再显示该游戏，<b style="color:#3b5bdb">数据不会删除</b>，重新开启即可恢复。
      </div>
      <div style="display:flex;flex-direction:column;gap:2px">
        ${GAMES.map(g => {
          const hidden = isGameHidden(g.id);
          return `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 2px;border-bottom:1px solid #f5f5f7">
              <span style="font-size:18px">${g.icon}</span>
              <span style="flex:1;font-size:14px">${esc(g.name)}</span>
              <button class="mini" data-act="toggleHidden" data-id="${g.id}"
                style="${hidden ? 'background:#f1f3f5;color:#adb5bd' : 'background:#ebfbee;color:#2f9e44'}">
                ${hidden ? '已隐藏' : '显示中'}
              </button>
            </div>`;
        }).join('')}
      </div>
    </div>
  `;

  // ===== 数据备份 =====
  const backupHtml = `
    <div class="section-title">🗄 数据备份</div>
    <div class="card" style="margin-bottom:20px">
      <div style="font-size:12px;color:#999;margin-bottom:10px;line-height:1.6">
        导出会保存所有游戏的全部数据（资源 / 活动 / 抽卡 / 充值 / 角色等）。<br>
        导入会<b style="color:#e03131">覆盖</b>当前所有数据，请谨慎操作。
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn" data-act="exportAll">📤 导出全部数据</button>
        <button class="btn ghost" data-act="importAll">📥 导入备份</button>
      </div>
    </div>
  `;

  return eventHtml + payHtml + manageHtml + backupHtml;
}