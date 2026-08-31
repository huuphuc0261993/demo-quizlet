/* =====================================================================
   LUYỆN ĐẶT CÂU THEO NGỮ PHÁP · dùng chung dữ liệu G / GROUPS của 基本文法.html
   3 dạng bài:
     order = sắp xếp các cụm từ thành câu đúng
     fill  = điền mẫu ngữ pháp vào chỗ trống
     mean  = chọn ý nghĩa đúng của mẫu ngữ pháp
   ===================================================================== */
(function () {
'use strict';

/* ---------- Cụm từ (bunsetsu) của từng câu ví dụ · dùng cho bài sắp xếp ---------- */
const CHUNKS = {
'ご飯を食べてから、勉強します。':['ご飯を','食べてから、','勉強します。'],
'今、日本語を勉強しています。':['今、','日本語を','勉強しています。'],
'ここに名前を書いてください。':['ここに','名前を','書いてください。'],
'私は先生に日本語を教えてもらいました。':['私は','先生に','日本語を','教えてもらいました。'],
'友達が宿題を手伝ってくれました。':['友達が','宿題を','手伝ってくれました。'],
'私は友達に日本語を教えてあげました。':['私は','友達に','日本語を','教えてあげました。'],
'ここで写真を撮ってはいけません。':['ここで','写真を','撮ってはいけません。'],
'休みの日は、映画を見たり、ゲームをしたりします。':['休みの日は、','映画を','見たり、','ゲームを','したりします。'],
'早く寝た方がいいです。':['早く','寝た方が','いいです。'],
'日本へ行ったことがあります。':['日本へ','行ったことが','あります。'],
'雨が降ったら、家に帰ります。':['雨が','降ったら、','家に','帰ります。'],
'時間があれば、映画を見ます。':['時間が','あれば、','映画を','見ます。'],
'明日、会社へ行かないといけません。':['明日、','会社へ','行かないと','いけません。'],
'お酒を飲みすぎない方がいいです。':['お酒を','飲みすぎない方が','いいです。'],
'明日は会社へ行かなくてもいいです。':['明日は','会社へ','行かなくても','いいです。'],
'ここでタバコを吸わないでください。':['ここで','タバコを','吸わないでください。'],
'寝る時、電気を消します。':['寝る時、','電気を','消します。'],
'寝る前に、歯を磨きます。':['寝る前に、','歯を','磨きます。'],
'仕事が終わった後、友達とご飯を食べます。':['仕事が','終わった後、','友達と','ご飯を','食べます。'],
'これは私が作った料理です。':['これは','私が','作った','料理です。'],
'これは昨日買ったかばんです。':['これは','昨日','買った','かばんです。'],
'あそこにいる人は私の友達です。':['あそこに','いる','人は','私の','友達です。'],
'日本で働いている人です。':['日本で','働いている','人です。'],
'昨日食べたケーキはおいしかったです。':['昨日','食べた','ケーキは','おいしかったです。'],
'もう一度説明していただけませんか。':['もう一度','説明して','いただけませんか。'],
'一緒に勉強しましょう。':['一緒に','勉強しましょう。'],
'日本で働くために、日本語を勉強しています。':['日本で','働くために、','日本語を','勉強しています。'],
'この店は安いし、おいしいし、人気があります。':['この店は','安いし、','おいしいし、','人気が','あります。'],
'雨が降っても、行きます。':['雨が','降っても、','行きます。'],
'来年、日本へ行くつもりです。':['来年、','日本へ','行くつもりです。'],
'お酒を飲まないつもりです。':['お酒を','飲まないつもりです。'],
'来週、日本へ行く予定です。':['来週、','日本へ','行く','予定です。'],
'日本語をもっと勉強しようと思います。':['日本語を','もっと','勉強しようと','思います。'],
'毎日、日本語を勉強するようにしています。':['毎日、','日本語を','勉強するように','しています。'],
'夜、遅く寝ないようにしています。':['夜、','遅く','寝ないように','しています。'],
'先生に毎日勉強するように言われました。':['先生に','毎日','勉強するように','言われました。'],
'医者にお酒を飲まないように言われました。':['医者に','お酒を','飲まないように','言われました。'],
};

/* ---------- Phần cần che trong câu ví dụ · dùng cho bài điền mẫu ---------- */
const KEYS = {
1:'てから', 2:'ています', 3:'てください', 4:'てもらいました', 5:'てくれました', 6:'てあげました',
7:'てはいけません', 8:'たり', 9:'た方がいい', 10:'たことが', 11:'たら', 12:'れば',
13:'ないといけません', 14:'ない方がいい', 15:'なくてもいい', 16:'ないでください',
17:'時', 18:'前に', 19:'後', 21:'ていただけませんか', 22:'ましょう', 23:'ために',
24:'し、', 25:'ても', 26:'つもりです', 27:'予定です', 28:'ようと思います',
29:'ようにしています', 30:'ように言われました',
};

const TYPES = [
  { val:'order', label:'Sắp xếp câu' },
  { val:'fill',  label:'Điền mẫu' },
  { val:'mean',  label:'Chọn ý nghĩa' },
];
const TYPE_LABEL = Object.fromEntries(TYPES.map(t => [t.val, t.label]));
const SIZES = [{ val:5, label:'5 câu' }, { val:10, label:'10 câu' }, { val:20, label:'20 câu' }, { val:0, label:'Tất cả' }];
const LSQ = 'kihon-bunpou-quiz';
const MASK = '＿＿＿';

/* ---------- Tiện ích ---------- */
const shuffle = a => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;[r[i], r[j]] = [r[j], r[i]]; } return r; };
const q$ = id => document.getElementById(id);

