const GAMES = [
  { id: 'huilv',      name: '时空中的绘旅人', icon: '🎨' },
  { id: 'shijie',     name: '世界之外',       icon: '🌍' },
  { id: 'weiding',    name: '未定事件簿',     icon: '🔍' },
  { id: 'bengtie',    name: '崩坏·星穹铁道',  icon: '🚄' },
  { id: 'huayishan',  name: '花亦山心之月',   icon: '🌸' },
  { id: 'daihaoyuan', name: '代号鸢',         icon: '🪁' },
  { id: 'yuanshen',   name: '原神',           icon: '⚡' },
  { id: 'yemu',       name: '夜幕之下',       icon: '🌙' },
];

const STORE_KEY = 'game_tracker_v1';
const HUILV_ID  = 'huilv';


// 全局状态
let currentTab = 'res';
let lastId = null;
let gachaGroupBy = 'time';   // time | pool
let gachaFilterPool = '';    // '' 表示全部
let payGroupBy = 'all';      // all | month | year
// 在 config.js 全局状态区加上
let resShowForm = '';       // '' | 'income' | 'expense' | 'init'
let resFilterType = 'all';  // all | income | expense
// 复刻状态已简化为：首发、复刻
const POOL_STATUSES = ['首发', '复刻'];

// 预设卡池名（从图片整理）
const PRESET_POOL_NAMES = [
  '绘梦平安京','珠宝之心','人间画外','庄园诡戏','世界与你',
  '遗落的血脉','诸界归一','漫长的箴言','罪印残响','若梦熄',
  '前路迢迢','十日谈','潮汐瓦解','黑暗的远山','尘封的果壳',
  '代号：归零','前行者恒常前行','千千宇宙',
  '录异记','漆灯夜照','繁花之吻','千秋渡','昨日晴空',
  '杯间漫游','风蚀之歌','路罗','艾司叶',
  '重返叶塞','特殊邂逅','Heartbeat Time','怪谈主题',
  '罗夏','路辰','司岚',
  '叶瑄生日','艾因生日','罗夏生日','路辰生日','司岚生日',
  '无罪之罪',
  '觉醒之章','神陨纪年','雾隐都市混池','神弃艾罗','神弃路司','神弃叶瑄',
  '无罪之罪「自选」',
  '重返叶塞「复刻」','特殊邂逅「复刻」','雾都主线单人池「复刻」','灵界「复刻」','诡念「复刻」',
  '万圣奇幻夜','圣塞西尔公主节','四季猎场','书中童话I','乐园重建',
  '私暑假日','命运选择游戏','湛蓝海岛','今夕长相守','战争都市',
  '暗夜终章','迷局','冬雪夜未眠','命运回廊','醉梦浮汤',
  '书中童话II','与卿书','瑰梦奇境上','瑰梦奇境下','魔法学院上','魔法学院下'
];
// 各游戏的预设资源名（只是输入时的建议，实际以你添加的为准）
const PRESET_RESOURCES = {
  huilv:      ['钻石', '颜料', '红钻', '觉悟'],
  shijie:     ['黄钻', '紫钻'],
  weiding:    ['常驻泪', '晶片'],
  bengtie:    ['星琼',  '星辉', '星轨通票'],
  huayishan:  ['金叶子', '花诏令', '金纹'],
  daihaoyuan: ['普通符传', '天机符传', '白金币'],
  yuanshen:   ['原石', '纠缠之缘', '星辉'],
  yemu:       ['金砖', '红钻'],
};
const INCOME_SOURCES = ['每日任务', '月卡', '签到', '活动', '邮件', '充值', '年卡', '紫钻兑换', '每周紫钻兑换', '其他'];

// 资源消耗类型
const EXPENSE_TYPES = ['兑换颜料', '抽卡消耗', '红钻兑换紫钻', '红钻兑换礼包', '其他消耗'];
/* ===================== 崩坏·星穹铁道专属配置 ===================== */
const BENGTIE_ID = 'bengtie';

