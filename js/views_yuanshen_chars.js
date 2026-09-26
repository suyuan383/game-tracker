/* ===================== 原神角色练度 ===================== */
// 天赋是否达标
function isYsTalentOk(a, r) {
  const keys = ['talN', 'talS', 'talB'];
  const hasSuggestion = keys.some(k => +r[k] > 0);
  if (!hasSuggestion) return null;
  return keys.every(k => {
    const rv = +r[k] || 0;
    if (!rv) return true;
    return (+a[k] || 0) >= rv;
  });
}

// 等级筛选匹配
function isYsLevelMatch(a, filter) {
  const lv = +a.level || 0;
  if (filter === 'all')    return true;
  if (filter === 'empty')  return !lv;
  if (filter === 'lt80')   return lv > 0 && lv < 80;
  if (filter === '80to89') return lv >= 80 && lv < 90;
  if (filter === '90')     return lv >= 90;
  return true;
}
function emptyYsBuild() {
  return {
    level: '', talN: '', talS: '', talB: '',
    weapon: '', sets: [],
    sands: '', goblet: '', circlet: '',
    keyStats: ''
  };
}

/* 归一化：旧字符串 → 数组 */
function normalizeSets(build) {
  if (!build) return;
  if (typeof build.sets === 'string') build.sets = parseSetString(build.sets);
  if (!Array.isArray(build.sets)) build.sets = [];
}

/* ---------- 主页面 ---------- */
function renderYsCharsTab(d) {
  const chars = d.characters || [];
  chars.forEach(c => { normalizeSets(c.actual); normalizeSets(c.recommend); });

  const charForm = (ysShowCharForm || ysEditingCharId) ? renderYsCharForm(d) : '';
  const importForm = ysShowImportForm ? renderYsImportForm() : '';
  const managePanel = renderEquipManagePanel('yuanshen');

  const filtered = chars.filter(c => {
    if (!isYsLevelMatch(c.actual || {}, ysFilterLevel)) return false;
    if (ysFilterTalent !== 'all') {
      const tOk = isYsTalentOk(c.actual || {}, c.recommend || {});
      if (ysFilterTalent === 'ok'  && tOk !== true)  return false;
      if (ysFilterTalent === 'bad' && tOk !== false) return false;
    }
    if (ysFilterStatus !== 'all' && (c.status || 'pending') !== ysFilterStatus) return false;
    if (charFilterSet && charFilterSet !== 'all') {
      const aSets = (c.actual || {}).sets || [];
      const rSets = (c.recommend || {}).sets || [];
      const has = [...aSets, ...rSets].some(x => x.name === charFilterSet);
      if (!has) return false;
    }
    return true;
  });

  const listHtml = filtered.length
    ? filtered.map(c => renderYsCharCard(c)).join('')
    : `<div class="empty" style="padding:40px 0">没有匹配的角色</div>`;

  const allSetNames = getAllSetNames('yuanshen');
  const setOptions = ['<option value="all">全部圣遗物</option>']
    .concat(allSetNames.map(n => `<option value="${esc(n)}" ${charFilterSet===n?'selected':''}>${esc(n)}</option>`))
    .join('');

  const filterBar = chars.length ? `
    <div style="margin-bottom:10px">
      <input class="inp" id="ysCharSearch" placeholder="🔍 搜索角色名…" autocomplete="off" style="margin-bottom:8px">
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
        <select class="sel" id="ysFilterLevel" style="flex:1;min-width:90px">
          <option value="all"    ${ysFilterLevel==='all'   ?'selected':''}>全部等级</option>
          <option value="empty"  ${ysFilterLevel==='empty' ?'selected':''}>未填等级</option>
          <option value="lt80"   ${ysFilterLevel==='lt80'  ?'selected':''}>&lt; 80 级</option>
          <option value="80to89" ${ysFilterLevel==='80to89'?'selected':''}>80-89 级</option>
          <option value="90"     ${ysFilterLevel==='90'    ?'selected':''}>90 级</option>
        </select>
        <select class="sel" id="ysFilterTalent" style="flex:1;min-width:90px">
          <option value="all" ${ysFilterTalent==='all'?'selected':''}>天赋全部</option>
          <option value="bad" ${ysFilterTalent==='bad'?'selected':''}>天赋未达标</option>
          <option value="ok"  ${ysFilterTalent==='ok' ?'selected':''}>天赋已达标</option>
        </select>
        <select class="sel" id="ysFilterStatus" style="flex:1;min-width:90px">
          <option value="all"     ${ysFilterStatus==='all'    ?'selected':''}>状态全部</option>
          <option value="pending" ${ysFilterStatus==='pending'?'selected':''}>未完成</option>
          <option value="done"    ${ysFilterStatus==='done'   ?'selected':''}>已完成</option>
        </select>
      </div>
      <select class="sel" id="charFilterSet" style="width:100%">${setOptions}</select>
      <div style="font-size:12px;color:#999;margin-top:6px">共 ${chars.length} 个，显示 ${filtered.length} 个</div>
    </div>` : '';

  return `
    <div style="display:flex;gap:8px;margin-bottom:12px">
      <button class="btn" data-act="ysShowAddChar">＋ 添加角色</button>
      <button class="btn gold" data-act="ysShowImport">📥 AI 导入</button>
      <button class="btn ghost" data-act="equipToggle" style="flex:0 0 auto;padding:10px 14px">📚</button>
    </div>
    ${managePanel}
    ${charForm}
    ${importForm}
    ${filterBar}
    <div style="margin-top:4px">${listHtml}</div>
  `;
}

