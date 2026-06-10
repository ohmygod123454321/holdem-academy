/* global React */
// ============================================================
// 德州撲克教學資料 — 牌力、位置、起手牌、術語、練習場景
// ============================================================

// ---- 牌力等級 ----
const HAND_RANKINGS = [
  { rank: 1,  name: "皇家同花順",  en: "Royal Flush",      example: ["As","Ks","Qs","Js","Ts"], desc: "同花色的 A K Q J 10。撲克之王，出現機率約 1 / 649,740。" },
  { rank: 2,  name: "同花順",      en: "Straight Flush",   example: ["9h","8h","7h","6h","5h"], desc: "同花色的五張連續牌。機率約 0.00139%。" },
  { rank: 3,  name: "四條",        en: "Four of a Kind",   example: ["Qs","Qh","Qd","Qc","7s"], desc: "四張相同點數加一張閒牌。機率約 0.024%。" },
  { rank: 4,  name: "葫蘆",        en: "Full House",       example: ["Js","Jh","Jd","8c","8s"], desc: "三條 + 一對。三條的點數先比，再比對子。機率約 0.144%。" },
  { rank: 5,  name: "同花",        en: "Flush",            example: ["Ad","Td","8d","5d","2d"], desc: "同花色五張，不必連續。機率約 0.197%。" },
  { rank: 6,  name: "順子",        en: "Straight",         example: ["9d","8c","7h","6s","5d"], desc: "五張連續點數，可同花可雜花。A 可作 1 用（A2345 為最小順子，俗稱 wheel）。" },
  { rank: 7,  name: "三條",        en: "Three of a Kind",  example: ["7s","7h","7d","Kc","2s"], desc: "三張同點數。Set（口袋對碰中三條）比 Trips（桌面成三條）價值更高。" },
  { rank: 8,  name: "兩對",        en: "Two Pair",         example: ["Ks","Kh","6d","6c","Ts"], desc: "兩組對子加一張 kicker。比大對 → 小對 → kicker。" },
  { rank: 9,  name: "一對",        en: "One Pair",         example: ["Js","Jh","9d","6c","2s"], desc: "兩張同點數 + 三張 kicker。低池常見牌力，過河容易被擊敗。" },
  { rank: 10, name: "高牌",        en: "High Card",        example: ["Ad","Jc","8h","5s","2d"], desc: "什麼都沒成。靠 kicker 比大小。" },
];

// ---- 位置（9-handed full ring）----
const POSITIONS_9 = [
  { id: "BTN", name: "Button",       cn: "莊家",         seat: 0,  group: "LP", desc: "最強位置：所有翻牌後街道最後行動。能打最寬的開池範圍與偷盲，VPIP 最高。" },
  { id: "SB",  name: "Small Blind",  cn: "小盲",         seat: 1,  group: "BL", desc: "翻牌前倒數第二行動，翻牌後率先行動（heads-up 例外）。已投入半個盲注，OOP 困難位。" },
  { id: "BB",  name: "Big Blind",    cn: "大盲",         seat: 2,  group: "BL", desc: "已投入一個盲注享有底池賠率，可超寬防守；翻牌後 OOP。" },
  { id: "UTG", name: "Under the Gun",cn: "槍口位",       seat: 3,  group: "EP", desc: "翻牌前第一個行動。後面有 8 人未發言，需打最緊範圍，常見約 10-12% 開池。" },
  { id: "UTG+1", name: "UTG+1",      cn: "槍口下一位",   seat: 4,  group: "EP", desc: "與 UTG 接近，略寬一點，仍屬早期位。" },
  { id: "MP",  name: "Middle",       cn: "中位",         seat: 5,  group: "MP", desc: "中間位置，可比 UTG 寬約 3-4%。" },
  { id: "LJ",  name: "Lojack",       cn: "劫位",         seat: 6,  group: "MP", desc: "進入後期區。可加入 KQo、A9s 等次強牌。" },
  { id: "HJ",  name: "Hijack",       cn: "劫莊位",       seat: 7,  group: "LP", desc: "BTN 之前兩位，常見偷盲位置之一。" },
  { id: "CO",  name: "Cutoff",       cn: "搶莊位",       seat: 8,  group: "LP", desc: "BTN 前一位，僅次於 BTN 的強位置。範圍可達 25-30%。" },
];

// 翻牌前 RFI（first-in raise）建議範圍 % — 9-max GTO 近似
const RFI_RANGES = {
  UTG:   { pct: 11, hands: ["77+","ATs+","KTs+","QTs+","JTs","T9s","98s","87s","AJo+","KQo"] },
  "UTG+1": { pct: 13, hands: ["66+","A9s+","KTs+","QTs+","J9s+","T9s","98s","87s","76s","AJo+","KQo"] },
  MP:    { pct: 15, hands: ["55+","A8s+","K9s+","Q9s+","J9s+","T9s","98s","87s","76s","65s","ATo+","KJo+","QJo"] },
  LJ:    { pct: 18, hands: ["44+","A7s+","K9s+","Q9s+","J8s+","T8s+","97s+","86s+","75s+","65s","ATo+","KTo+","QTo+","JTo"] },
  HJ:    { pct: 22, hands: ["22+","A2s+","K8s+","Q8s+","J8s+","T8s+","97s+","86s+","75s+","65s","54s","A9o+","KTo+","QTo+","JTo"] },
  CO:    { pct: 28, hands: ["22+","A2s+","K6s+","Q7s+","J7s+","T7s+","96s+","85s+","74s+","64s+","53s+","A8o+","K9o+","QTo+","JTo","T9o"] },
  BTN:   { pct: 45, hands: ["22+","A2s+","K2s+","Q4s+","J6s+","T6s+","95s+","85s+","74s+","63s+","53s+","43s","A2o+","K7o+","Q9o+","J9o+","T8o+","98o","87o"] },
  SB:    { pct: 35, hands: ["22+","A2s+","K3s+","Q5s+","J7s+","T7s+","96s+","85s+","75s+","64s+","53s+","A4o+","K9o+","QTo+","JTo"] },
};

// ---- 13×13 起手牌矩陣 (combos by hand) ----
// action: F (fold), L (limp/call), R (raise), T (3bet/threshold)
function buildPreflopMatrix(rfiHands) {
  // hands like "77+", "ATs+", "KQo", "65s", "AA"
  const include = new Set();
  for (const tok of rfiHands) include.add(tok);

  const inRange = (handCode) => {
    // handCode like "AKs", "AKo", "TT"
    if (handCode.length === 2) {
      // pair like "TT"
      const r = handCode[0];
      const idx = RANKS.indexOf(r);
      for (const tok of rfiHands) {
        if (tok.length === 3 && tok[2] === "+" && tok[0] === tok[1]) {
          const minIdx = RANKS.indexOf(tok[0]);
          if (idx >= minIdx) return true;
        }
        if (tok === handCode) return true;
      }
      return false;
    }
    const [a,b,sf] = [handCode[0], handCode[1], handCode[2]];
    for (const tok of rfiHands) {
      if (tok === handCode) return true;
      if (tok.length === 4 && tok[3] === "+" && tok[2] === sf && tok[0] === a) {
        const tokIdx = RANKS.indexOf(tok[1]);
        const myIdx = RANKS.indexOf(b);
        if (myIdx >= tokIdx && myIdx < RANKS.indexOf(a)) return true;
      }
    }
    return false;
  };

  const matrix = [];
  for (let i = RANKS.length - 1; i >= 0; i--) {
    const row = [];
    for (let j = RANKS.length - 1; j >= 0; j--) {
      const r1 = RANKS[i], r2 = RANKS[j];
      let code, type;
      if (i === j) { code = r1+r2; type = "pair"; }
      else if (i > j) { code = r1+r2+"s"; type = "suited"; }
      else { code = r2+r1+"o"; type = "offsuit"; }
      // i,j relative grid (top-left = AA)
      const action = inRange(code) ? "R" : "F";
      row.push({ code, type, action });
    }
    matrix.push(row);
  }
  return matrix;
}