/* ---------- Trạng thái ---------- */
let S = { group:'all', types:['order','fill','mean'], size:10, qs:[], i:0, score:0, wrong:[], picked:null, slot:[], checked:false };

/* ---------- Tạo bộ câu hỏi ---------- */
function buildPool() {
  const src = G.filter(g => S.group === 'all' || g.g === S.group);
  const pool = [];
  src.forEach(g => {
    if (S.types.includes('mean')) pool.push({ t:'mean', g:g, e:g.ex[0] });
    g.ex.forEach(e => {
      if (S.types.includes('order') && CHUNKS[e.ja] && CHUNKS[e.ja].length > 2) pool.push({ t:'order', g:g, e:e });
      if (S.types.includes('fill') && KEYS[g.no] && e.ja.includes(KEYS[g.no])) pool.push({ t:'fill', g:g, e:e });
    });
  });
  const all = shuffle(pool);
  return S.size > 0 ? all.slice(0, S.size) : all;
}

/* 3 đáp án nhiễu: ưu tiên mẫu cùng nhóm cho khó hơn */
function distractors(g, key) {
  const same = shuffle(G.filter(x => x.no !== g.no && x.g === g.g && x[key] !== g[key]));
  const other = shuffle(G.filter(x => x.no !== g.no && x.g !== g.g && x[key] !== g[key]));
  return same.concat(other).slice(0, 3);
}

/* ---------- Vẽ câu hỏi ---------- */
function optionsHtml(items, correctIdx) {
  return '<div class="q-opts">' + items.map((txt, i) =>
    '<button class="opt" data-opt="' + i + '" data-ok="' + (i === correctIdx ? '1' : '0') + '">'
    + '<span class="k">' + 'ABCD'[i] + '</span><span class="t">' + txt + '</span></button>').join('') + '</div>';
}