/* ---------- 卡片 ---------- */
function renderYsCharCard(c) {
  normalizeSets(c.actual); normalizeSets(c.recommend);
  const a = c.actual || emptyYsBuild();
  const r = c.recommend || emptyYsBuild();
  const status = c.status || 'pending';
  const statusBadge = status === 'done'
    ? `<span class="badge green">✓ 已完成</span>`
    : `<span class="badge" style="background:#ffe3e3;color:#e03131">✗ 未完成</span>`;

  const talent = (b) => (!b.talN && !b.talS && !b.talB) ? '—' : `${b.talN||'?'}/${b.talS||'?'}/${b.talB||'?'}`;
  const row = (label, aVal, rVal) => `
    <div style="display:flex;padding:5px 0;border-bottom:1px solid #f0f0f2;font-size:13px">
      <div style="flex:0 0 70px;color:#999">${label}</div>
      <div style="flex:1;color:#3b5bdb;word-break:break-all">${esc(aVal || '—')}</div>
      <div style="flex:1;color:#e8590c;word-break:break-all">${esc(rVal || '—')}</div>
    </div>`;
  const rowRec = (label, rVal) => `
    <div style="display:flex;padding:5px 0;border-bottom:1px solid #f0f0f2;font-size:13px">
      <div style="flex:0 0 80px;color:#999">${label}</div>
      <div style="flex:1;color:#e8590c;word-break:break-all">${esc(rVal || '—')}</div>
    </div>`;
  const rowTalent = () => {
    const tOk = isYsTalentOk(a, r);
    let color = '#3b5bdb', mark = '';
    if (tOk === true)  { color = '#2f9e44'; mark = ' ✓'; }
    if (tOk === false) { color = '#e03131'; mark = ' ✗'; }
    return `
      <div style="display:flex;padding:5px 0;border-bottom:1px solid #f0f0f2;font-size:13px">
        <div style="flex:0 0 70px;color:#999">天赋</div>
        <div style="flex:1;color:${color};word-break:break-all">${esc(talent(a) + mark)}</div>
        <div style="flex:1;color:#e8590c;word-break:break-all">${esc(talent(r))}</div>
      </div>`;
  };

  const rowSets = (label, aVal, rVal) => `
    <div style="display:flex;padding:5px 0;border-bottom:1px solid #f0f0f2;font-size:13px">
      <div style="flex:0 0 70px;color:#999">${label}</div>
      <div style="flex:1;color:#3b5bdb">${renderSetBadges(aVal)}</div>
      <div style="flex:1;color:#e8590c">${renderSetBadges(rVal)}</div>
    </div>`;

  return `
    <div class="card" data-char-name="${esc(c.name)}" style="margin-bottom:10px;padding:0">
      <div style="display:flex;align-items:center;padding:12px 14px;border-bottom:1px solid #f0f0f2;gap:8px">
        <div style="flex:1;font-size:15px;font-weight:600">${esc(c.name || '未命名')}</div>
        ${statusBadge}
        <button class="mini" data-act="ysEditChar" data-id="${c.id}">编辑</button>
        <button class="del" data-act="ysDelChar" data-id="${c.id}">×</button>
      </div>
      <div style="padding:10px 14px">
        <div style="display:flex;padding:5px 0;border-bottom:1px solid #f0f0f2;font-size:11px;color:#999">
          <div style="flex:0 0 70px"></div><div style="flex:1">实际</div><div style="flex:1">推荐</div>
        </div>
        ${row('等级', a.level, r.level)}
        ${rowTalent()}
        ${row('武器', a.weapon, r.weapon)}
        ${rowSets('圣遗物', a.sets, r.sets)}
        ${rowRec('沙漏推荐', r.sands)}
        ${rowRec('杯子推荐', r.goblet)}
        ${rowRec('头推荐', r.circlet)}
        ${rowRec('关键属性', r.keyStats)}
      </div>
    </div>`;
}

