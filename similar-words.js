/* =====================================================================
   similar-words.js — chọn đáp án nhiễu (distractor) GẦN GIỐNG đáp án đúng
   Mục tiêu học: các âm dễ lẫn nhau (きゅ / きゅう / きょ / きょう /
   ちょ / ちょう / ちゅう / しょ / しゅう / せい / しん ...) phải xuất hiện
   cùng nhau trong 4 lựa chọn, thay vì 3 đáp án ngẫu nhiên khác hoàn toàn.

   API dùng ở index.html:
     SimWords.pick({ target, ansKey, pools, count })  -> [word, word, word]
     SimWords.score(a, b, ansKey)                     -> điểm giống nhau
   ===================================================================== */
(function (global) {
  'use strict';

  /* ---------------- bảng kana: phụ âm (đã gộp hữu thanh) + nguyên âm ---------------- */
  // c = nhóm phụ âm (か/が cùng nhóm 'k'), v = nguyên âm, d = có dakuten/handakuten
  const KANA = {};
  const ROWS = [
    ['', 'あいうえお', 0], ['', 'ぁぃぅぇぉ', 0],
    ['k', 'かきくけこ', 0], ['k', 'がぎぐげご', 1],
    ['s', 'さしすせそ', 0], ['s', 'ざじずぜぞ', 1],
    ['t', 'たちつてと', 0], ['t', 'だぢづでど', 1],
    ['n', 'なにぬねの', 0],
    ['h', 'はひふへほ', 0], ['h', 'ばびぶべぼ', 1], ['h', 'ぱぴぷぺぽ', 2],
    ['m', 'まみむめも', 0],
    ['r', 'らりるれろ', 0],
    ['w', 'わゐ　ゑを', 0], ['k', 'ゕ　　ゖ　', 0]
  ];
  const VOW = ['a', 'i', 'u', 'e', 'o'];
  for (const [c, chars, d] of ROWS) {
    [...chars].forEach((ch, i) => { if (ch !== '　') KANA[ch] = { c, v: VOW[i], d }; });
  }
  // hàng や: や=ya, ゆ=yu, よ=yo (+ dạng nhỏ)
  [['や', 'a'], ['ゆ', 'u'], ['よ', 'o'], ['ゃ', 'a'], ['ゅ', 'u'], ['ょ', 'o']]
    .forEach(([ch, v]) => KANA[ch] = { c: 'y', v, d: 0 });
  const SMALL_Y = 'ゃゅょ';
  const SMALL_V = 'ぁぃぅぇぉ';

  const toHira = s => String(s || '').replace(/[ァ-ヶ]/g, m =>
    String.fromCharCode(m.charCodeAt(0) - 0x60));

  /* ---------------- tách kana thành mora ---------------- */
  // mỗi mora: {c, v, y (có âm ghép ゃゅょ), sp (ん/っ/ー), len (âm kéo dài)}
  const moraCache = new Map();
  function moras(kana) {
    const key = kana || '';
    if (moraCache.has(key)) return moraCache.get(key);
    const s = toHira(key), out = [];
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === 'ん') { out.push({ sp: 'n' }); continue; }
      if (ch === 'っ') { out.push({ sp: 'q' }); continue; }
      if (ch === 'ー') { out.push({ sp: '-', len: true }); continue; }
      const base = KANA[ch];
      if (!base) { out.push({ sp: ch }); continue; }
      const nx = s[i + 1];
      // き + ゅ -> 1 mora (c='k', v='u', y=true)
      if (nx && (SMALL_Y.includes(nx) || SMALL_V.includes(nx))) {
        const sm = KANA[nx];
        out.push({ c: base.c, v: sm ? sm.v : base.v, d: base.d, y: SMALL_Y.includes(nx) });
        i++; continue;
      }
      const prev = out[out.length - 1];
      // う/い ngay sau nguyên âm cùng loại = âm kéo dài (こう, せい) -> đánh dấu len
      const isLong = prev && !prev.sp &&
        ((ch === 'う' && (prev.v === 'o' || prev.v === 'u')) ||
         (ch === 'い' && (prev.v === 'e' || prev.v === 'i')));
      out.push({ c: base.c, v: base.v, d: base.d, len: !!isLong });
    }
    moraCache.set(key, out);
    return out;
  }

  /* ---------------- khoảng cách giữa 2 mora ---------------- */
  // càng nhỏ = càng dễ nhầm. 0 = trùng khít.
  function subCost(a, b) {
    if (a.sp || b.sp) {
      if (a.sp && b.sp) return a.sp === b.sp ? 0 : .5;   // ん vs っ vẫn khá giống
      return .8;
    }
    let cost = 0;
    if (a.c !== b.c) cost += (a.v === b.v) ? .55 : 1;    // khác phụ âm nhưng cùng nguyên âm -> vẫn dễ nhầm
    else if (a.v !== b.v) cost += .3;                     // きゅ vs きょ
    if (a.c === b.c && a.v === b.v && !!a.y !== !!b.y) cost += .3;  // き vs きゃ
    else if (!!a.y !== !!b.y) cost += .12;
    if (a.d !== b.d) cost += .15;                         // き vs ぎ
    return Math.min(cost, 1);
  }
  // thêm/bớt 1 mora: âm kéo dài (う, い, ー, っ, ん) rất dễ bỏ sót -> rẻ
  const gapCost = m => (m.len || m.sp) ? .22 : .9;

  /* ---------------- độ giống nhau của cách đọc (0..1) ---------------- */
  function kanaSim(k1, k2) {
    const A = moras(k1), B = moras(k2);
    if (!A.length || !B.length) return 0;
    let prev = A.map((_, i) => i ? 0 : 0);
    // Levenshtein có trọng số
    prev = [0];
    for (let j = 1; j <= B.length; j++) prev[j] = prev[j - 1] + gapCost(B[j - 1]);
    for (let i = 1; i <= A.length; i++) {
      const cur = [prev[0] + gapCost(A[i - 1])];
      for (let j = 1; j <= B.length; j++) {
        cur[j] = Math.min(
          prev[j - 1] + subCost(A[i - 1], B[j - 1]),
          prev[j] + gapCost(A[i - 1]),
          cur[j - 1] + gapCost(B[j - 1])
        );
      }
      prev = cur;
    }
    const dist = prev[B.length], norm = Math.max(A.length, B.length);
    let sim = 1 - dist / norm;
    // cùng số mora + cùng phụ âm đầu -> nhìn/đọc rất giống, cộng thêm
    if (A.length === B.length) sim += .06;
    if (!A[0].sp && !B[0].sp && A[0].c === B[0].c) sim += .06;
    const la = A[A.length - 1], lb = B[B.length - 1];
    if ((la.len || la.sp) && (lb.len || lb.sp)) sim += .04;   // cùng kết thúc bằng âm dài / ん
    return Math.max(0, Math.min(1, sim));
  }

  /* ---------------- độ giống nhau của mặt chữ (Dice trên bigram + ký tự chung) ---------------- */
  function textSim(a, b) {
    a = String(a || ''); b = String(b || '');
    if (!a || !b) return 0;
    const setA = new Set([...a]), setB = new Set([...b]);
    let shared = 0; setA.forEach(c => { if (setB.has(c)) shared++; });
    const charSim = 2 * shared / (setA.size + setB.size);
    const bi = s => { const o = []; for (let i = 0; i < s.length - 1; i++) o.push(s.slice(i, i + 2)); return o; };
    const bA = bi(a), bB = new Set(bi(b));
    let hit = 0; bA.forEach(g => { if (bB.has(g)) hit++; });
    const biSim = (bA.length + bB.size) ? 2 * hit / (bA.length + bB.size) : 0;
    let sim = .6 * charSim + .4 * biSim;
    if (a.length === b.length) sim += .1;
    if (a[0] === b[0]) sim += .08;                            // cùng chữ Hán đầu: 生活 / 生産
    if (a[a.length - 1] === b[b.length - 1]) sim += .08;      // cùng chữ Hán cuối: 就職 / 退職
    return Math.max(0, Math.min(1, sim));
  }

  /* ---------------- độ giống nhau của nghĩa tiếng Việt (theo từ) ---------------- */
  const tok = s => String(s || '').toLowerCase()
    .replace(/[(),.;/·]/g, ' ').split(/\s+/).filter(Boolean);
  function meanSim(a, b) {
    const A = tok(a), B = new Set(tok(b));
    if (!A.length || !B.size) return 0;
    let hit = 0; A.forEach(w => { if (B.has(w)) hit++; });
    return 2 * hit / (A.length + B.size);
  }

  /* ---------------- nghĩa quá trùng nhau -> câu hỏi mất đáp án duy nhất ---------------- */
  function meanAmbiguous(a, b) {
    const x = String(a || '').toLowerCase().trim(), y = String(b || '').toLowerCase().trim();
    if (!x || !y) return false;
    if (x === y) return true;
    if (x.includes(y) || y.includes(x)) return true;         // "đi" vs "đi bộ"
    return meanSim(x, y) >= .7;
  }

  /* ---------------- điểm tổng: ưu tiên giống ở mặt đang được hỏi/đáp ---------------- */
  const W = {
    kana:  { kana: 3.4, kanji: .8, mean: .2 },   // đáp án là cách đọc -> âm phải sát nhất
    kanji: { kana: 1.8, kanji: 2.4, mean: .2 },  // đáp án là chữ Hán -> mặt chữ + âm
    mean:  { kana: 2.4, kanji: 1.6, mean: .4 }   // đáp án là nghĩa -> lấy nghĩa của từ ĐỌC/VIẾT giống
  };
  function score(a, b, ansKey) {
    const w = W[ansKey] || W.mean;
    return w.kana * kanaSim(a.kana, b.kana)
         + w.kanji * textSim(a.kanji, b.kanji)
         + w.mean * meanSim(a.mean, b.mean);
  }

  /* ---------------- chọn distractor ----------------
     pools: mảng các mảng từ, ưu tiên giảm dần (nhóm đang học -> danh sách -> toàn bộ)
     Lấy top ứng viên giống nhất rồi random trong đó để câu hỏi không lặp y nguyên. */
  function pick(o) {
    const target = o.target, ansKey = o.ansKey, count = o.count || 3;
    const pools = (o.pools || []).filter(p => p && p.length);
    const rankedAll = [], seenNo = new Set([target.no]), seenAns = new Set([target[ansKey]]);
    pools.forEach((pool, depth) => {
      for (const c of pool) {
        if (seenNo.has(c.no) || seenAns.has(c[ansKey])) continue;
        if (ansKey === 'mean' && meanAmbiguous(target.mean, c.mean)) continue;
        if (ansKey !== 'mean' && c[ansKey] === target[ansKey]) continue;
        seenNo.add(c.no);
        rankedAll.push({ c, s: score(target, c, ansKey) + (depth === 0 ? .45 : 0) });
      }
    });
    rankedAll.sort((x, y) => y.s - x.s);

    const out = [], used = new Set();
    // cửa sổ nhỏ quanh nhóm giống nhất -> vẫn sát âm nhưng có xáo trộn
    const win = Math.min(rankedAll.length, Math.max(count + 3, count * 2));
    const top = rankedAll.slice(0, win);
    while (out.length < count && top.length) {
      const i = Math.floor(Math.random() * top.length);
      const it = top.splice(i, 1)[0];
      if (used.has(it.c[ansKey])) continue;
      used.add(it.c[ansKey]); out.push(it.c);
    }
    // thiếu (danh sách quá nhỏ) -> lấy tiếp theo thứ tự giống nhất
    for (let i = win; out.length < count && i < rankedAll.length; i++) {
      const c = rankedAll[i].c;
      if (used.has(c[ansKey])) continue;
      used.add(c[ansKey]); out.push(c);
    }
    return out;
  }

  global.SimWords = { pick, score, kanaSim, textSim, meanSim, meanAmbiguous, moras };
})(typeof window !== 'undefined' ? window : globalThis);