// ---- 牌局練習場景 ----
// 每題包含：階段、位置、底池、籌碼、手牌、已發公共牌、行動、選項、勝率、GTO 頻率、最佳答案、解說
const SCENARIOS = [
  {
    id: 1,
    title: "翻牌前 — BTN 偷盲",
    stage: "Preflop",
    position: "BTN",
    blinds: "100/200, ante 25",
    effective: "100bb",
    pot: "425",
    facing: "前面全部 fold 到你",
    hero: ["Ah","8s"],
    board: [],
    options: [
      { id: "fold",   label: "Fold",   ev: -0,   gto: 0,   correct: false, equity: null },
      { id: "call",   label: "Limp 200", ev: -50, gto: 0,   correct: false, equity: 56 },
      { id: "raise",  label: "Raise 500 (2.5x)", ev: 80,  gto: 95, correct: true,  equity: 56, recommend: true },
    ],
    explain: "A8o 在 BTN 是明確的開池範圍。前面全 fold，你能對抗只剩兩位玩家（SB、BB），他們大多會棄牌；即使被跟，A 高也有約 56% 對隨機手牌的勝率。Limp 喪失主動權；正確玩法是 2.2-2.5x 開池。",
    tags: ["偷盲", "RFI", "BTN"],
  },
  {
    id: 2,
    title: "翻牌前 — UTG 開池你拿到 KQ",
    stage: "Preflop",
    position: "BB",
    blinds: "100/200, ante 25",
    effective: "100bb",
    pot: "925",
    facing: "UTG 開池 600，所有人棄牌到你",
    hero: ["Kh","Qd"],
    board: [],
    options: [
      { id: "fold",   label: "Fold", ev: 0, gto: 25, correct: false, equity: 38 },
      { id: "call",   label: "Call 400", ev: 5, gto: 60, correct: true, equity: 38, recommend: true },
      { id: "raise",  label: "3-bet 1800", ev: -15, gto: 15, correct: false, equity: 38 },
    ],
    explain: "UTG 範圍很緊（77+, AJ+, KQ）。KQo 對其範圍只有約 38% 勝率，3-bet 會被 AA-QQ、AK 重整。但底池賠率 400:925 約 30%，加上位置不利但有現實 equity，主流為 call。Fold 太緊，3-bet 太鬆。",
    tags: ["防守", "BB defense", "面對 RFI"],
  },
  {
    id: 3,
    title: "翻牌 — 頂對遇到濕牌面",
    stage: "Flop",
    position: "BTN",
    blinds: "100/200",
    effective: "98bb",
    pot: "1300",
    facing: "你在 BTN 開池，BB call。BB 過牌給你",
    hero: ["As","Td"],
    board: ["Th","9h","6c"],
    options: [
      { id: "check",  label: "Check 控池", ev: 12, gto: 30, correct: false, equity: 64 },
      { id: "bet33",  label: "下注 1/3 池 (430)", ev: 28, gto: 55, correct: true, equity: 64, recommend: true },
      { id: "bet75",  label: "下注 3/4 池 (975)", ev: 18, gto: 15, correct: false, equity: 64 },
    ],
    explain: "ATs 在 T96 兩同花面是頂對頂踢。對手範圍中很多 9x、聽牌（同花/順）會跟注。33% 池是 GTO 主流：建立底池、保護牌力、讓對手帶著弱牌跟注。下大注會把弱對手趕走，反而被強牌跟。",
    tags: ["翻牌策略", "C-bet", "Top pair"],
  },
  {
    id: 4,
    title: "轉牌 — 同花聽牌的賠率",
    stage: "Turn",
    position: "BB",
    blinds: "100/200",
    effective: "70bb",
    pot: "2400",
    facing: "對手轉牌下注 1200（半池）",
    hero: ["Ah","6h"],
    board: ["Kh","9h","2s","Tc"],
    options: [
      { id: "fold",   label: "Fold", ev: 0, gto: 5, correct: false, equity: 19.5 },
      { id: "call",   label: "Call 1200", ev: 10, gto: 70, correct: true, equity: 19.5, recommend: true },
      { id: "raise",  label: "Semi-bluff raise 3600", ev: 5, gto: 25, correct: false, equity: 19.5 },
    ],
    explain: "同花聽牌 9 outs，從轉到河約 19.5% 勝。底池賠率：1200 / (2400+1200+1200) = 25%；不夠直接 call，但你還有 nut flush blocker + 隱含賠率（成花後對手再投錢）。半詐唬加注也 +EV，但頻率較低。",
    tags: ["賠率", "聽牌", "Implied odds"],
  },
  {
    id: 5,
    title: "河牌 — 面對 over-bet 的取捨",
    stage: "River",
    position: "CO",
    blinds: "100/200",
    effective: "55bb",
    pot: "5500",
    facing: "對手在河牌下注 8000（145% 池）",
    hero: ["Js","Jh"],
    board: ["Td","8s","4c","2h","Qc"],
    options: [
      { id: "fold",   label: "Fold", ev: 0, gto: 75, correct: true, equity: 22, recommend: true },
      { id: "call",   label: "Call 8000", ev: -2200, gto: 25, correct: false, equity: 22 },
    ],
    explain: "Q 落在河牌使得 KQ、AQ、QT、QJ 等順位完成，加上對手 145% over-bet 通常代表兩極化範圍（堅果或詐唬）。你需要 8000 / (5500+8000+8000) = 37% 勝率才能 call。JJ 對其範圍不到 22%。Hero call 偶爾正確，但 GTO 高頻棄牌。",
    tags: ["河牌決策", "Bluff catcher", "MDF"],
  },
  {
    id: 6,
    title: "錦標賽 — short stack shove 範圍",
    stage: "Preflop",
    position: "HJ",
    blinds: "500/1000, ante 100",
    effective: "12bb",
    pot: "2400",
    facing: "前面全部 fold",
    hero: ["Ah","Tc"],
    board: [],
    options: [
      { id: "fold",   label: "Fold", ev: -100, gto: 0, correct: false, equity: null },
      { id: "minraise", label: "Min-raise 2000", ev: 200, gto: 5, correct: false, equity: null },
      { id: "shove",  label: "全下 12bb", ev: 850, gto: 95, correct: true, equity: null, recommend: true },
    ],
    explain: "12bb 以下 HJ 拿到 ATo，標準 push/fold 圖表（Nash）建議 jam。Min-raise 給你留下 10bb 但不上不下，被 3-bet 後被迫棄牌或勉強 call。直接 shove 取得棄牌權益 + 偶爾被叫時還有 fold equity。",
    tags: ["MTT", "短碼", "Push/Fold"],
  },
  {
    id: 7,
    title: "ICM 壓力 — bubble 階段",
    stage: "Preflop",
    position: "BB",
    blinds: "1000/2000, ante 250",
    effective: "20bb",
    pot: "5250",
    facing: "Chip leader (BTN, 80bb) 全下你 20bb，泡沫剩 4 人領 3 名",
    hero: ["Ah","Js"],
    board: [],
    options: [
      { id: "fold",   label: "Fold (保獎金)", ev: 0, gto: 78, correct: true, equity: null, recommend: true },
      { id: "call",   label: "Call 全下", ev: -1500, gto: 22, correct: false, equity: null },
    ],
    explain: "Chip-EV 上 AJo call 一個 80bb 的全下是 +EV，但 ICM 中你輸掉等於泡沫淘汰，獎金期望大跌。對 chip leader 的寬範圍 (40%)，AJo 約 56% 勝率仍不夠補償淘汰風險。靠 ICM 保留生命，等 short stack 先去送錢。",
    tags: ["ICM", "MTT", "Bubble"],
  },
  {
    id: 8,
    title: "翻牌 — 暗三條的下注尺度",
    stage: "Flop",
    position: "MP",
    blinds: "100/200",
    effective: "100bb",
    pot: "1700",
    facing: "你開池 600，BB call。BB 過牌",
    hero: ["7s","7h"],
    board: ["7d","Kc","2s"],
    options: [
      { id: "check",  label: "Check (slow play)", ev: 95, gto: 65, correct: true, equity: 92, recommend: true },
      { id: "bet33",  label: "下注 1/3 池 (560)", ev: 60, gto: 30, correct: false, equity: 92 },
      { id: "bet75",  label: "下注 3/4 池 (1275)", ev: 30, gto: 5, correct: false, equity: 92 },
    ],
    explain: "K72 乾燥牌面，BB 範圍很多無對牌；下注通常只把空氣趕跑。Set 不怕被翻，控池讓對手詐唬轉河，或在轉牌補強到第二好牌時付錢。乾燥面 + 深籌碼 + 強牌 = check 的好時機。",
    tags: ["Slow play", "底池控制"],
  },
];

// ---- 術語表 ----
const GLOSSARY = [
  { term: "VPIP", cn: "主動投錢比率", desc: "Voluntarily Put $ In Pot — 玩家主動投入底池的手牌比例（不含盲注強制）。鬆型玩家 30%+，緊型玩家 15-20%。" },
  { term: "PFR",  cn: "翻牌前加注率", desc: "Preflop Raise — 翻牌前主動加注的比例。VPIP 與 PFR 越接近，玩家越積極。" },
  { term: "RFI",  cn: "首加注", desc: "Raise First In — 在前面所有玩家都棄牌後率先加注的範圍。" },
  { term: "3-bet", cn: "再加注", desc: "面對開池後的再次加注。價值 3-bet 用強牌，詐唬 3-bet 用阻斷牌（如 A5s）。" },
  { term: "4-bet", cn: "四次加注", desc: "面對 3-bet 的再加注。範圍兩極化：AA/KK/AK 為主 + 偶爾 A5s 詐唬。" },
  { term: "C-bet", cn: "持續下注", desc: "Continuation bet — 翻牌前加注者在翻牌後繼續下注。標準頻率 50-70%。" },
  { term: "Pot Odds", cn: "底池賠率", desc: "需要付的籌碼 ÷ (跟注後的總底池)。低於勝率即 +EV call。" },
  { term: "Outs", cn: "補牌", desc: "能改善你成最佳牌的剩餘牌張數。例如同花聽牌 = 9 outs。" },
  { term: "Equity", cn: "勝率 / 期望值權益", desc: "你目前手牌對抗對手範圍的勝率百分比。" },
  { term: "EV", cn: "期望值", desc: "Expected Value — 一個決策的長期平均盈虧。EV = Σ(機率 × 結果)。" },
  { term: "SPR", cn: "底池籌碼比", desc: "Stack-to-Pot Ratio — 翻牌時的有效籌碼 ÷ 底池。SPR<3 commit、3-6 中等、>6 深堆。" },
  { term: "ICM", cn: "獨立籌碼模型", desc: "Independent Chip Model — 把錦標賽籌碼換算成獎金期望，影響 bubble、final table 決策。" },
  { term: "GTO", cn: "賽局理論最佳", desc: "Game Theory Optimal — 不可被剝削的均衡策略。實戰中用作基準，再根據對手偏離調整。" },
  { term: "Exploitative", cn: "剝削式打法", desc: "根據對手具體弱點調整策略，偏離 GTO 換取更多 EV。" },
  { term: "Nut", cn: "堅果", desc: "Nuts — 當前最大牌。Nut flush draw = 同花最大聽牌。" },
  { term: "Blocker", cn: "阻斷牌", desc: "你手上的牌使對手不易組合特定強牌。例如手持 Ah 阻斷對手 nut flush。" },
  { term: "Polarized", cn: "兩極化範圍", desc: "下注範圍只有極強或詐唬，沒有中間牌力。常見於 over-bet。" },
  { term: "Merged", cn: "合併範圍", desc: "下注範圍以中等價值牌為主，較少詐唬。多用於小尺度。" },
  { term: "Limp", cn: "跛入", desc: "翻牌前只 call 大盲注金額不加注。多數情況不建議。" },
  { term: "Squeeze", cn: "擠壓", desc: "在已有開池 + 跟注者後做的 3-bet。利用 fold equity 大。" },
  { term: "MDF", cn: "最低防守頻率", desc: "Minimum Defense Frequency — 為了不被對手任意詐唬剝削，需防守的最低比例 = 1 − 下注/(下注+底池)。" },
  { term: "Wheel", cn: "輪", desc: "A-2-3-4-5 順子，最小的順子。" },
];