// 星铁资源字段
const BENGTIE_RES_FIELDS = [
  { key: 'jade',          name: '星琼',  color: '#7048e8' },
  { key: 'normalTicket',  name: '普票',  color: '#3b5bdb' },
  { key: 'specialTicket', name: '专票',  color: '#d6336c' },
  { key: 'starlight',     name: '星辉',  color: '#f59f00' }
];

const BENGTIE_INCOME_SOURCES = ['每日任务', '邮件', '月卡', '前瞻', '活动', '模拟宇宙', '充值', '混沌', '其他', '成就', '地图探索', '星穹兑换', '星辉兑换', '每月5抽', '模拟宇宙兑换', '角色突破'];

// 星铁消耗类型
const BENGTIE_EXPENSE_TYPES = ['抽卡消耗', '星琼兑专票', '星琼兑普票', '星辉兑换', '其他消耗'];

// 星铁卡池配置（保底上限按官方设定）
const BENGTIE_POOLS = [
  { key: 'permanent', name: '常驻池',  max: 90, hasGuaranteed: false },
  { key: 'character', name: '角色池',  max: 90, hasGuaranteed: true  },
  { key: 'lightcone', name: '光锥池',  max: 80, hasGuaranteed: true  }
];

// 星铁的两个全局状态变量
let btResShowForm = '';       // '' | 'income' | 'expense' | 'init'
let btResFilterType = 'all';  // all | income | expense
/* ===================== 原神专属配置 ===================== */
const YUANSHEN_ID = 'yuanshen';

const YUANSHEN_RES_FIELDS = [
  { key: 'primogem',    name: '原石',     color: '#7048e8' },
  { key: 'fate',        name: '相遇之缘', color: '#3b5bdb' },
  { key: 'intertwined', name: '纠缠之缘', color: '#d6336c' },
  { key: 'crystal',     name: '创世结晶', color: '#f59f00' }
];

const YUANSHEN_INCOME_SOURCES = ['每日任务', '月卡', '邮件', '前瞻', '地图探索', '充值', '其他', '深渊', '星辉兑换', '每月5抽', '原石兑换', '活动', '角色突破'];

const YUANSHEN_EXPENSE_TYPES = ['抽卡消耗', '原石兑纠缠之缘', '原石兑相遇之缘', '创世结晶兑换', '其他消耗'];

const YUANSHEN_POOLS = [
  { key: 'permanent', name: '常驻池', max: 90, hasGuaranteed: false },
  { key: 'character', name: '角色池', max: 90, hasGuaranteed: true  },
  { key: 'weapon',    name: '武器池', max: 80, hasGuaranteed: true  }
];

let ysResShowForm = '';
let ysResFilterType = 'all';
/* ===================== 世界之外专属配置 ===================== */
const SHIJIE_ID = 'shijie';

const SHIJIE_RES_FIELDS = [
  { key: 'yellow',  name: '黄钻',        color: '#f59f00' },
  { key: 'purple',  name: '紫钻',        color: '#7048e8' },
  { key: 'shard',   name: '常驻空间碎片', color: '#3b5bdb' }
];

const SHIJIE_INCOME_SOURCES = ['每日任务', '年卡', '邮件', '活动', '崩坍世界', '男主礼物', '其他', '月卡', '大月卡', '紫钻兑换', '充值', '每周任务'];
const SHIJIE_EXPENSE_TYPES = ['抽卡消耗', '其他消耗'];
const SHIJIE_POOL_STATUSES = ['首发', '复刻'];

let sjResShowForm = '';
let sjResFilterType = 'all';
let sjActivePoolId = null;
let sjShowHitForm = false;
let sjShowRewardForm = false;
let sjViewMode = 'history';  // history | overview
/* ===================== 未定事件簿专属配置 ===================== */
const WEIDING_ID = 'weiding';

const WEIDING_RES_FIELDS = [
  { key: 'chip', name: '晶片',   color: '#7048e8' },
  { key: 'tear', name: '常驻泪', color: '#3b5bdb' }
];