function questionHtml(q) {
  if (q.t === 'order') {
    const toks = shuffle(CHUNKS[q.e.ja]);
    return '<div class="q-vn">' + esc(q.e.vn) + '</div>'
      + '<div class="q-hint">Sắp xếp các cụm từ thành câu tiếng Nhật đúng · gợi ý mẫu: <b class="jp">' + q.g.pat + '</b></div>'
      + '<div class="q-slot" id="qSlot"></div>'
      + '<div class="q-pool" id="qPool">' + toks.map((t, i) =>
        '<button class="tok jp" data-tok="' + i + '">' + esc(t) + '</button>').join('') + '</div>';
  }
  if (q.t === 'fill') {
    const opts = shuffle([q.g].concat(distractors(q.g, 'pat')));
    q._ok = opts.findIndex(x => x.no === q.g.no);
    const masked = esc(q.e.ja).split(KEYS[q.g.no]).join('<span class="blank">' + MASK + '</span>');
    return '<div class="q-sentence jp">' + masked + '</div>'
      + '<div class="q-vn sub">' + esc(q.e.vn) + '</div>'
      + '<div class="q-hint">Chọn mẫu ngữ pháp đúng cho chỗ trống</div>'
      + optionsHtml(opts.map(x => '<span class="jp">' + x.pat + '</span>'), q._ok);
  }
  const opts = shuffle([q.g].concat(distractors(q.g, 'mean')));
  q._ok = opts.findIndex(x => x.no === q.g.no);
  return '<div class="q-sentence jp">' + q.g.pat + '</div>'
    + '<div class="q-vn sub jp">' + esc(q.g.form) + '</div>'
    + '<div class="q-hint">Mẫu ngữ pháp này có ý nghĩa gì?</div>'
    + optionsHtml(opts.map(x => esc(x.mean)), q._ok);
}

function renderQ() {
  const q = S.qs[S.i];
  S.picked = null; S.slot = []; S.checked = false;
  q$('qMeta').innerHTML = '<span class="q-type">' + TYPE_LABEL[q.t] + '</span>'
    + '<span>Câu ' + (S.i + 1) + '/' + S.qs.length + '</span>'
    + '<span class="sc">' + S.score + ' đúng</span>';
  q$('qBar').style.width = (S.i / S.qs.length * 100) + '%';
  q$('qBody').innerHTML = questionHtml(q);
  q$('qFb').innerHTML = ''; q$('qFb').className = 'q-fb hidden';
  q$('qAct').innerHTML = '<button class="btn" id="qCheck" disabled>Kiểm tra</button>'
    + '<button class="btn ghost" id="qSkip">Bỏ qua</button>';
  q$('qCheck').onclick = check;
  q$('qSkip').onclick = () => { S.checked = true; reveal(false, true); };
  if (q.t === 'order') syncOrder();
}

/* ---------- Bài sắp xếp: chọn / bỏ cụm từ ---------- */
function syncOrder() {
  const slot = q$('qSlot');
  slot.innerHTML = S.slot.length
    ? S.slot.map((t, i) => '<button class="tok jp in" data-un="' + i + '">' + esc(t.txt) + '</button>').join('')
    : '<span class="q-ph">Bấm vào các cụm từ bên dưới để ghép câu…</span>';
  q$('qPool').querySelectorAll('[data-tok]').forEach(b => {
    b.classList.toggle('used', S.slot.some(x => x.id === +b.dataset.tok));
  });
  q$('qCheck').disabled = S.slot.length === 0;
}

/* ---------- Chấm bài ---------- */
function check() {
  if (S.checked) return;
  const q = S.qs[S.i];
  let ok;
  if (q.t === 'order') ok = S.slot.map(x => x.txt).join('') === q.e.ja;
  else ok = S.picked === q._ok;
  S.checked = true;
  reveal(ok, false);
}