// ---- 程式化生成 100+ 練習場景 ----
function genScenarios() {
  const out = [];
  let id = 100;

  // helper builders
  function table(seats, hero, stacks, btnPos) {
    const POS_BY_N = {
      2: ["SB/BTN","BB"],
      3: ["SB","BB","BTN"],
      4: ["SB","BB","CO","BTN"],
      5: ["SB","BB","UTG","CO","BTN"],
      6: ["SB","BB","UTG","HJ","CO","BTN"],
      7: ["SB","BB","UTG","MP","HJ","CO","BTN"],
      8: ["SB","BB","UTG","UTG+1","MP","HJ","CO","BTN"],
      9: ["SB","BB","UTG","UTG+1","MP","LJ","HJ","CO","BTN"],
    };
    const order = POS_BY_N[seats] || POS_BY_N[9].slice(0, seats);
    const NAMES = ["你","Mira","Doyle","Phil","Vivian","Kai","Ren","Ada","Otto"];
    return order.map((p, i) => ({
      pos: p,
      name: i === 0 ? "—" : NAMES[i],
      stack: stacks[i] || stacks[stacks.length-1],
      isHero: p === hero,
    }));
  }
  function pad(s) { return s.length < 2 ? s + "o" : s; }

  // ===== A. 6-max Cash · Preflop RFI (各位置 × 邊緣手牌) =====
  const RFI_TESTS = [
    { pos:"UTG", hand:["Ks","Js"], best:"raise", explain:"6-max UTG 範圍約 16%，KJs 在邊緣但仍 +EV 開池 2.5x。KJo 則建議棄。" },
    { pos:"UTG", hand:["Th","9h"], best:"fold",  explain:"T9s 在 UTG 與緊家位置太邊緣，後面 5 位玩家輪過你會被 3-bet。後位才開。" },
    { pos:"HJ",  hand:["As","9s"], best:"raise", explain:"A9s 在 HJ 是標準開池。後面只剩 4 位玩家，A 高 + 同花後備強。" },
    { pos:"HJ",  hand:["Qd","Tc"], best:"fold",  explain:"QTo 在 HJ 是邊緣，後位 BTN/CO 容易壓你。同花則開。" },
    { pos:"CO",  hand:["7s","6s"], best:"raise", explain:"CO 範圍約 27%，76s 為標準小同花連子，能命中強牌面。" },
    { pos:"CO",  hand:["K2o"[0]+"d","K2o"[1]+"s"], best:"fold", explain:"K2o 在 CO 仍偏弱，被 BTN 3-bet 或 BB defend 都很難打。" },
    { pos:"BTN", hand:["3c","3d"], best:"raise", explain:"BTN 範圍 45%+，所有口袋對 +EV 開 2.2x。即使 fold to 3-bet 也 +EV。" },
    { pos:"BTN", hand:["J7o"[0]+"h","J7o"[1]+"c"], best:"raise", explain:"J7o BTN 邊緣 raise，靠位置與兩張 broadway 後備。輸 BB 才 fold。" },
    { pos:"SB",  hand:["A5s"[0]+"h","A5s"[1]+"h"], best:"raise", explain:"SB vs BB 單挑，A5s 是經典 polarised 加注牌：阻斷 BB 的 A 高 + 後備同花順。" },
    { pos:"SB",  hand:["Q9o"[0]+"d","Q9o"[1]+"s"], best:"fold",  explain:"SB 是位置最差，Q9o 對 BB defend 範圍 EV 為負。SB 棄牌可。" },
  ];
  for (const t of RFI_TESTS) {
    const seats = 6;
    const stacks = Array(6).fill(100);
    out.push({
      id: id++, gameType: "Cash", seats,
      title: "6-max Cash · " + t.pos + " RFI",
      stage: "Preflop", position: t.pos,
      blinds: "1/2", effective: "100bb", pot: "3",
      table: table(seats, t.pos, stacks),
      facing: "前面所有玩家棄牌到你",
      hero: t.hand, board: [],
      options: [
        { id:"fold",  label:"Fold", ev: t.best==="fold"?0:-3, gto: t.best==="fold"?80:5, correct: t.best==="fold", equity: null },
        { id:"raise", label:"Open 2.5bb", ev: t.best==="raise"?6:-4, gto: t.best==="raise"?85:15, correct: t.best==="raise", equity: null, recommend: t.best==="raise" },
      ],
      explain: t.explain,
      tags:["6-max","Cash","RFI", t.pos],
    });
  }

  // ===== B. 9-max Full Ring · 前位 vs 後位開池差別 =====
  const FR_TESTS = [
    { pos:"UTG", hand:["Th","Tc"], best:"raise", explain:"9-max UTG 範圍約 10%（77+ AJ+ KQs）。TT 是清晰開牌，2.5x 標準。" },
    { pos:"UTG+1", hand:["As","Js"], best:"raise", explain:"AJs 在 9-max UTG+1 是標準開牌，邊緣但同花連性可玩多街。" },
    { pos:"MP", hand:["8s","7s"], best:"fold",   explain:"87s 在 9-max MP 太邊緣，被後位 reg 3-bet 你只能 fold。後位才開。" },
    { pos:"LJ", hand:["Qh","Qd"], best:"raise", explain:"QQ 任何位置都 raise。9-max LJ 開 2.5x，遇 3-bet 大多 4-bet。" },
    { pos:"BTN", hand:["A2o"[0]+"h","A2o"[1]+"c"], best:"raise", explain:"BTN 範圍極寬。A2o 對 SB+BB 防守範圍仍 +EV 開池。" },
  ];
  for (const t of FR_TESTS) {
    const seats = 9;
    const stacks = Array(9).fill(100);
    out.push({
      id: id++, gameType: "Cash", seats,
      title: "9-max Full Ring · " + t.pos + " 起手選擇",
      stage:"Preflop", position:t.pos,
      blinds:"1/2", effective:"100bb", pot:"3",
      table: table(seats, t.pos, stacks),
      facing: "前面所有玩家棄牌到你",
      hero:t.hand, board:[],
      options:[
        { id:"fold", label:"Fold", ev: t.best==="fold"?0:-4, gto: t.best==="fold"?78:8, correct: t.best==="fold" },
        { id:"raise", label:"Open 2.5bb", ev: t.best==="raise"?5:-5, gto: t.best==="raise"?82:18, correct: t.best==="raise", recommend: t.best==="raise" },
      ],
      explain:t.explain,
      tags:["9-max","Full Ring","Cash",t.pos],
    });
  }

  // ===== C. Heads-up 3-handed Cash · BTN/SB 寬範圍練習 =====
  const HU3_TESTS = [
    { pos:"BTN", hand:["Ks","7c"], best:"raise", explain:"3-max 桌 BTN 範圍接近 60%。K7o 必開，棄牌等於送錢給盲注。" },
    { pos:"SB", hand:["Js","8d"], best:"raise", explain:"SB vs BB 單挑（BTN 棄），J8o 範圍內，2.5x 開池或 limp 都可。" },
    { pos:"BB", hand:["6s","4s"], best:"call", explain:"BB 面對 BTN 3x raise，64s 有後備性質可 call 防守，3-bet 太薄。" },
  ];
  for (const t of HU3_TESTS) {
    const seats = 3;
    const stacks = [100,100,100];
    out.push({
      id: id++, gameType:"Cash", seats,
      title:"3-max · "+ t.pos + " 決策",
      stage:"Preflop", position:t.pos,
      blinds:"1/2", effective:"100bb",
      pot: t.pos==="BB"?"7":"3",
      table: table(seats, t.pos, stacks),
      facing: t.pos==="BB" ? "BTN open 6, SB fold" : "前面棄牌到你",
      hero:t.hand, board:[],
      options:[
        { id:"fold", label:"Fold", ev: t.best==="fold"?0:-2, gto: t.best==="fold"?70:8, correct: t.best==="fold" },
        ...(t.pos==="BB" ? [{ id:"call", label:"Call 4bb", ev: t.best==="call"?3:-3, gto: t.best==="call"?72:20, correct: t.best==="call", recommend: t.best==="call" }] : []),
        { id:"raise", label: t.pos==="BB"?"3-bet 18bb":"Open 2.5bb",
          ev: t.best==="raise"?5:-4, gto: t.best==="raise"?80:12,
          correct: t.best==="raise", recommend: t.best==="raise" },
      ],
      explain:t.explain,
      tags:["3-max","Cash",t.pos],
    });
  }

  // ===== D. Preflop · 面對 RFI =====
  const VS_RFI = [
    { pos:"BB", vs:"UTG", hand:["Ah","Qd"], best:"raise", explain:"AQo vs UTG 範圍約 41%，位置不利但牌力夠 3-bet。" },
    { pos:"BB", vs:"UTG", hand:["Js","Tc"], best:"call",  explain:"JTo vs UTG 緊範圍勝率不足 3-bet，但底池賠率 2:1，call defend。" },
    { pos:"BB", vs:"BTN", hand:["8s","6s"], best:"call",  explain:"86s vs BTN 寬開池，深籌碼有現實 equity。3-bet 過薄，fold 太緊。" },
    { pos:"CO", vs:"UTG", hand:["Td","Th"], best:"raise", explain:"TT vs UTG 開池，3-bet 把 KJs/QJs 等次強牌打 fold，對 99-AJs 仍領先。" },
    { pos:"BTN", vs:"CO", hand:["As","5s"], best:"raise", explain:"A5s 是 polarised 3-bet 的核心牌：A 阻斷 + 同花輪牌 + 命中時 nutty。" },
    { pos:"BTN", vs:"CO", hand:["Kh","9c"], best:"fold",  explain:"K9o vs CO 開池，被 reg 4-bet 直接死，call 又位置好但牌力不足。fold 為主。" },
    { pos:"SB", vs:"BTN", hand:["Qh","Qs"], best:"raise", explain:"QQ vs BTN squeeze 標準 3-bet。位置劣勢更該擴大底池主動權。" },
  ];
  for (const t of VS_RFI) {
    const seats = 6;
    const stacks = Array(6).fill(100);
    out.push({
      id: id++, gameType:"Cash", seats,
      title:"防守 · "+t.pos+" vs "+t.vs+" open",
      stage:"Preflop", position:t.pos,
      blinds:"1/2", effective:"100bb", pot:"7.5",
      table: table(seats, t.pos, stacks),
      facing: t.vs+" 開池 2.5bb，所有人棄牌到你",
      hero:t.hand, board:[],
      options:[
        { id:"fold", label:"Fold", ev: t.best==="fold"?0:-3, gto: t.best==="fold"?70:10, correct: t.best==="fold" },
        { id:"call", label:"Call", ev: t.best==="call"?3:-2, gto: t.best==="call"?65:25, correct: t.best==="call", recommend:t.best==="call" },
        { id:"raise", label:"3-bet "+(t.pos==="BB"?"10bb":"8.5bb"),
          ev: t.best==="raise"?6:-4, gto: t.best==="raise"?75:15,
          correct: t.best==="raise", recommend:t.best==="raise" },
      ],
      explain:t.explain,
      tags:["防守","Cash",t.pos],
    });
  }

  // ===== E. C-bet 翻牌 (各種牌面) =====
  const CBET = [
    { hero:["As","Ks"], board:["Qs","7d","2c"], pos:"BTN", stage:"Flop", best:"raise", eq:42, label:"Cbet 33% (3.5bb)", facing:"你 BTN 開池，BB call。BB check。", explain:"AKs 高張 + 後備同花，乾燥牌面對 BB 範圍領先。1/3 池高頻 c-bet。" },
    { hero:["Qd","Qh"], board:["Ah","9c","4s"], pos:"CO", stage:"Flop", best:"check", eq:47, label:"Check 控池", facing:"你 CO 開池，BB call。BB check。", explain:"QQ 在 A 高翻牌變成 bluff catcher。Cbet 把 BB 弱牌打 fold，留下 A 對你。check 控池。" },
    { hero:["7h","7s"], board:["Th","8c","6d"], pos:"HJ", stage:"Flop", best:"check", eq:32, label:"Check fold", facing:"3-bet pot, 你 HJ 開, BB 3-bet, 你 call. BB c-bet 7bb 入 16bb 池。", explain:"77 在 T86 多聽牌面對 3-bet pot c-bet 是清晰棄牌。Bluff catch SPR 太低不划算。" },
    { hero:["Ad","Jd"], board:["Jh","9d","5d"], pos:"BTN", stage:"Flop", best:"raise", eq:78, label:"Cbet 50% (5bb)", facing:"你 BTN 開, BB call. BB check.", explain:"頂對頂踢 + 堅果同花聽牌，價值與保護兼具。50-66% 池 sizing。" },
    { hero:["Ks","Qd"], board:["Kc","Td","6h"], pos:"CO", stage:"Flop", best:"raise", eq:72, label:"Cbet 33% (3.5bb)", facing:"你 CO 開, BB call. BB check.", explain:"頂對好踢 + gutshot 後備。乾濕適中牌面，1/3 池高頻 cbet 把弱牌帶下。" },
    { hero:["7c","6c"], board:["Ah","Kh","2s"], pos:"BTN", stage:"Flop", best:"raise", eq:8, label:"Bluff cbet 33%", facing:"你 BTN 開, BB call. BB check.", explain:"Range advantage 翻牌，AK 高張你比 BB 多。低頻 stab，後備 backdoor 同花順輪牌。" },
    { hero:["8s","8c"], board:["6d","5c","4s"], pos:"MP", stage:"Flop", best:"raise", eq:65, label:"Cbet 66% (6.6bb)", facing:"你 MP 開, BTN call. 翻牌 645r.", explain:"Overpair + open-ended 順子聽牌。多聽牌面要大 sizing 收費。" },
  ];
  for (const t of CBET) {
    out.push({
      id: id++, gameType:"Cash", seats:6,
      title:"翻牌 · "+t.pos+" "+(t.best==="raise"?"C-bet":"Check"),
      stage:t.stage, position:t.pos,
      blinds:"1/2", effective:"97bb", pot:"10",
      table: table(6, t.pos, Array(6).fill(97)),
      facing:t.facing,
      hero:t.hero, board:t.board,
      options:[
        { id:"check", label:"Check", ev: t.best==="check"?5:-3, gto: t.best==="check"?70:25, correct:t.best==="check", equity:t.eq, recommend:t.best==="check" },
        { id:"raise", label:t.label, ev: t.best==="raise"?7:-4, gto: t.best==="raise"?75:25, correct:t.best==="raise", equity:t.eq, recommend:t.best==="raise" },
      ],
      explain:t.explain,
      tags:["6-max","C-bet",t.stage],
    });
  }

  // ===== F. Turn 決策 =====
  const TURN = [
    { hero:["Ah","Kh"], board:["Qh","9h","3c","2h"], pos:"CO", best:"raise", eq:96, sz:"All-in shove", facing:"BB lead 80% pot 8bb 入 10bb 池。SPR 已淺。", explain:"成 nut flush，BB lead 通常範圍兩極，shove 給弱花、二對 paying off。" },
    { hero:["Td","Tc"], board:["9c","8d","5h","Js"], pos:"BB", best:"call", eq:44, sz:"Call", facing:"BTN c-bet 5bb 入 10bb 池, 轉牌 J 你 check, BTN bet 8bb 入 20bb pot。", explain:"TT 在 J988 是 marginal call，pot 底盤勝率夠且 turn 仍有 8 outs（順子 backdoor 弱）。" },
    { hero:["7s","7c"], board:["Tc","8d","6c","Td"], pos:"BB", best:"call", eq:18, sz:"Fold", facing:"翻牌兩家 check, 轉牌 T 對。BTN 下注 8bb 入 12bb pot.", explain:"77 變成下對，T 對到 turn 增加 BTN 範圍中 Tx，且 8 高聽牌完成。fold 是主流。" },
    { hero:["Js","Th"], board:["9c","7d","2h","Qs"], pos:"BTN", best:"raise", eq:76, sz:"Raise to 22", facing:"你 BTN 開, BB call. 翻牌 cbet 5 入 10 pot, BB call. 轉牌 Q, BB lead 8bb 入 20 pot.", explain:"成 open-end → 順子完成 (KJT or 8 高底順)。Lead 通常合併範圍，raise for value 抽取盡量。" },
  ];
  for (const t of TURN) {
    out.push({
      id: id++, gameType:"Cash", seats:6,
      title:"轉牌 · "+t.pos+" 決策",
      stage:"Turn", position:t.pos,
      blinds:"1/2", effective:"60bb", pot:"20",
      table: table(6, t.pos, Array(6).fill(60)),
      facing:t.facing,
      hero:t.hero, board:t.board,
      options:[
        { id:"fold", label:"Fold", ev: t.best==="fold"?0:-5, gto: t.best==="fold"?75:8, correct:t.best==="fold", equity:t.eq },
        { id:"call", label:"Call", ev: t.best==="call"?4:-2, gto: t.best==="call"?70:25, correct:t.best==="call", equity:t.eq, recommend:t.best==="call" },
        { id:"raise", label:t.sz, ev: t.best==="raise"?9:-6, gto: t.best==="raise"?80:15, correct:t.best==="raise", equity:t.eq, recommend:t.best==="raise" },
      ],
      explain:t.explain,
      tags:["Turn","Cash",t.pos],
    });
  }

  // ===== G. River 決策 =====
  const RIVER = [
    { hero:["Ad","Kh"], board:["Kc","9d","6s","2c","7h"], pos:"BTN", best:"raise", eq:88, sz:"Bet 33% (10bb)", facing:"BB check 給你河牌。Pot 30bb.", explain:"頂對頂踢 + range advantage。薄價值下小尺度抽取 9x、Kx 弱踢 calls。" },
    { hero:["Qs","Qd"], board:["Th","7c","4s","2d","5h"], pos:"CO", best:"raise", eq:82, sz:"Bet 50% (15bb)", facing:"BB call 翻轉，河牌 5。Pot 30. BB check.", explain:"超對保持領先，河牌空白。50% 池抽取 Tx、TP 範圍。" },
    { hero:["Js","Tc"], board:["Ah","9d","3s","6c","2h"], pos:"BB", best:"check", eq:6, sz:"Check fold", facing:"你 BB call vs CO open. 翻轉河皆 check 到河牌, CO check 河.", explain:"Air 在 A 高板, 沒有阻斷 + 對方範圍含 Ax 太多。check fold。" },
    { hero:["8c","8d"], board:["Th","7s","4d","Qc","2h"], pos:"BB", best:"call", eq:40, sz:"Hero call", facing:"3 街 check-call after BTN cbet flop. River BTN bet 12bb 入 28 pot.", explain:"88 是 bluff catcher，BTN 範圍含很多 missed draws。需 30% 勝率，估約 40%，hero call。" },
  ];
  for (const t of RIVER) {
    out.push({
      id: id++, gameType:"Cash", seats:6,
      title:"河牌 · "+t.pos+" 決策",
      stage:"River", position:t.pos,
      blinds:"1/2", effective:"45bb", pot:"30",
      table: table(6, t.pos, Array(6).fill(45)),
      facing:t.facing,
      hero:t.hero, board:t.board,
      options:[
        { id:"fold", label:"Fold", ev: t.best==="fold"?0:-3, gto: t.best==="fold"?75:10, correct:t.best==="fold", equity:t.eq },
        { id:"check", label:"Check / Call", ev: t.best==="check"||t.best==="call"?3:-2, gto: t.best==="check"||t.best==="call"?68:20, correct:(t.best==="check"||t.best==="call"), equity:t.eq, recommend:(t.best==="check"||t.best==="call") },
        { id:"raise", label:t.sz, ev: t.best==="raise"?7:-4, gto: t.best==="raise"?70:18, correct:t.best==="raise", equity:t.eq, recommend:t.best==="raise" },
      ],
      explain:t.explain,
      tags:["River","Cash",t.pos],
    });
  }

  // ===== H. MTT Push/Fold (3-25bb 各種情境) =====
  const MTT_PF = [
    { stack:8,  pos:"BTN", hand:["Ad","6c"], best:"shove", explain:"8bb BTN A6o 100% jam，Nash 表內。" },
    { stack:8,  pos:"SB",  hand:["Kc","9d"], best:"shove", explain:"8bb SB vs BB single, K9o 標準 jam。" },
    { stack:10, pos:"HJ",  hand:["Ah","Js"], best:"shove", explain:"10bb HJ AJ 標準 jam，3x 開池後被 BB call 你只剩 7bb 難打。" },
    { stack:12, pos:"CO",  hand:["Tc","Td"], best:"shove", explain:"12bb 中位口袋對 jam 比 raise/fold EV 高，避免被 squeeze。" },
    { stack:15, pos:"BTN", hand:["8s","8h"], best:"raise", explain:"15bb 仍可玩深一點。88 BTN min-raise 2bb，被 jam call 仍 +EV。" },
    { stack:20, pos:"UTG", hand:["Ks","Qs"], best:"raise", explain:"20bb UTG KQs 標準 2.2x open，避免直接 jam 浪費 fold equity。" },
    { stack:5,  pos:"BB",  hand:["7c","2d"], best:"fold", explain:"5bb BB 面對 BTN jam 17bb cover, 72o 賠率不夠 + 任何 Ax 都領先。fold。" },
    { stack:6,  pos:"BB",  hand:["Ac","8d"], best:"call", explain:"6bb BB 面對 BTN jam, A8o 對 BTN 寬範圍 ~ 55%, 必 call。" },
  ];
  for (const t of MTT_PF) {
    const seats = 9;
    const stacks = Array(9).fill(40); stacks[0] = t.stack;
    const isBB = t.pos === "BB";
    out.push({
      id: id++, gameType:"MTT", seats,
      title:"MTT · "+t.stack+"bb "+t.pos+(isBB?" 面對 jam":" Push/Fold"),
      stage:"Preflop", position:t.pos,
      blinds:"500/1000, ante 100", effective:t.stack+"bb", pot: isBB?"3500":"2400",
      table: table(seats, t.pos, stacks),
      itm: { left: 87, paid: 100, places: t.pos==="BB"?"領 90 名": "領 100 名", money: false },
      facing: isBB ? "BTN jam "+t.stack+"bb，所有人棄到你" : "前面所有玩家棄牌到你",
      hero:t.hand, board:[],
      options:[
        { id:"fold", label:"Fold", ev: t.best==="fold"?0:-200, gto: t.best==="fold"?75:5, correct:t.best==="fold" },
        ...(isBB ? [
          { id:"call", label:"Call jam", ev: t.best==="call"?400:-300, gto: t.best==="call"?80:15, correct:t.best==="call", recommend:t.best==="call" },
        ] : [
          { id:"raise", label:"Min-raise 2bb", ev: t.best==="raise"?100:-150, gto: t.best==="raise"?70:5, correct:t.best==="raise", recommend:t.best==="raise" },
          { id:"shove", label:"All-in "+t.stack+"bb", ev: t.best==="shove"?400:-200, gto: t.best==="shove"?85:10, correct:t.best==="shove", recommend:t.best==="shove" },
        ]),
      ],
      explain:t.explain,
      tags:["MTT","Push/Fold",t.pos],
    });
  }

  // ===== I. ICM Bubble / FT 決策 =====
  const ICM = [
    {
      title:"Bubble · 大碼 vs 大碼 對沖",
      stack:60, others:[80,15,10,8,12,20,25,18],
      pos:"CO", hand:["As","Qd"], best:"fold",
      itm:{ left:10, paid:9, places:"領 9 名", money:true },
      facing:"BTN（chip leader 80bb）3-bet 你 open 到 22bb 入 ~30bb 池",
      explain:"Bubble + 你也是大碼之一。AQo vs CL 的 4-bet/jam 範圍翻不過，棄保命，等 short 自動下車。",
    },
    {
      title:"Bubble · 中碼 vs short shove",
      stack:30, others:[8,40,12,25,6,35,18,9],
      pos:"BB", hand:["Kc","Js"], best:"call",
      itm:{ left:11, paid:10, places:"領 10 名", money:true },
      facing:"UTG short stack jam 8bb，你 BB cover",
      explain:"短碼 jam 範圍寬 ~ 35%，KJo 約 56%。pot odds 充足且少一個 short stack 你 ICM 大幅獲利。call。",
    },
    {
      title:"Final Table · 中碼 dodge ladder",
      stack:25, others:[55,40,22,18,9],
      pos:"BTN", hand:["Ah","Ts"], best:"fold",
      itm:{ left:6, paid:6, places:"已進獎金，下一階 +5000", money:true },
      facing:"前面棄, SB chip leader 55bb 在你後面",
      explain:"FT 6 人，5 位是 short, ATo 開池會被 SB chip leader 大幅 3-bet。等 short 先下車能爬獎金階。",
    },
    {
      title:"Heads-up · 為冠軍",
      stack:80, others:[40],
      pos:"SB", hand:["6c","5c"], best:"raise",
      itm:{ left:2, paid:2, places:"冠 vs 亞", money:true },
      facing:"BTN/SB 你開",
      explain:"HU 領先方應加大壓力。65s 任何 sizing +EV，2.5x 標準。對方更難 defend。",
    },
  ];
  for (const t of ICM) {
    const seats = t.others.length + 1;
    const stacks = [t.stack, ...t.others];
    out.push({
      id: id++, gameType:"MTT", seats,
      title:"ICM · "+t.title,
      stage:"Preflop", position:t.pos,
      blinds:"2000/4000, ante 500", effective:Math.min(t.stack, ...t.others)+"bb",
      pot:"15000",
      table: table(seats, t.pos, stacks),
      itm: t.itm,
      facing:t.facing,
      hero:t.hand, board:[],
      options:[
        { id:"fold", label:"Fold", ev: t.best==="fold"?0:-1000, gto: t.best==="fold"?78:10, correct:t.best==="fold", recommend:t.best==="fold" },
        { id:"call", label:"Call", ev: t.best==="call"?800:-800, gto: t.best==="call"?80:15, correct:t.best==="call", recommend:t.best==="call" },
        { id:"raise", label:"Raise / 4-bet", ev: t.best==="raise"?600:-1200, gto: t.best==="raise"?75:10, correct:t.best==="raise", recommend:t.best==="raise" },
      ],
      explain:t.explain,
      tags:["MTT","ICM","Bubble"],
    });
  }

  // ===== J. 多人底池 (3-way / 4-way) =====
  const MULTI = [
    { title:"3-way · top set 多人慢打陷阱", hero:["8s","8c"], board:["8d","Tc","Jh"], pos:"MP", best:"raise", facing:"你 MP 開, CO + BTN call. 3-way pot 9bb. 翻 8TJr.", explain:"set + 多聽牌面 + 3-way，必須大 sizing 保護。Slow play 會被免費翻過。" },
    { title:"4-way · 頂對棄牌 在多人池", hero:["Ah","Js"], board:["As","9d","6c"], pos:"BB", best:"check", facing:"4 人看翻 8bb 池。BB 第一個行動。", explain:"4-way 翻牌頂對中踢應 check。Donk 會被 IP 玩家用更強 Ax 痛擊。" },
    { title:"3-way · 同花聽牌的 squeeze", hero:["Ts","9s"], board:["7s","6s","2c"], pos:"BTN", best:"raise", facing:"MP open, CO call, 你 BTN. 翻 同花+順子聽牌.", explain:"21 outs (9 同花 + 8 順 - 重疊 +) 你權益高於 50%, 多人池半詐唬 raise 取主動。" },
  ];
  for (const t of MULTI) {
    out.push({
      id: id++, gameType:"Cash", seats:6,
      title:t.title,
      stage:"Flop", position:t.pos,
      blinds:"1/2", effective:"96bb", pot:"9",
      table: table(6, t.pos, Array(6).fill(96)),
      facing:t.facing,
      hero:t.hero, board:t.board,
      options:[
        { id:"check", label:"Check", ev: t.best==="check"?3:-2, gto: t.best==="check"?72:20, correct:t.best==="check", recommend:t.best==="check" },
        { id:"raise", label:"Bet 75% pot", ev: t.best==="raise"?6:-3, gto: t.best==="raise"?78:15, correct:t.best==="raise", recommend:t.best==="raise" },
      ],
      explain:t.explain,
      tags:["多人池","Cash",t.pos],
    });
  }

  // ===== K. SPR / 深堆 / 短堆 對比 =====
  const SPR_TESTS = [
    { title:"低 SPR · TPTK commit", hero:["Ah","Kh"], board:["Ks","8d","3c"], pos:"BTN", spr:1.2, eff:"30bb", pot:"24", best:"raise", facing:"3-bet pot, SPR 1.2. BB c-bet pot.", explain:"SPR<2 的 TPTK 必然 commit。直接 jam 取得 fold equity + value。" },
    { title:"高 SPR · 超對控池", hero:["Qs","Qc"], board:["8h","6d","3s"], pos:"CO", spr:12, eff:"200bb", pot:"8", best:"check", facing:"single raised pot, SPR 12, BB check 給你。", explain:"200bb 深, QQ 在乾燥面控池價值更高。Cbet 容易被聽牌 raise 棄主導權。" },
    { title:"中 SPR · 頂對標準 cbet", hero:["Ah","Js"], board:["Jh","8c","4d"], pos:"CO", spr:5, eff:"75bb", pot:"15", best:"raise", facing:"single raised pot, BB check.", explain:"SPR 5 是頂對舒適區。50% 池 cbet 三街抽價值。" },
  ];
  for (const t of SPR_TESTS) {
    out.push({
      id: id++, gameType:"Cash", seats:6,
      title:t.title,
      stage:"Flop", position:t.pos,
      blinds:"1/2", effective:t.eff, pot:t.pot,
      table: table(6, t.pos, Array(6).fill(parseInt(t.eff))),
      facing:t.facing,
      hero:t.hero, board:t.board,
      options:[
        { id:"check", label:"Check", ev: t.best==="check"?4:-3, gto: t.best==="check"?70:20, correct:t.best==="check", recommend:t.best==="check" },
        { id:"raise", label:"Bet / Jam", ev: t.best==="raise"?6:-4, gto: t.best==="raise"?75:15, correct:t.best==="raise", recommend:t.best==="raise" },
      ],
      explain:t.explain,
      tags:["SPR","Cash",t.pos],
    });
  }

  return out;
}