const WEIDING_INCOME_SOURCES = ['每日任务', '邮件', '月卡', '充值', '活动', '周任务', '试炼神殿', '地图任务', '签到', '其他', '绮思'];
const WEIDING_EXPENSE_TYPES = ['抽卡消耗', '其他消耗'];

let wdResShowForm = '';
let wdResFilterType = 'all';
let wdShowHitForm = false;
let wdHitEditingId = null;
/* ===================== 花亦山心之月专属配置 ===================== */
const HUAYISHAN_ID = 'huayishan';

const HUAYISHAN_RES_FIELDS = [
  { key: 'goldLeaf', name: '金叶子',   color: '#f59f00' },
  { key: 'token',    name: '花诏令',   color: '#d6336c' },
  { key: 'jadeMark', name: '金玉灵纹', color: '#3b5bdb' }
];

const HUAYISHAN_INCOME_SOURCES = ['每日任务', '月卡', '大月卡', '充值', '活动', '其他', '签到', '周任务', '邮件', '会武', '好感', '成就', '每周茶点', '商店兑换', '金叶子兑换', '每月5抽'];
const HUAYISHAN_EXPENSE_TYPES = ['抽卡消耗', '其他消耗'];

// 两个卡池
const HUAYISHAN_POOLS = [
  { key: 'limited',  name: '限定池' },
  { key: 'pool100',  name: '100抽池' }
];

let hyResShowForm = '';
let hyResFilterType = 'all';
let hyShowHitForm = false;
let hyHitEditingId = null;
let hyFilterPool = '';       // '' | 'limited' | 'pool100' | 'all'
/* ===================== 夜幕之下专属配置 ===================== */
const YEMU_ID = 'yemu';

const YEMU_RES_FIELDS = [
  { key: 'goldBrick',  name: '金砖',     color: '#f59f00' },
  { key: 'redBrick',   name: '红砖',     color: '#e03131' },
  { key: 'limitedKey', name: '限定钥匙', color: '#d6336c' },
  { key: 'normalKey',  name: '普通钥匙', color: '#3b5bdb' }
];

const YEMU_INCOME_SOURCES = ['每日任务', '月卡', '周任务', '邮件', '活动', '好感', '角色培养', '充值', '其他', '无尽之阶', '每月5抽', '商店兑换'];
const YEMU_EXPENSE_TYPES = ['抽卡消耗', '金砖兑钥匙', '其他消耗'];

const YEMU_POOLS = [
  { key: 'permanent', name: '常驻池',    max: 70, hasGuaranteed: false },
  { key: 'character', name: '限定角色池', max: 70, hasGuaranteed: true  }
];

let ymResShowForm = '';
let ymResFilterType = 'all';
/* ===================== 代号鸢专属配置 ===================== */
const DAIHAOYUAN_ID = 'daihaoyuan';
// 主页氪金筛选
let homePayRange = 'all';  // all | year | month
/* ===================== 原神角色练度 ===================== */
let ysShowCharForm = false;
let ysEditingCharId = null;
let ysShowImportForm = false;
let ysImportText = '';
/* ===================== 侧边栏显示管理 ===================== */
const HIDDEN_KEY = 'game_tracker_hidden';
let HIDDEN_GAMES = JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]');

function saveHidden() {
  localStorage.setItem(HIDDEN_KEY, JSON.stringify(HIDDEN_GAMES));
}
function isGameHidden(id) {
  return HIDDEN_GAMES.includes(id);
}
function toggleGameHidden(id) {
  if (HIDDEN_GAMES.includes(id)) {
    HIDDEN_GAMES = HIDDEN_GAMES.filter(x => x !== id);
  } else {
    HIDDEN_GAMES.push(id);
  }
  saveHidden();
}
let evFilterStatus = 'ongoing';  // all | ongoing | upcoming | ended
const HL_RES_FIELDS = [
  { key: 'purple', name: '紫钻', color: '#7048e8' },
  { key: 'red',    name: '红钻', color: '#e8590c' },
  { key: 'paint',  name: '颜料', color: '#3b5bdb' }
];
let huilvResShowForm = '';
let listDateFilter = 'today';  // 'today' | 'all' | 'YYYY-MM-DD'
let ysFilterLevel  = 'all';  // all | empty | lt80 | 80to89 | 90
let ysFilterTalent = 'all';  // all | ok | bad
let ysFilterStatus = 'all';  // all | done | pending
/* ===================== 心愿清单 ===================== */
let wishShowForm = false;
let wishEditingId = null;