function renderSetBadges(arr) {
  if (!arr || !arr.length) return '—';
  if (arr.length === 1 && arr[0].name === '散件') return `<span class="badge over">散件</span>`;
  return arr.map(x =>
    `<span style="display:inline-block;background:#eef2ff;border-radius:6px;padding:1px 6px;margin:1px 2px;font-size:12px">${esc(x.name)}${x.count ? `<b style="color:#3b5bdb">×${x.count}</b>` : ''}</span>`
  ).join('');
}

/* ---------- 表单 ---------- */
function renderYsCharForm(d) {
  const isEditing = !!ysEditingCharId;
  let target = null;
  if (isEditing) target = (d.characters || []).find(c => c.id === ysEditingCharId);
  const a = target ? (target.actual || emptyYsBuild()) : emptyYsBuild();
  const r = target ? (target.recommend || emptyYsBuild()) : emptyYsBuild();
  normalizeSets(a); normalizeSets(r);
  const name = target ? target.name : '';
  const status = target ? (target.status || 'pending') : 'pending';

  const col = (prefix, build) => {
    const s1 = build.sets[0] || { name: '', count: 4 };
    const s2 = build.sets[1] || { name: '', count: 2 };
    const isS1Scatter = s1.name === '散件';
    const needS2 = !isS1Scatter && s1.count === 2;

    return `
    <div style="flex:1;min-width:0">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">${prefix === 'a' ? '📌 实际' : '💡 推荐'}</div>
      <div style="margin-bottom:6px"><div style="font-size:11px;color:#666;margin-bottom:2px">等级</div>
        <input class="inp" id="${prefix}_level" value="${esc(build.level)}" placeholder="如 90"></div>
      <div style="display:flex;gap:4px;margin-bottom:6px">
        <div style="flex:1"><div style="font-size:11px;color:#666;margin-bottom:2px">普攻</div><input class="inp" id="${prefix}_talN" value="${esc(build.talN)}"></div>
        <div style="flex:1"><div style="font-size:11px;color:#666;margin-bottom:2px">技能</div><input class="inp" id="${prefix}_talS" value="${esc(build.talS)}"></div>
        <div style="flex:1"><div style="font-size:11px;color:#666;margin-bottom:2px">爆发</div><input class="inp" id="${prefix}_talB" value="${esc(build.talB)}"></div>
      </div>
      <div style="margin-bottom:6px"><div style="font-size:11px;color:#666;margin-bottom:2px">武器</div>
        <input class="inp" id="${prefix}_weapon" value="${esc(build.weapon)}"></div>

      <div style="margin-bottom:6px">
        <div style="font-size:11px;color:#666;margin-bottom:2px">圣遗物套装 1</div>
        <div style="display:flex;gap:4px">
          <div style="flex:2">${renderSetNameSelect('yuanshen', `${prefix}_set1Name`, s1.name)}</div>
          <div style="flex:1" id="${prefix}_set1CountWrap">
            ${isS1Scatter ? '' : `<select class="inp" id="${prefix}_set1Count">
              <option value="4" ${s1.count===4?'selected':''}>4件套</option>
              <option value="2" ${s1.count===2?'selected':''}>2件套</option>
            </select>`}
          </div>
        </div>
      </div>

      <div style="margin-bottom:6px;${needS2?'':'display:none'}" id="${prefix}_set2Wrap">
        <div style="font-size:11px;color:#666;margin-bottom:2px">圣遗物套装 2（2件套）</div>
        ${renderSetNameSelect('yuanshen', `${prefix}_set2Name`, s2.name)}
      </div>

      ${prefix === 'r' ? `
      <div style="margin-bottom:6px"><div style="font-size:11px;color:#666;margin-bottom:2px">沙漏主属性</div>
        <input class="inp" id="${prefix}_sands" value="${esc(build.sands)}" placeholder="如 攻击%"></div>
      <div style="margin-bottom:6px"><div style="font-size:11px;color:#666;margin-bottom:2px">杯子主属性</div>
        <input class="inp" id="${prefix}_goblet" value="${esc(build.goblet)}" placeholder="如 雷伤%"></div>
      <div style="margin-bottom:6px"><div style="font-size:11px;color:#666;margin-bottom:2px">头主属性</div>
        <input class="inp" id="${prefix}_circlet" value="${esc(build.circlet)}" placeholder="如 暴击"></div>
      <div style="margin-bottom:6px"><div style="font-size:11px;color:#666;margin-bottom:2px">关键属性</div>
        <input class="inp" id="${prefix}_keyStats" value="${esc(build.keyStats)}" placeholder="如 暴击70+ 爆伤150+"></div>
      ` : ''}
    </div>`;
  };

  return `
    <div class="card" style="margin-bottom:12px">
      <div style="font-size:14px;font-weight:600;margin-bottom:10px">${isEditing ? '✏️ 编辑角色' : '＋ 添加角色'}</div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <div style="flex:1.6"><div style="font-size:11px;color:#666;margin-bottom:2px">角色名</div>
          <input class="inp" id="charName" value="${esc(name)}" placeholder="如 刻晴"></div>
        <div style="flex:1"><div style="font-size:11px;color:#666;margin-bottom:2px">状态</div>
          <select class="inp" id="charStatus">
            <option value="pending" ${status==='pending'?'selected':''}>未完成</option>
            <option value="done" ${status==='done'?'selected':''}>已完成</option>
          </select></div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${col('a', a)}
        ${col('r', r)}
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn ghost" data-act="ysCancelChar">取消</button>
        <button class="btn" data-act="ysSaveChar">保存</button>
      </div>
    </div>`;
}