function reveal(ok, skipped) {
  const q = S.qs[S.i];
  if (ok) S.score++; else S.wrong.push(q);
  q$('qMeta').querySelector('.sc').textContent = S.score + ' đúng';
  q$('qBar').style.width = ((S.i + 1) / S.qs.length * 100) + '%';
  if (q.t !== 'order') {
    q$('qBody').querySelectorAll('.opt').forEach(b => {
      if (b.dataset.ok === '1') b.classList.add('ok');
      else if (+b.dataset.opt === S.picked) b.classList.add('bad');
      b.disabled = true;
    });
  } else {
    q$('qPool').querySelectorAll('.tok').forEach(b => b.disabled = true);
    q$('qSlot').querySelectorAll('.tok').forEach(b => b.disabled = true);
    q$('qSlot').classList.add(ok ? 'ok' : 'bad');
  }
  const fb = q$('qFb');
  fb.className = 'q-fb ' + (ok ? 'ok' : 'bad');
  fb.innerHTML = '<div class="hd">' + (ok ? '✓ Chính xác!' : (skipped ? '→ Đáp án đúng' : '✗ Chưa đúng')) + '</div>'
    + '<div class="ans">'
    + '<button class="play" data-say="' + esc(q.e.kana || q.e.ja) + '" data-ex="qFbEx" title="Nghe câu này">' + PLAY_SVG + '</button>'
    + '<div><div class="ja jp">' + q.e.ja + '</div>'
    + '<div class="kana jp">' + esc(q.e.kana || '') + '</div>'
    + '<div class="vn">' + esc(q.e.vn) + '</div></div></div>'
    + '<div class="pat"><b class="jp">' + q.g.pat + '</b> · ' + esc(q.g.mean)
    + ' <button class="lnk" data-open="' + q.g.no + '">Xem chi tiết mẫu ' + q.g.no + '</button></div>';
  fb.id = 'qFb';
  q$('qAct').innerHTML = '<button class="btn" id="qNext">'
    + (S.i + 1 < S.qs.length ? 'Câu tiếp theo →' : 'Xem kết quả') + '</button>';
  q$('qNext').onclick = next;
  q$('qNext').focus();
}

function next() {
  S.i++;
  if (S.i >= S.qs.length) finish(); else renderQ();
}

/* ---------- Kết quả ---------- */
function finish() {
  q$('quizPlay').classList.add('hidden');
  q$('quizDone').classList.remove('hidden');
  const pct = Math.round(S.score / S.qs.length * 100);
  let best = 0;
  try { best = JSON.parse(localStorage.getItem(LSQ) || '{}').best || 0; } catch (_) {}
  if (pct > best) { best = pct; try { localStorage.setItem(LSQ, JSON.stringify({ best: best })); } catch (_) {} }
  const msg = pct === 100 ? 'Hoàn hảo! 🎉' : pct >= 80 ? 'Rất tốt! 👏' : pct >= 50 ? 'Khá ổn, ôn thêm chút nhé.' : 'Cần luyện thêm, cố lên! 💪';
  q$('quizDone').innerHTML = '<div class="card-title">Kết quả</div>'
    + '<div class="res"><div class="big">' + S.score + '<span>/' + S.qs.length + '</span></div>'
    + '<div><div class="pct">' + pct + '%</div><div class="msg">' + msg + '</div>'
    + '<div class="hint">Điểm cao nhất: ' + best + '%</div></div></div>'
    + (S.wrong.length ? '<div class="res-wrong"><div class="lb">Câu sai (' + S.wrong.length + ')</div>'
      + S.wrong.map(w => '<button class="sum-row" data-open="' + w.g.no + '">'
        + '<span class="n">' + w.g.no + '</span><span class="p jp">' + w.g.pat + '</span>'
        + '<span class="m">' + esc(w.e.vn) + '</span></button>').join('') + '</div>' : '')
    + '<div class="q-act">'
    + (S.wrong.length ? '<button class="btn" id="qRetryWrong">Làm lại câu sai</button>' : '')
    + '<button class="btn' + (S.wrong.length ? ' ghost' : '') + '" id="qAgain">Làm bộ mới</button>'
    + '<button class="btn ghost" id="qBack">Đổi thiết lập</button></div>';
  q$('qAgain').onclick = () => start();
  q$('qBack').onclick = () => { q$('quizDone').classList.add('hidden'); q$('quizSetup').classList.remove('hidden'); };
  if (S.wrong.length) q$('qRetryWrong').onclick = () => start(shuffle(S.wrong));
}

/* ---------- Bắt đầu ---------- */
function start(preset) {
  const qs = preset || buildPool();
  if (!qs.length) { alert('Không có câu hỏi phù hợp. Hãy chọn thêm dạng bài hoặc nhóm khác.'); return; }
  S.qs = qs; S.i = 0; S.score = 0; S.wrong = [];
  q$('quizSetup').classList.add('hidden');
  q$('quizDone').classList.add('hidden');
  q$('quizPlay').classList.remove('hidden');
  renderQ();
  q$('quizPlay').scrollIntoView({ behavior:'smooth', block:'start' });
}