const WISH_RULES = {
  huilv: {
    label: '颜料 + 紫钻÷150',
    fields: [
      { key: 'paint' },
      { key: 'purple', divisor: 150 }
    ]
  },
  bengtie: {
    label: '专票 + 星琼÷160',
    fields: [
      { key: 'specialTicket' },
      { key: 'jade', divisor: 160 }
    ]
  },
  yuanshen: {
    label: '纠缠之缘 + 原石÷160',
    fields: [
      { key: 'intertwined' },
      { key: 'primogem', divisor: 160 }
    ]
  },
  shijie: {
    label: '黄钻÷300',
    fields: [
      { key: 'yellow', divisor: 300 }
    ]
  },
  weiding: {
    label: '晶片÷180',
    fields: [
      { key: 'chip', divisor: 180 }
    ]
  },
  huayishan: {
    label: '花诏令 + 金叶子÷180',
    fields: [
      { key: 'token' },
      { key: 'goldLeaf', divisor: 180 }
    ]
  },
  yemu: {
    label: '限定钥匙 + 金砖÷180',
    fields: [
      { key: 'limitedKey' },
      { key: 'goldBrick', divisor: 180 }
    ]
  },
};
/* ===================== 装备副本管理 ===================== */
let showEquipManage = false;
let charFilterSet = 'all';

function getEquipDungeons(gameId) {
  if (!DB._equip) DB._equip = {};
  if (!DB._equip[gameId]) DB._equip[gameId] = [];
  return DB._equip[gameId];
}

function getAllSetNames(gameId) {
  const names = new Set();
  getEquipDungeons(gameId).forEach(d => {
    (d.sets || []).forEach(s => { if (s && s.trim()) names.add(s.trim()); });
  });
  return [...names];
}

/* 旧字符串 → 数组 */
function parseSetString(s) {
  if (!s) return [];
  if (Array.isArray(s)) return s;
  const parts = String(s).split(/[+＋\s]+/).filter(Boolean);
  return parts.map(p => {
    const m = p.match(/^(.+?)(\d+)$/);
    if (m) return { name: m[1].trim(), count: +m[2] };
    return { name: p.trim(), count: 0 };
  });
}

function formatSets(arr) {
  if (!arr || !arr.length) return '';
  return arr.map(x => `${x.name}${x.count ? '×' + x.count : ''}`).join(' + ');
}
/* ===================== 收入默认值（选来源自动填） ===================== */
const INCOME_DEFAULTS = {
  huilv: {
    '每日任务': { purple: 76 },
    '月卡':     { purple: 50 }
  },
  bt: {
    '每日任务': { jade: 60 },
    '月卡':     { jade: 90 },
    '前瞻':     { jade: 300 },
    '模拟宇宙': { jade: 225 }
  },
  ys: {
    '每日任务': { primogem: 60 },
    '月卡':     { primogem: 90 }
  },
  sj: {
    '每日任务': { yellow: 50 },
    '年卡':     { yellow: 100 },
    '月卡':     { yellow: 150 },
    '大月卡':   { yellow: 340 }
  },
  wd: {
    '每日任务': { chip: 30 },
    '月卡':     { chip: 80 },
    '试炼神殿': { chip: 400 },
    '地图任务': { chip: 40 }
  },
  hy: {
    '每日任务': { goldLeaf: 40 },
    '月卡':     { goldLeaf: 100 },
    '大月卡':   { goldLeaf: 150 },
    '每周茶点': { goldLeaf: 50 }
  },
  ym: {
    '每日任务': { goldBrick: 90 },
    '月卡':     { goldBrick: 90 }
  }
};