/* ---------- AI 导入表单（保持不变） ---------- */
function renderYsImportForm() {
  return `
    <div class="card" style="margin-bottom:12px">
      <div style="font-size:14px;font-weight:600;margin-bottom:10px">📥 AI 文本导入</div>
      <div style="font-size:12px;color:#666;margin-bottom:8px;line-height:1.7">
        每行一个字段，支持：<span style="color:#3b5bdb">角色名 / 等级 / 天赋：10/10/10 / 武器 / 圣遗物：如雷2+平雷2 / 沙漏 / 杯子 / 头 / 关键属性</span><br>
        用 <span style="color:#e8590c">--- 推荐 ---</span> 分隔实际与推荐
      </div>
      <textarea class="inp" id="ysImportText" style="min-height:160px;font-family:monospace;font-size:13px" placeholder="粘贴文本..."></textarea>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn ghost" data-act="ysCancelImport">取消</button>
        <button class="btn" data-act="ysParseImport">解析并导入</button>
      </div>
    </div>`;
}

/* ---------- 解析器（简化版） ---------- */
function emptyYsBuildKeep() { return emptyYsBuild(); }

function parseYsBuildTextMulti(text) {
  const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
  if (!lines.length) return [];
  const markers = [];
  lines.forEach((line, i) => {
    if (/^(?:角色名|名字)[：:]/.test(line) || /^[【\[](.+?)[】\]]/.test(line)) markers.push(i);
  });
  if (markers.length >= 2) {
    const blocks = [];
    for (let i = 0; i < markers.length; i++) {
      const start = markers[i];
      const end = markers[i+1] !== undefined ? markers[i+1] : lines.length;
      blocks.push(lines.slice(start, end).join('\n'));
    }
    return blocks.map(b => parseYsBuildText(b)).filter(c => c.name);
  }
  const rawBlocks = text.split(/\n\s*\n+/).map(s => s.trim()).filter(Boolean);
  if (rawBlocks.length > 1) return rawBlocks.map(b => parseYsBuildText(b)).filter(c => c.name);
  const single = parseYsBuildText(text);
  return single.name ? [single] : [];
}