/* ---------- Thiết lập ---------- */
function renderSetup() {
  const chips = (host, items, isOn, pick) => {
    host.innerHTML = '';
    items.forEach(it => {
      const b = document.createElement('button');
      b.className = 'chip'; b.type = 'button'; b.textContent = it.label;
      b.setAttribute('aria-pressed', isOn(it.val) ? 'true' : 'false');
      b.onclick = () => { pick(it.val); renderSetup(); };
      host.appendChild(b);
    });
  };
  chips(q$('qGroup'), GROUPS, v => v === S.group, v => S.group = v);
  chips(q$('qTypes'), TYPES, v => S.types.includes(v), v => {
    S.types = S.types.includes(v) ? S.types.filter(x => x !== v) : S.types.concat(v);
    if (!S.types.length) S.types = [v];
  });
  chips(q$('qSize'), SIZES, v => v === S.size, v => S.size = v);
  q$('qCount').textContent = 'Có ' + buildPool.total() + ' câu hỏi khả dụng với thiết lập này.';
}
buildPool.total = function () {
  const keep = S.size; S.size = 0;
  const n = buildPool().length; S.size = keep; return n;
};

/* ---------- Sự kiện ---------- */
document.addEventListener('click', e => {
  const tok = e.target.closest('[data-tok]');
  if (tok && !tok.disabled) {
    const id = +tok.dataset.tok;
    if (!S.slot.some(x => x.id === id)) { S.slot.push({ id: id, txt: tok.textContent }); syncOrder(); }
    return;
  }
  const un = e.target.closest('[data-un]');
  if (un && !un.disabled) { S.slot.splice(+un.dataset.un, 1); syncOrder(); return; }
  const opt = e.target.closest('[data-opt]');
  if (opt && !opt.disabled) {
    S.picked = +opt.dataset.opt;
    document.querySelectorAll('.opt').forEach(b => b.classList.toggle('sel', b === opt));
    q$('qCheck').disabled = false;
    return;
  }
  const open = e.target.closest('[data-open]');
  if (open) {
    setMode('study');
    const t = q$('g' + open.dataset.open);
    if (t) { t.scrollIntoView({ behavior:'smooth', block:'start' }); t.classList.add('flash'); setTimeout(() => t.classList.remove('flash'), 1400); }
  }
});

/* phím tắt: A-D / 1-4 chọn đáp án · Enter kiểm tra hoặc câu tiếp theo */
document.addEventListener('keydown', e => {
  if (q$('quizPlay').classList.contains('hidden') || e.target.tagName === 'INPUT') return;
  if (e.key === 'Enter') {
    const n = q$('qNext'), c = q$('qCheck');
    if (n) { e.preventDefault(); next(); } else if (c && !c.disabled) { e.preventDefault(); check(); }
    return;
  }
  const i = 'abcd'.indexOf(e.key.toLowerCase()) >= 0 ? 'abcd'.indexOf(e.key.toLowerCase()) : '1234'.indexOf(e.key);
  if (i >= 0 && !S.checked) {
    const b = q$('qBody').querySelector('[data-opt="' + i + '"]');
    if (b) b.click();
  }
});

/* ---------- Chuyển chế độ Học ↔ Luyện tập ---------- */
function setMode(m) {
  q$('studyWrap').classList.toggle('hidden', m !== 'study');
  q$('quizWrap').classList.toggle('hidden', m !== 'quiz');
  q$('modeSw').querySelectorAll('button').forEach(b =>
    b.setAttribute('aria-pressed', b.dataset.mode === m ? 'true' : 'false'));
  if (m === 'quiz') renderSetup();
}
q$('modeSw').addEventListener('click', e => {
  const b = e.target.closest('[data-mode]');
  if (b) setMode(b.dataset.mode);
});
q$('qStart').onclick = () => start();
})();