// retrofit original handcrafted scenarios with table context
function retrofitOriginals() {
  const POS_BY_N = {
    6: ["SB","BB","UTG","HJ","CO","BTN"],
    9: ["SB","BB","UTG","UTG+1","MP","LJ","HJ","CO","BTN"],
  };
  const NAMES = ["—","Mira","Doyle","Phil","Vivian","Kai","Ren","Ada","Otto"];
  for (const sc of SCENARIOS) {
    if (sc.table) continue;
    const isMTT = (sc.tags || []).some(t => t==="MTT" || t==="ICM");
    const seats = isMTT ? 9 : 6;
    const eff = parseInt(sc.effective) || 100;
    const order = POS_BY_N[seats];
    sc.gameType = isMTT ? "MTT" : "Cash";
    sc.seats = seats;
    sc.table = order.map((p, i) => ({
      pos: p,
      name: i === 0 ? "—" : NAMES[i] || ("P"+i),
      stack: p === sc.position ? eff : eff,
      isHero: p === sc.position,
    }));
    if (isMTT && !sc.itm) {
      sc.itm = (sc.tags || []).includes("Bubble")
        ? { left: 11, paid: 10, places: "領 10 名", money: true }
        : { left: 87, paid: 100, places: "領 100 名", money: false };
    }
  }
}

