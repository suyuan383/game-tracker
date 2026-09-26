let DB = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
function saveDB() { localStorage.setItem(STORE_KEY, JSON.stringify(DB)); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function getGame(id) {
  if (!DB[id]) DB[id] = {};
  const d = DB[id];
  if (!d.resources) d.resources = [];
  if (!d.events) d.events = [];
  if (!d.purchases) d.purchases = [];
  if (!d.gachaRecords) d.gachaRecords = [];
  if (!d.customPools) d.customPools = [];
  if (!d.resourceNames) d.resourceNames = [];

  if (id === 'huilv') {
    if (!d.resourceBank) {
      d.resourceBank = { init: { purple: 0, red: 0, paint: 0 }, records: [] };
    }
  } else if (id === 'bengtie') {
    if (!d.resourceBank) {
      d.resourceBank = {
        init: { jade: 0, normalTicket: 0, specialTicket: 0, starlight: 0 },
        records: []
      };
    }
    if (!d.gachaBanks) {
      d.gachaBanks = {
        permanent: { pity: 90, max: 90 },
        character: { pity: 90, max: 90, guaranteed: false },
        lightcone: { pity: 80, max: 80, guaranteed: false }
      };
    }
  } else if (id === 'yuanshen') {
    if (!d.characters) d.characters = [];
    if (!d.resourceBank) {
      d.resourceBank = {
        init: { primogem: 0, fate: 0, intertwined: 0, crystal: 0 },
        records: []
      };
    }
    if (!d.gachaBanks) {
      d.gachaBanks = {
        permanent: { pity: 90, max: 90 },
        character: { pity: 90, max: 90, guaranteed: false },
        weapon:    { pity: 80, max: 80, guaranteed: false }
      };
    }
  } else if (id === 'shijie') {
    if (!d.resourceBank) {
      d.resourceBank = {
        init: { yellow: 0, purple: 0, shard: 0 },
        records: []
      };
    }
    if (!d.gachaPools) d.gachaPools = [];
    if (!d.gachaPools.length) {
      const p = {
        id: uid(), type: 'permanent', name: '常驻池',
        pityLeft: 70, maxPity: 70,
        history: []
      };
      d.gachaPools.push(p);
      d.gachaActiveId = p.id;
    }
    // 兼容旧数据
    d.gachaPools.forEach(p => {
      if (!p.history) p.history = [];
      if (p.type === undefined) {
        if (p.name === '常驻池') { p.type = 'permanent'; p.maxPity = 70; }
        else p.type = 'limited';
      }
      if (p.type === 'permanent') {
        p.maxPity = 70;
        if (p.pityLeft === undefined) p.pityLeft = 70;
      } else {
        if (p.maxPity === undefined) p.maxPity = 80;
        if (p.pityLeft === undefined) p.pityLeft = p.maxPity;
        if (p.totalPulls === undefined) p.totalPulls = 0;
        if (p.guaranteed === undefined) p.guaranteed = false;
        if (p.status === undefined) p.status = '首发';
      }
    });
    if (!d.gachaActiveId || !d.gachaPools.find(p => p.id === d.gachaActiveId)) {
      d.gachaActiveId = d.gachaPools[0].id;
    }
  } else if (id === 'weiding') {
    if (!d.resourceBank) {
      d.resourceBank = {
        init: { chip: 0, tear: 0 },
        records: []
      };
    }
    if (!d.gachaRecords) d.gachaRecords = [];
  } else if (id === 'huayishan') {
    if (!d.resourceBank) {
      d.resourceBank = {
        init: { goldLeaf: 0, token: 0, jadeMark: 0 },
        records: []
      };
    }
    if (!d.gachaRecords) d.gachaRecords = [];
  } else if (id === 'yemu') {
    if (!d.resourceBank) {
      d.resourceBank = {
        init: { goldBrick: 0, redBrick: 0, limitedKey: 0, normalKey: 0 },
        records: []
      };
    }
    if (!d.gachaBanks) {
      d.gachaBanks = {
        permanent: { pity: 70, max: 70 },
        character: { pity: 70, max: 70, guaranteed: false }
      };
    }
    if (!d.gachaRecords) d.gachaRecords = [];
  }
    if (!d.wishlist) d.wishlist = [];
  return d;
}

// 星铁资源总数计算
function calcBtResTotals(d) {
  const bank = d.resourceBank || { init: {}, records: [] };
  const totals = {};
  BENGTIE_RES_FIELDS.forEach(f => { totals[f.key] = +bank.init[f.key] || 0; });
  (bank.records || []).forEach(r => {
    BENGTIE_RES_FIELDS.forEach(f => { totals[f.key] += +r[f.key] || 0; });
  });
  return totals;
}
// 计算资源总数
function calcResourceTotals(d) {
  const bank = d.resourceBank || { init: { purple: 0, red: 0, paint: 0 }, records: [] };
  let purple = +bank.init.purple || 0;
  let red    = +bank.init.red    || 0;
  let paint  = +bank.init.paint  || 0;
  bank.records.forEach(r => {
    purple += (+r.purple || 0);
    red    += (+r.red    || 0);
    paint  += (+r.paint  || 0);
  });
  return { purple, red, paint };
}

function ensureHuilvDefaults() {
  const d = getGame(HUILV_ID);
  if (!d.inited) {
    if (!d.resources.length) {
      ['紫钻', '红钻','颜料'].forEach(n => d.resources.push({ id: uid(), name: n, value: '' }));
    }
    d.inited = true;
    saveDB();
  }
}
// 原神资源总数计算
function calcYsResTotals(d) {
  const bank = d.resourceBank || { init: {}, records: [] };
  const totals = {};
  YUANSHEN_RES_FIELDS.forEach(f => { totals[f.key] = +bank.init[f.key] || 0; });
  (bank.records || []).forEach(r => {
    YUANSHEN_RES_FIELDS.forEach(f => { totals[f.key] += +r[f.key] || 0; });
  });
  return totals;
}
// 世界之外资源总数
function calcSjResTotals(d) {
  const bank = d.resourceBank || { init: {}, records: [] };
  const totals = {};
  SHIJIE_RES_FIELDS.forEach(f => { totals[f.key] = +bank.init[f.key] || 0; });
  (bank.records || []).forEach(r => {
    SHIJIE_RES_FIELDS.forEach(f => { totals[f.key] += +r[f.key] || 0; });
  });
  return totals;
}
// 未定资源总数
function calcWdResTotals(d) {
  const bank = d.resourceBank || { init: {}, records: [] };
  const totals = {};
  WEIDING_RES_FIELDS.forEach(f => { totals[f.key] = +bank.init[f.key] || 0; });
  (bank.records || []).forEach(r => {
    WEIDING_RES_FIELDS.forEach(f => { totals[f.key] += +r[f.key] || 0; });
  });
  return totals;
}
// 花亦山资源总数
function calcHyResTotals(d) {
  const bank = d.resourceBank || { init: {}, records: [] };
  const totals = {};
  HUAYISHAN_RES_FIELDS.forEach(f => { totals[f.key] = +bank.init[f.key] || 0; });
  (bank.records || []).forEach(r => {
    HUAYISHAN_RES_FIELDS.forEach(f => { totals[f.key] += +r[f.key] || 0; });
  });
  return totals;
}
// 夜幕之下资源总数
function calcYmResTotals(d) {
  const bank = d.resourceBank || { init: {}, records: [] };
  const totals = {};
  YEMU_RES_FIELDS.forEach(f => { totals[f.key] = +bank.init[f.key] || 0; });
  (bank.records || []).forEach(r => {
    YEMU_RES_FIELDS.forEach(f => { totals[f.key] += +r[f.key] || 0; });
  });
  return totals;
}