function parseYsBuildText(text) {
  const result = { name: '', actual: emptyYsBuild(), recommend: emptyYsBuild() };
  const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
  for (const line of lines) {
    let m;
    if ((m = line.match(/^(?:角色名|名字)[：:]\s*(.+)/))) { result.name = m[1].trim(); break; }
    if ((m = line.match(/^[【\[](.+?)[】\]]/))) { result.name = m[1].trim(); break; }
  }
  if (!result.name) {
    for (const line of lines) {
      if (line.length <= 8 && !/[：:0-9\/]/.test(line)) { result.name = line; break; }
    }
  }
  let mode = 'actual';
  for (const line of lines) {
    if (/^[-—=*]{3,}$/.test(line) || /^(---\s*)?(推荐|期望)/.test(line)) { mode = 'recommend'; continue; }
    parseYsLine(line, result[mode]);
  }
  return result;
}

function parseYsLine(line, target) {
  let m;
  if ((m = line.match(/^(?:等级|Lv|lv)[：:]?\s*(\d+)/))) { target.level = m[1]; return; }
  if ((m = line.match(/^(?:天赋|技能等级)[：:]?\s*(\d+)\s*[\/\-、,，\s]\s*(\d+)\s*[\/\-、,，\s]\s*(\d+)/))) {
    target.talN = m[1]; target.talS = m[2]; target.talB = m[3]; return;
  }
  if ((m = line.match(/^武器[：:]?\s*(.+)/))) { target.weapon = m[1].trim(); return; }
  if ((m = line.match(/^(?:圣遗物|遗物)[：:]?\s*(.+)/))) {
    target.sets = parseSetString(m[1].trim()); return;
  }
  if ((m = line.match(/^(?:沙漏|时之沙)[：:]?\s*(.+)/))) { target.sands = m[1].trim(); return; }
  if ((m = line.match(/^(?:杯子|空之杯)[：:]?\s*(.+)/))) { target.goblet = m[1].trim(); return; }
  if ((m = line.match(/^(?:头|理之冠)[：:]?\s*(.+)/))) { target.circlet = m[1].trim(); return; }
  if ((m = line.match(/^(?:关键属性|面板|推荐属性|要求|属性)[：:]?\s*(.+)/))) { target.keyStats = m[1].trim(); return; }
}

/* ---------- 收集表单数据 ---------- */
function collectYsBuild(prefix) {
  const get = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };

  // 圣遗物：先看第一行
  const s1Name = get(prefix + '_set1Name');
  const s1CountEl = document.getElementById(prefix + '_set1Count');
  const s1Count = s1CountEl ? +s1CountEl.value : 4;
  const s2Name = get(prefix + '_set2Name');

  let sets = [];
  if (s1Name === '__scatter__' || s1Name === '散件') {
    sets = [{ name: '散件', count: 0 }];
  } else if (s1Name) {
    if (s1Count === 2 && s2Name && s2Name !== '__scatter__') {
      sets = [
        { name: s1Name, count: 2 },
        { name: s2Name, count: 2 }
      ];
    } else if (s1Count === 2) {
      sets = [{ name: s1Name, count: 2 }];
    } else {
      sets = [{ name: s1Name, count: 4 }];
    }
  }

  return {
    level: get(prefix + '_level'),
    talN: get(prefix + '_talN'),
    talS: get(prefix + '_talS'),
    talB: get(prefix + '_talB'),
    weapon: get(prefix + '_weapon'),
    sets,
    sands: get(prefix + '_sands'),
    goblet: get(prefix + '_goblet'),
    circlet: get(prefix + '_circlet'),
    keyStats: get(prefix + '_keyStats')
  };
}