// extra batch — push past 100 total
function genExtra() {
  const out = [];
  let id = 200;
  function tbl(seats, hero, stacks) {
    const POS = {
      2:["SB/BTN","BB"], 3:["SB","BB","BTN"], 4:["SB","BB","CO","BTN"],
      5:["SB","BB","UTG","CO","BTN"], 6:["SB","BB","UTG","HJ","CO","BTN"],
      7:["SB","BB","UTG","MP","HJ","CO","BTN"], 8:["SB","BB","UTG","UTG+1","MP","HJ","CO","BTN"],
      9:["SB","BB","UTG","UTG+1","MP","LJ","HJ","CO","BTN"],
    };
    const NAMES = ["你","Mira","Doyle","Phil","Vivian","Kai","Ren","Ada","Otto"];
    const order = POS[seats] || POS[9].slice(0, seats);
    return order.map((p, i) => ({ pos: p, name: i===0?"—":NAMES[i], stack: stacks[i] || stacks[stacks.length-1], isHero: p === hero }));
  }
  // more RFI cases
  const MORE_RFI = [
    { pos:"UTG", h:["Ah","Tc"], best:"fold", x:"ATo 在 6-max UTG 邊緣偏弱，被 reg 3-bet 痛苦。同花才開。" },
    { pos:"HJ",  h:["Ks","Ts"], best:"raise", x:"KTs 在 HJ 範圍內，後備同花順 + broadway 強。" },
    { pos:"CO",  h:["9c","9d"], best:"raise", x:"99 任何位置都開，CO 可以遇到 squeeze 直接 4-bet 反壓。" },
    { pos:"BTN", h:["5s","4s"], best:"raise", x:"54s BTN 標準開池，命中時隱藏度高，後備順子同花。" },
    { pos:"SB",  h:["Ah","Th"], best:"raise", x:"ATs SB 必開（vs BB），多數時候 limp/raise 混合。" },
    { pos:"BB",  h:["Qd","Qc"], best:"raise", x:"BB 沒人開到你 = walk；若有人 limp，QQ 必 iso-raise。" },
    { pos:"UTG", h:["Js","Jc"], best:"raise", x:"JJ UTG 標準 2.5x，遇 3-bet 通常 call IP / fold OOP。" },
    { pos:"CO",  h:["6h","5h"], best:"raise", x:"65s CO 範圍內，多街可玩性高。" },
    { pos:"HJ",  h:["Ad","8d"], best:"raise", x:"A8s HJ 標準開池，A 高同花後備強。" },
    { pos:"BTN", h:["7c","2d"], best:"fold", x:"72o 即使 BTN 也是垃圾，棄牌不損失。" },
  ];
  for (const t of MORE_RFI) {
    out.push({
      id:id++, gameType:"Cash", seats:6,
      title:"RFI · "+t.pos+" "+t.h.join(""),
      stage:"Preflop", position:t.pos,
      blinds:"1/2", effective:"100bb", pot:"3",
      table: tbl(6, t.pos, Array(6).fill(100)),
      facing:"前面所有人棄牌到你",
      hero:t.h, board:[],
      options:[
        { id:"fold", label:"Fold", ev: t.best==="fold"?0:-3, gto: t.best==="fold"?78:8, correct: t.best==="fold" },
        { id:"raise", label:"Open 2.5bb", ev: t.best==="raise"?5:-4, gto: t.best==="raise"?82:18, correct: t.best==="raise", recommend: t.best==="raise" },
      ],
      explain:t.x,
      tags:["6-max","RFI","Cash",t.pos],
    });
  }
  // more vs 3-bet
  const VS_3BET = [
    { pos:"CO", h:["Ah","Kd"], best:"raise", x:"AKo vs BTN 3-bet 必 4-bet。jam 比例混合。" },
    { pos:"CO", h:["Tc","Td"], best:"call", x:"TT vs BTN 3-bet IP call 為主，4-bet 太薄遇到 KK+ 受困。" },
    { pos:"BTN", h:["Js","Ts"], best:"call", x:"JTs vs SB 3-bet IP call 標準，後備性質強。" },
    { pos:"UTG", h:["Kh","Kc"], best:"raise", x:"KK vs SB 3-bet 100% 4-bet。" },
    { pos:"HJ", h:["Qd","Qs"], best:"raise", x:"QQ vs CO 3-bet 4-bet 高頻，OOP 不能讓對手免費看翻。" },
    { pos:"CO", h:["8c","7c"], best:"fold", x:"87s vs BTN 3-bet 18bb pot OOP 太薄，棄即可。" },
  ];
  for (const t of VS_3BET) {
    out.push({
      id:id++, gameType:"Cash", seats:6,
      title:"面對 3-bet · "+t.pos+" "+t.h.join(""),
      stage:"Preflop", position:t.pos,
      blinds:"1/2", effective:"100bb", pot:"19",
      table: tbl(6, t.pos, Array(6).fill(100)),
      facing:"你開 2.5bb，後位 3-bet 到 8.5bb，所有人棄到你",
      hero:t.h, board:[],
      options:[
        { id:"fold", label:"Fold", ev: t.best==="fold"?0:-2, gto: t.best==="fold"?72:10, correct: t.best==="fold", recommend: t.best==="fold" },
        { id:"call", label:"Call 6bb", ev: t.best==="call"?3:-3, gto: t.best==="call"?70:20, correct: t.best==="call", recommend: t.best==="call" },
        { id:"raise", label:"4-bet 19bb", ev: t.best==="raise"?6:-5, gto: t.best==="raise"?78:12, correct: t.best==="raise", recommend: t.best==="raise" },
      ],
      explain:t.x,
      tags:["3-bet","Cash",t.pos],
    });
  }
  // more push/fold stacks
  const MORE_PF = [
    { stack:3, pos:"BTN", h:["7c","6c"], best:"shove", x:"3bb BTN 任何兩張都 jam，blinds 比 stack 還大。" },
    { stack:5, pos:"CO", h:["Kd","8s"], best:"shove", x:"5bb CO K8o 範圍內 jam，fold 太緊。" },
    { stack:7, pos:"HJ", h:["Qc","Jd"], best:"shove", x:"7bb HJ QJo Nash 內 jam。" },
    { stack:9, pos:"BTN", h:["3c","3d"], best:"shove", x:"9bb BTN 33 jam 是教科書，避免 raise/fold 浪費。" },
    { stack:14, pos:"SB", h:["Ah","9d"], best:"shove", x:"14bb SB vs BB single, A9o 直接 jam 取得 fold equity。" },
    { stack:18, pos:"UTG", h:["8s","8d"], best:"raise", x:"18bb UTG 88 仍可 raise/fold，jam 過早。" },
    { stack:25, pos:"CO", h:["Ad","Kd"], best:"raise", x:"25bb CO AKs 必開 raise，遇 3-bet jam。" },
  ];
  for (const t of MORE_PF) {
    const stacks = Array(9).fill(40); stacks[0] = t.stack;
    out.push({
      id:id++, gameType:"MTT", seats:9,
      title:"MTT · "+t.stack+"bb "+t.pos+" Push/Fold",
      stage:"Preflop", position:t.pos,
      blinds:"500/1000, ante 100", effective:t.stack+"bb", pot:"2400",
      table: tbl(9, t.pos, stacks),
      itm:{ left: 87, paid: 100, places:"領 100 名", money:false },
      facing:"前面棄牌到你",
      hero:t.h, board:[],
      options:[
        { id:"fold", label:"Fold", ev: t.best==="fold"?0:-200, gto: t.best==="fold"?75:5, correct: t.best==="fold" },
        { id:"raise", label:"Min-raise 2bb", ev: t.best==="raise"?100:-100, gto: t.best==="raise"?72:10, correct: t.best==="raise", recommend: t.best==="raise" },
        { id:"shove", label:"All-in "+t.stack+"bb", ev: t.best==="shove"?400:-200, gto: t.best==="shove"?85:10, correct: t.best==="shove", recommend: t.best==="shove" },
      ],
      explain:t.x,
      tags:["MTT","Push/Fold",t.pos],
    });
  }
  // more flop / turn / river boards
  const MORE_POSTFLOP = [
    { stage:"Flop", pos:"BTN", h:["Jh","Jd"], b:["Js","9c","8h"], best:"raise", sz:"Bet 66% pot", eq:88, x:"暗三條 + 多聽牌面，必須大下保護。" },
    { stage:"Flop", pos:"CO", h:["Ad","Qc"], b:["Qh","6s","2d"], best:"raise", sz:"Bet 33%", eq:80, x:"頂對頂踢乾燥面，1/3 池高頻 cbet。" },
    { stage:"Flop", pos:"BB", h:["Ts","9s"], b:["8d","7c","2h"], best:"check", sz:"Check call", eq:35, x:"OESD 對 BTN cbet check-call 標準。" },
    { stage:"Flop", pos:"BTN", h:["Ks","Kh"], b:["Ah","Td","6c"], best:"check", sz:"Check 控池", eq:38, x:"KK on Ace high 是 bluff catcher，控池為主。" },
    { stage:"Turn", pos:"BTN", h:["Ah","Qh"], b:["Kh","9d","3h","4c"], best:"raise", sz:"Bet 75%", eq:70, x:"頂對 + nut flush draw，半詐唬大下抽 fold equity。" },
    { stage:"Turn", pos:"CO", h:["Ks","Kd"], b:["Qc","8h","5d","Jh"], best:"raise", sz:"Bet 50%", eq:62, x:"超對在 turn 沒有完成多少聽牌，繼續 barrel。" },
    { stage:"River", pos:"BB", h:["Ad","Tc"], b:["Th","9s","6d","2c","2s"], best:"call", sz:"Hero call", eq:42, x:"TP 對 BTN 河牌 polarized bet 是 bluff catcher。" },
    { stage:"River", pos:"BTN", h:["Qs","Qd"], b:["Ks","8c","6d","3h","2c"], best:"check", sz:"Check back", eq:35, x:"QQ 在 K-high 河牌 check back 較好，bet 只被 K+ call。" },
  ];
  for (const t of MORE_POSTFLOP) {
    out.push({
      id:id++, gameType:"Cash", seats:6,
      title:t.stage+" · "+t.pos+" 決策",
      stage:t.stage, position:t.pos,
      blinds:"1/2", effective:t.stage==="River"?"45bb":"75bb", pot:t.stage==="River"?"30":"15",
      table: tbl(6, t.pos, Array(6).fill(t.stage==="River"?45:75)),
      facing:t.stage==="Flop"?"上家 check 給你":"上家下注 50% pot",
      hero:t.h, board:t.b,
      options:[
        { id:"fold", label:"Fold", ev: t.best==="fold"?0:-3, gto: t.best==="fold"?72:10, correct: t.best==="fold", equity:t.eq },
        { id:"check", label:"Check / Call", ev: t.best==="check"||t.best==="call"?3:-2, gto: t.best==="check"||t.best==="call"?70:20, correct:(t.best==="check"||t.best==="call"), equity:t.eq, recommend:(t.best==="check"||t.best==="call") },
        { id:"raise", label:t.sz, ev: t.best==="raise"?6:-4, gto: t.best==="raise"?78:15, correct: t.best==="raise", equity:t.eq, recommend: t.best==="raise" },
      ],
      explain:t.x,
      tags:[t.stage,"Cash",t.pos],
    });
  }
  // more ICM
  const MORE_ICM = [
    { title:"FT · Short stack 復活 jam", stack:6, others:[40,30,25,18,12,8], pos:"UTG", h:["Ad","Js"], best:"raise", facing:"6bb UTG 必 jam 復活", x:"6bb FT short 不能等，AJo 範圍內必 jam。" },
    { title:"Bubble · 中碼開池被 short jam", stack:25, others:[8,40,15,30,10,20,18,9], pos:"CO", h:["Ah","Qh"], best:"call", facing:"你 CO open, BTN short 8bb jam", x:"AQs 對 short jam 範圍 ~ 65%, ICM 中仍 +EV call。" },
    { title:"FT · 大碼 vs 大碼 4-bet shove", stack:80, others:[75,15,12,8,6], pos:"BTN", h:["Js","Jc"], best:"call", facing:"SB chip leader 4-bet jam 你 open", x:"JJ vs CL 範圍 ~52%, FT 6人有獎金階差，但 JJ 仍必 call。" },
  ];
  for (const t of MORE_ICM) {
    const seats = t.others.length + 1;
    const stacks = [t.stack, ...t.others];
    out.push({
      id:id++, gameType:"MTT", seats,
      title:"ICM · "+t.title,
      stage:"Preflop", position:t.pos,
      blinds:"2000/4000, ante 500", effective:Math.min(t.stack, ...t.others)+"bb",
      pot:"15000",
      table: tbl(seats, t.pos, stacks),
      itm:{ left: seats, paid:9, places:"領 9 名", money:true },
      facing:t.facing,
      hero:t.h, board:[],
      options:[
        { id:"fold", label:"Fold", ev: t.best==="fold"?0:-1000, gto: t.best==="fold"?72:8, correct: t.best==="fold", recommend: t.best==="fold" },
        { id:"call", label:"Call", ev: t.best==="call"?700:-700, gto: t.best==="call"?78:15, correct: t.best==="call", recommend: t.best==="call" },
        { id:"raise", label:"Raise / Jam", ev: t.best==="raise"?900:-900, gto: t.best==="raise"?80:10, correct: t.best==="raise", recommend: t.best==="raise" },
      ],
      explain:t.x,
      tags:["MTT","ICM"],
    });
  }
  return out;
}

retrofitOriginals();
try { SCENARIOS.push(...genScenarios()); } catch(e) { console.error("genScenarios failed:", e); }
try { SCENARIOS.push(...genExtra()); } catch(e) { console.error("genExtra failed:", e); }
try { SCENARIOS.push(...genTournamentICM()); } catch(e) { console.error("genTournamentICM failed:", e); }

// ============================================================
// Tournament ICM scenarios — every option carries BOTH chipEV
// (籌碼 EV, in bb) AND dollarEV (% of prize-pool delta) so the
// practice page can render the divergence side-by-side.
// ============================================================
function genTournamentICM() {
  const out = [];
  let id = 400;
  const POS = {
    2:["SB/BTN","BB"], 3:["SB","BB","BTN"], 4:["SB","BB","CO","BTN"],
    5:["SB","BB","UTG","CO","BTN"], 6:["SB","BB","UTG","HJ","CO","BTN"],
    7:["SB","BB","UTG","MP","HJ","CO","BTN"], 8:["SB","BB","UTG","UTG+1","MP","HJ","CO","BTN"],
    9:["SB","BB","UTG","UTG+1","MP","LJ","HJ","CO","BTN"],
  };
  const NAMES = ["你","Mira","Doyle","Phil","Vivian","Kai","Ren","Ada","Otto"];
  function tbl(seats, heroPos, stacks) {
    const order = POS[seats] || POS[9].slice(0, seats);
    return order.map((p, i) => ({
      pos: p, name: i === 0 ? "—" : NAMES[i],
      stack: stacks[i] != null ? stacks[i] : stacks[stacks.length - 1],
      isHero: p === heroPos,
    }));
  }

  // Each entry: full scenario with options[].chipEV (bb) and dollarEV (% of pool)
  const SCN = [
    {
      title: "Bubble · 你是中堆，CL 對你 jam",
      stage: "Preflop", pos: "BB", seats: 8,
      blinds: "2000/4000, ante 500", effective: "20bb",
      stacks: [80, 12, 22, 38, 9, 18, 30, 14], pot: "98000",
      itm: { left: 8, paid: 7, places: "領 7 名", money: true },
      facing: "BTN (chip leader 80bb) 全下，所有人棄到你",
      hero: ["Ah","Js"],
      opts: [
        { id:"fold", label:"Fold", chipEV: -1.5, dollarEV: 0.0, gto: 82, correct: true, recommend: true },
        { id:"call", label:"Call 20bb 全下", chipEV: +1.8, dollarEV: -2.4, gto: 18, correct: false },
      ],
      explain: "AJo 對 CL 寬範圍 ~54%，純 chip-EV 是 +1.8bb。但被 cover、bubble factor ≈ 1.5：你需要 60% 才 break-even on $EV。淘汰直接損失 2.4% 的獎金池期望。fold 雖然在籌碼數字上看不到，但「保留下一輪」才是 $EV 最大化。",
      tags: ["MTT","ICM","Bubble"],
    },
    {
      title: "Bubble · 短碼 (你) jam，CL 不在你後面",
      stage: "Preflop", pos: "CO", seats: 8,
      blinds: "2000/4000, ante 500", effective: "8bb",
      stacks: [8, 75, 40, 30, 22, 15, 12, 9], pot: "9000",
      itm: { left: 8, paid: 7, places: "領 7 名", money: true },
      facing: "BTN/SB/BB 都比你深一點點，但 chip leader 已棄牌；前面全部 fold",
      hero: ["8s","7s"],
      opts: [
        { id:"fold", label:"Fold", chipEV: -0.8, dollarEV: -0.6, gto: 25, correct: false },
        { id:"shove", label:"All-in 8bb", chipEV: +0.9, dollarEV: +1.1, gto: 75, correct: true, recommend: true },
      ],
      explain: "87s 在 8bb CO 純 chip-EV 邊緣。關鍵是：BTN、SB、BB 的籌碼跟你接近，他們 call 之後要冒被你 double up 到大致打平的風險，所以 call 範圍很緊 — 你的 fold equity 拉高，$EV 反而比 chip-EV 更高。短碼的祕密：找沒有 cover 你的對手 jam。",
      tags: ["MTT","ICM","Bubble","Push/Fold"],
    },
    {
      title: "Satellite Bubble · AA 棄牌",
      stage: "Preflop", pos: "BB", seats: 7,
      blinds: "5000/10000, ante 1000", effective: "12bb",
      stacks: [12, 9, 60, 55, 50, 8, 35], pot: "33000",
      itm: { left: 7, paid: 6, places: "前 6 名同領 1 個席位 (Main Event 買入)", money: true },
      facing: "P6 (8bb short) 全下，其他人棄，輪到你",
      hero: ["Ah","Ad"],
      opts: [
        { id:"fold", label:"Fold (鎖席位)", chipEV: -2.8, dollarEV: +0.0, gto: 90, correct: true, recommend: true },
        { id:"call", label:"Call 8bb 全下", chipEV: +4.5, dollarEV: -8.3, gto: 10, correct: false },
      ],
      explain: "衛星賽的 ICM 是極端版本：每一個席位的獎金「一樣」。你 12bb 比 short 的 8bb 多，目前在前 6 名內 — 已經鎖。Call 即使贏，多出的籌碼換不到更多獎金 (席位早就拿到了)；輸了直接被淘汰失去席位。是的，連 AA 都可以 fold。這是教科書級的 chip-EV ≠ $EV。",
      tags: ["MTT","ICM","Satellite"],
    },
    {
      title: "FT 5-way · KQs vs CL 4-bet jam",
      stage: "Preflop", pos: "CO", seats: 5,
      blinds: "10000/20000, ante 2500", effective: "32bb",
      stacks: [32, 90, 28, 18, 14], pot: "350000",
      itm: { left: 5, paid: 5, places: "FT 5 人 · 第 5→第 4 +$48k", money: true },
      facing: "你 CO open 2.2bb，SB (CL 90bb) 4-bet jam 你 32bb cover",
      hero: ["Ks","Qs"],
      opts: [
        { id:"fold", label:"Fold", chipEV: -2.0, dollarEV: -0.4, gto: 85, correct: true, recommend: true },
        { id:"call", label:"Call jam", chipEV: +0.8, dollarEV: -2.6, gto: 15, correct: false },
      ],
      explain: "KQs vs CL 的 4-bet jam 範圍 ~12% 約 35% equity，chip-EV 已經是負的，加上 FT pay jump $48k 把 BF 推到 1.6+。淘汰就掉一個級距，留下還有 3 個短碼會先下車。FT 的 ICM 比 bubble 還深 — fold 是清晰決策。",
      tags: ["MTT","ICM","FT"],
    },
    {
      title: "FT 5-way · CL 對中堆施壓 (你是 CL)",
      stage: "Preflop", pos: "BTN", seats: 5,
      blinds: "10000/20000, ante 2500", effective: "32bb",
      stacks: [90, 32, 28, 14, 10], pot: "32500",
      itm: { left: 5, paid: 5, places: "FT 5 人", money: true },
      facing: "前面全部棄牌到你；身為 chip leader 你 cover 每一個人",
      hero: ["Jh","Tc"],
      opts: [
        { id:"fold", label:"Fold", chipEV: -0.5, dollarEV: -1.2, gto: 10, correct: false },
        { id:"raise", label:"Open 2.2x", chipEV: +0.4, dollarEV: +1.8, gto: 90, correct: true, recommend: true },
      ],
      explain: "你是 CL，FT 上每個對手都被 ICM 卡住。JTo 純 chip-EV 邊緣，但 SB+BB 為了不冒「FT 前下車」風險會超緊 defend；你拿到的 fold equity 拉高 $EV。當 CL 的劇本：對著被 ICM 綁住的中堆們不停施壓。",
      tags: ["MTT","ICM","FT"],
    },
    {
      title: "FT 4-way · 第二大碼 vs Short jam",
      stage: "Preflop", pos: "BB", seats: 4,
      blinds: "15000/30000, ante 3000", effective: "9bb",
      stacks: [50, 9, 80, 25], pot: "57000",
      itm: { left: 4, paid: 4, places: "FT 4 人 · 第 4→第 3 +$30k", money: true },
      facing: "UTG short stack jam 9bb，BTN (CL 80bb)、SB 都棄，輪到你 (50bb)",
      hero: ["Td","Tc"],
      opts: [
        { id:"fold", label:"Fold (等 short 死)", chipEV: -2.5, dollarEV: -0.3, gto: 35, correct: false },
        { id:"call", label:"Call 9bb 全下", chipEV: +3.8, dollarEV: +1.6, gto: 65, correct: true, recommend: true },
      ],
      explain: "TT vs short 寬 jam 範圍 ~58%。你 cover short，輸了還是有 41bb；贏了直接拿走一個對手。即使 ICM 有 pay jump 壓力，TT 對 short stack 的 equity 夠高、且消滅一個對手讓 ICM 對你大幅上升。「等 short 死」是錯的 — 你才是來收 short 的。",
      tags: ["MTT","ICM","FT"],
    },
    {
      title: "Bubble · 你是 CL，對中堆做 squeeze",
      stage: "Preflop", pos: "BTN", seats: 9,
      blinds: "3000/6000, ante 750", effective: "35bb",
      stacks: [120, 8, 22, 35, 16, 28, 40, 12, 25], pot: "39750",
      itm: { left: 9, paid: 8, places: "領 8 名", money: true },
      facing: "UTG (35bb, mid-stack) open 2x，MP (28bb) call，輪到你",
      hero: ["7d","7c"],
      opts: [
        { id:"fold", label:"Fold", chipEV: -0.2, dollarEV: -1.1, gto: 20, correct: false },
        { id:"raise", label:"Squeeze to 16bb", chipEV: +1.2, dollarEV: +2.4, gto: 80, correct: true, recommend: true },
      ],
      explain: "你是 CL，bubble 上中堆們被 ICM 鎖死。對 UTG open + MP flat 兩位都被你 cover、都怕互撞，你 squeeze 的 fold equity 異常高。即使被 jam back，77 對他們的緊範圍仍可 fold (省下 ICM 損失)。當 CL 的 bubble 是 print money。",
      tags: ["MTT","ICM","Bubble"],
    },
    {
      title: "Heads-Up · ICM 消失，回到 chip-EV",
      stage: "Preflop", pos: "SB", seats: 2,
      blinds: "20000/40000, ante 0", effective: "40bb",
      stacks: [60, 40], pot: "60000",
      itm: { left: 2, paid: 2, places: "冠 vs 亞 · 差 $300k", money: true },
      facing: "你 SB/BTN，對手 BB",
      hero: ["7s","6s"],
      opts: [
        { id:"fold", label:"Fold", chipEV: -1.5, dollarEV: -1.5, gto: 5, correct: false },
        { id:"raise", label:"Open 2.5x", chipEV: +0.6, dollarEV: +0.6, gto: 95, correct: true, recommend: true },
      ],
      explain: "Heads-up 只剩兩人，獎金結構不會再分；chip-EV 與 $EV 重新對齊 (差別只在「贏多少 vs 輸多少」的非線性)。76s 在 SB 必開。不要把 FT 的 ICM 反射延續到 HU — 這裡 aggression 才是王道。",
      tags: ["MTT","ICM","HU"],
    },
  ];

  for (const s of SCN) {
    out.push({
      id: id++, gameType: "MTT", seats: s.seats,
      title: s.title,
      stage: s.stage, position: s.pos,
      blinds: s.blinds, effective: s.effective, pot: s.pot,
      table: tbl(s.seats, s.pos, s.stacks),
      itm: s.itm,
      facing: s.facing,
      hero: s.hero, board: [],
      options: s.opts.map(o => ({
        ...o,
        // legacy `ev` field — keep it readable; use dollarEV scaled for ranking
        ev: Math.round((o.dollarEV != null ? o.dollarEV : o.chipEV) * 100),
        equity: null,
      })),
      explain: s.explain,
      tags: s.tags,
    });
  }

  return out;
}

// 短籌碼 push/fold 表（簡化版，HJ-BTN 12bb）
const PUSH_FOLD_12BB = {
  HJ:  ["22+","A2s+","A8o+","K9s+","KJo+","Q9s+","QJo","J9s+","T9s","98s"],
  CO:  ["22+","A2s+","A5o+","K7s+","KTo+","Q8s+","QJo","J8s+","JTo","T8s+","97s+","87s","76s"],
  BTN: ["22+","A2s+","A2o+","K2s+","K5o+","Q4s+","Q8o+","J6s+","J9o+","T7s+","T9o","97s+","87s","76s","65s"],
  SB:  ["22+","A2s+","A2o+","K2s+","K8o+","Q5s+","Q9o+","J7s+","J9o+","T7s+","T9o","97s+","87s","76s"],
};

// expose
Object.assign(window, {
  HAND_RANKINGS, POSITIONS_9, RFI_RANGES, SCENARIOS, GLOSSARY,
  PUSH_FOLD_12BB, buildPreflopMatrix,
});
