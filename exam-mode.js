/* exam-mode.js — chức năng giải đề JLPT cho quizz.html
   · làm bài theo từng 大問, theo cả phần, hoặc toàn bộ đề
   · đồng hồ đếm lên / đếm ngược theo thời gian chuẩn (tự nộp khi hết giờ)
   · chấm điểm tổng + chi tiết theo từng 大問, xem lại từng câu kèm đoạn văn
   · câu chưa có đáp án: nhập key trực tiếp trong app, lưu trong máy
   Dữ liệu: window.EXAMS / window.EXAM_KEYS_ONLY (sinh bởi import-exam-xlsx-to-js.py) */
(function(){
'use strict';
const { $, show, renderSetup } = window.APP;
const EXAMS = window.EXAMS || [];
const KEYS_ONLY = window.EXAM_KEYS_ONLY || [];
const SKEY = 'jlpt-exam-v1';

/* ================= lưu trữ ================= */
const DEF = { keys:{}, run:null, last:null, ui:{ examId:null, picked:[], timer:'down' }, history:[] };
function load(){
  try{ const r = JSON.parse(localStorage.getItem(SKEY));
       if(r && typeof r === 'object') return { ...DEF, ...r, ui:{ ...DEF.ui, ...(r.ui||{}) } }; }catch(e){}
  return JSON.parse(JSON.stringify(DEF));
}
let D = load();
const save = () => { try{ localStorage.setItem(SKEY, JSON.stringify(D)); }catch(e){} };

/* ================= tiện ích ================= */
const examById = id => EXAMS.find(e => e.id === id) || EXAMS[0];
const allQs = exam => exam.sections.flatMap(s => s.mondais.flatMap(m =>
  m.questions.map(q => ({ ...q, sec:s.key, secName:s.name, mondai:m.key }))));
/* đáp án: ưu tiên đáp án có trong dữ liệu, sau đó là key người dùng tự nhập */
const ansOf = (exam, qid, dataAns) => dataAns || (D.keys[exam.id] || {})[qid] || null;
const fmt = s => {
  s = Math.max(0, Math.round(s));
  const h = Math.floor(s/3600), m = Math.floor(s%3600/60), x = s%60;
  const pad = n => String(n).padStart(2,'0');
  return h ? `${h}:${pad(m)}:${pad(x)}` : `${pad(m)}:${pad(x)}`;
};
const esc = s => String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const nz = a => (a || []).filter(o => o && o.trim());
/* bôi đậm vùng cần điền （　）/＿★＿ hoặc từ được hỏi (importer tính sẵn q.hi) */
function markup(q){
  const t = q.text || '';
  if(!q.hi || !q.hi.length) return esc(t);
  const cls = q.hik === 'word' ? 'target' : 'blank';
  let out = '', last = 0;
  q.hi.forEach(([s, e]) => {
    out += esc(t.slice(last, s)) + `<span class="${cls}">${esc(t.slice(s, e))}</span>`;
    last = e;
  });
  return out + esc(t.slice(last));
}
/* số lựa chọn hiển thị: câu in đủ lựa chọn -> theo mảng; câu nghe/câu hình -> 1..optCount */
const optLabels = q => nz(q.opts).length >= 2 ? nz(q.opts)
  : Array.from({ length: q.optCount || 4 }, (_, i) => '');

/* ================= trang chủ: thẻ chọn đề ================= */
let U = D.ui;
if(!EXAMS.length){
  $('examBody').classList.add('hidden');
  $('examEmpty').classList.remove('hidden');
}
function curExam(){ return examById(U.examId); }
function chips(host, items, isOn, onPick, cls){
  host.innerHTML = '';
  items.forEach(it => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (cls ? ' ' + cls : '');
    b.setAttribute('aria-pressed', isOn(it.val) ? 'true' : 'false');
    b.innerHTML = it.html || it.label;
    b.onclick = () => { onPick(it.val); };
    host.appendChild(b);
  });
}
const pid = (s, m) => s + '|' + m;
function pickedQs(){
  const exam = curExam(), set = new Set(U.picked), out = [];
  exam.sections.forEach(s => s.mondais.forEach(m => {
    if(set.has(pid(s.key, m.key)))
      m.questions.forEach(q => out.push({ ...q, sec:s.key, secName:s.name, mondai:m.key }));
  }));
  return out;
}
function pickedMinutes(){
  const set = new Set(U.picked);
  let t = 0;
  curExam().sections.forEach(s => s.mondais.forEach(m => { if(set.has(pid(s.key, m.key))) t += m.minutes || 0; }));
  return t;
}
function renderCard(){
  if(!EXAMS.length) return;
  const exam = curExam();
  U.examId = exam.id;
  chips($('examList'), EXAMS.map(e => ({ label:esc(e.title), val:e.id })),
        v => v === exam.id, v => { U.examId = v; U.picked = []; save(); renderCard(); });

  const qs = allQs(exam);
  const withAns = qs.filter(q => ansOf(exam, q.qid, q.ans)).length;
  const miss = qs.length - withAns;
  $('examMeta').innerHTML = `<b>${qs.length}</b> câu · <b>${withAns}</b> câu có đáp án` +
    (miss ? ` · <b style="color:var(--accent)">${miss}</b> câu chưa có key (không tính điểm)` : ' · chấm điểm được ngay') +
    (exam.passages && exam.passages.length ? ` · <b>${exam.passages.length}</b> đoạn văn` : '') +
    (exam.source ? `<br><span style="font-weight:500">Nguồn: ${esc(exam.source)}</span>` : '') +
    (KEYS_ONLY.length ? `<br><span style="font-weight:500">Kho đáp án có thêm ${KEYS_ONLY.length} kỳ (${esc(KEYS_ONLY.slice(0,3).map(k=>k.session).join(', '))}…) — thêm file đề của kỳ đó là dùng được ngay.</span>` : '');

  const host = $('mondaiList'); host.innerHTML = '';
  const set = new Set(U.picked);
  exam.sections.forEach(s => {
    const box = document.createElement('div'); box.className = 'msec';
    const nq = s.mondais.reduce((a, m) => a + m.questions.length, 0);
    const allIn = s.mondais.every(m => set.has(pid(s.key, m.key)));
    box.innerHTML = `<div class="mhead">
        <span class="nm jp">${esc(s.name)}</span>
        <span class="mt">${nq} câu · ${s.minutes} phút</span>
        ${s.needAudio ? '<span class="warn">cần file nghe</span>' : ''}
        <button class="pickall" type="button">${allIn ? 'Bỏ chọn cả phần' : 'Chọn cả phần'}</button>
      </div><div class="chips"></div>`;
    box.querySelector('.pickall').onclick = () => {
      s.mondais.forEach(m => { const k = pid(s.key, m.key); allIn ? set.delete(k) : set.add(k); });
      U.picked = [...set]; save(); renderCard();
    };
    chips(box.querySelector('.chips'), s.mondais.map(m => ({
        val: pid(s.key, m.key),
        html: `${esc(m.key)}<small>${m.questions.length} câu · ${m.minutes}p</small>` })),
      v => set.has(v),
      v => { set.has(v) ? set.delete(v) : set.add(v); U.picked = [...set]; save(); renderCard(); },
      'sm');
    host.appendChild(box);
  });

  chips($('timerChips'), [
      { label:`Đếm ngược ${pickedMinutes() || '—'} phút`, val:'down' },
      { label:'Đếm lên (không giới hạn)', val:'up' },
      { label:'Tắt đồng hồ', val:'off' }],
    v => v === U.timer, v => { U.timer = v; save(); renderCard(); });

  const n = pickedQs().length;
  $('examStart').disabled = !n;
  $('examStart').textContent = n ? `Làm ${n} câu đã chọn` : 'Chọn 大問 để làm';
  $('examAll').textContent = `Làm toàn bộ đề (${qs.length} câu)`;
  $('examResume').classList.toggle('hidden', !D.run);
  if(D.run) $('examResume').textContent = `Tiếp tục bài đang làm (câu ${D.run.idx + 1}/${D.run.qs.length})`;
}

/* ================= nhập đáp án ================= */
let keySec = null;
function openKeys(){
  const exam = curExam();
  keySec = keySec && exam.sections.some(s => s.key === keySec) ? keySec : exam.sections[0].key;
  $('keyBox').classList.remove('hidden');
  renderKeys();
  $('keyBox').scrollIntoView({ behavior:'smooth', block:'center' });
}
function renderKeys(){
  const exam = curExam();
  chips($('keySecChips'), exam.sections.map(s => {
      const qs = s.mondais.flatMap(m => m.questions);
      const have = qs.filter(q => ansOf(exam, q.qid, q.ans)).length;
      return { html:`${esc(s.name)}<small>${have}/${qs.length} câu có key</small>`, val:s.key };
    }), v => v === keySec, v => { keySec = v; $('keyText').value = ''; renderKeys(); }, 'sm');
  $('keySecName').textContent = exam.sections.find(s => s.key === keySec).name;
  previewKeys();
}
function secQs(){
  const sec = curExam().sections.find(s => s.key === keySec);
  return sec.mondais.flatMap(m => m.questions);
}
/* nhận "3 4 1 2" (theo thứ tự câu trong phần) hoặc "1:3 2.4 3-1" (theo số câu in trên đề) */
function parseKeys(raw){
  const qs = secQs(), out = {};
  const pairs = [...raw.matchAll(/(\d+)\s*[:.\-)=]\s*([1-4])(?![0-9])/g)];
  if(pairs.length){
    pairs.forEach(([, no, a]) => {
      const q = qs.find(x => String(x.no) === String(Number(no)));
      if(q) out[q.qid] = Number(a);
    });
    return out;
  }
  (raw.match(/[1-4]/g) || []).forEach((a, i) => { if(qs[i]) out[qs[i].qid] = Number(a); });
  return out;
}
function previewKeys(){
  const n = Object.keys(parseKeys($('keyText').value)).length, tot = secQs().length;
  $('keyPreview').innerHTML = n
    ? `Đọc được <b>${n}/${tot}</b> đáp án cho phần này.` + (n < tot ? ' Các câu còn lại giữ nguyên.' : '')
    : 'Chưa đọc được đáp án nào từ ô trên.';
}
$('keyText').oninput = previewKeys;
$('keySave').onclick = () => {
  const exam = curExam(), parsed = parseKeys($('keyText').value);
  if(!Object.keys(parsed).length) return;
  D.keys[exam.id] = { ...(D.keys[exam.id] || {}), ...parsed };
  save(); $('keyText').value = ''; renderKeys(); renderCard();
  if(D.last && D.last.examId === exam.id){ R = D.last; grade(); show('examResult'); }
};
$('keyClear').onclick = () => {
  const exam = curExam();
  if(!confirm('Xoá đáp án bạn đã nhập cho phần này?')) return;
  const kill = new Set(secQs().map(q => q.qid)), keep = {};
  Object.entries(D.keys[exam.id] || {}).forEach(([k, v]) => { if(!kill.has(k)) keep[k] = v; });
  D.keys[exam.id] = keep; save(); renderKeys(); renderCard();
};
$('keyClose').onclick = () => $('keyBox').classList.add('hidden');
$('examKeyBtn').onclick = openKeys;

/* ================= làm bài ================= */
let R = null, tid = null;
function startRun(qs, label, minutes){
  if(!qs.length) return;
  R = { examId:curExam().id, label, qs, answers:{}, flags:{}, idx:0, elapsed:0,
        mode:U.timer, limit:(U.timer === 'down' ? Math.max(1, minutes) * 60 : 0), paused:false };
  persist(); show('exam'); renderQ(); startTimer();
}
function persist(){ D.run = R; save(); }
function startTimer(){ stopTimer(); paintTimer(); if(R.mode !== 'off') tid = setInterval(tick, 1000); }
function stopTimer(){ if(tid){ clearInterval(tid); tid = null; } }
function tick(){
  if(!R || R.paused) return;
  R.elapsed++;
  if(R.mode === 'down' && R.limit && R.elapsed >= R.limit){ paintTimer(); submit(true); return; }
  paintTimer();
  if(R.elapsed % 5 === 0) persist();
}
function paintTimer(){
  const el = $('exTimer');
  el.classList.toggle('hidden', R.mode === 'off');
  if(R.mode === 'off') return;
  const left = R.mode === 'down' ? Math.max(0, R.limit - R.elapsed) : R.elapsed;
  el.textContent = (R.paused ? '⏸ ' : '') + fmt(left);
  el.classList.toggle('low', R.mode === 'down' && left <= 60);
  el.classList.toggle('paused', R.paused);
}
$('exTimer').onclick = () => { if(!R || R.mode === 'off') return; R.paused = !R.paused; paintTimer(); persist(); };

function renderQ(){
  const exam = examById(R.examId), q = R.qs[R.idx];
  $('exTitle').textContent = exam.title;
  $('exSub').textContent = `${R.label} · câu ${R.idx + 1}/${R.qs.length} · đã làm ${Object.keys(R.answers).length}`;
  $('exTrack').style.width = ((R.idx + 1) / R.qs.length * 100) + '%';

  const pal = $('exPalette'); pal.innerHTML = '';
  R.qs.forEach((x, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pal' + (i === R.idx ? ' cur' : (R.answers[x.qid] ? ' done' : '')) + (R.flags[x.qid] ? ' flag' : '');
    b.textContent = x.no || (i + 1);
    b.title = `${x.secName} ${x.mondai}`;
    b.onclick = () => { R.idx = i; renderQ(); };
    pal.appendChild(b);
  });
  // trên điện thoại bảng số câu cuộn ngang -> kéo ô đang làm vào giữa tầm nhìn
  if(pal.scrollWidth > pal.clientWidth + 4){
    const cur = pal.querySelector('.pal.cur');
    if(cur) requestAnimationFrame(() => cur.scrollIntoView({block:'nearest', inline:'center', behavior:'smooth'}));
  }

  const pbox = $('exPassage'), pg = (q.p !== undefined && exam.passages[q.p]) ? exam.passages[q.p] : null;
  pbox.classList.toggle('hidden', !pg);
  if(pg){ $('exPTitle').textContent = 'Đoạn văn: ' + (pg.title || ''); $('exPText').textContent = pg.text; }

  $('exNo').textContent = q.no ? '問 ' + q.no : '#' + (R.idx + 1);
  $('exMondai').textContent = `${q.secName} · ${q.mondai}`;
  $('exFlag').setAttribute('aria-pressed', R.flags[q.qid] ? 'true' : 'false');
  $('exText').innerHTML = q.text ? markup(q) : '(nội dung câu hỏi nằm trong đề gốc / file nghe)';

  const labels = optLabels(q);
  $('exNoAudio').classList.toggle('hidden', !q.blank);
  if(q.blank) $('exNoAudio').textContent =
    `Đề in không có lựa chọn cho câu này (câu nghe / câu hình) — chọn số 1–${labels.length} theo file nghe.`;
  const host = $('exOpts'); host.innerHTML = '';
  labels.forEach((o, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'opt jp' + (R.answers[q.qid] === i + 1 ? ' sel' : '');
    b.innerHTML = `<span class="k n">${i+1}</span><span>${o ? esc(o) : '<span style="color:var(--text-3)">lựa chọn ' + (i+1) + '</span>'}</span>`;
    b.onclick = () => pick(i + 1);
    host.appendChild(b);
  });
  $('exPrev').disabled = R.idx === 0;
  $('exNext').textContent = R.idx === R.qs.length - 1 ? 'Câu cuối' : 'Câu sau →';
}
function pick(n){
  const q = R.qs[R.idx];
  R.answers[q.qid] === n ? delete R.answers[q.qid] : R.answers[q.qid] = n;   // bấm lại để bỏ chọn
  persist(); renderQ();
}
$('exPrev').onclick = () => { if(R.idx > 0){ R.idx--; renderQ(); } };
$('exNext').onclick = () => { if(R.idx < R.qs.length - 1){ R.idx++; renderQ(); } };
$('exFlag').onclick = () => {
  const q = R.qs[R.idx];
  R.flags[q.qid] ? delete R.flags[q.qid] : R.flags[q.qid] = 1;
  persist(); renderQ();
};
$('exQuit').onclick = () => { stopTimer(); persist(); renderSetup(); renderCard(); show('setup'); };
$('exSubmit').onclick = () => {
  const left = R.qs.length - Object.keys(R.answers).length;
  if(left && !confirm(`Còn ${left} câu chưa chọn. Nộp bài luôn?`)) return;
  submit(false);
};
$('examResume').onclick = () => {
  if(!D.run) return;
  R = D.run; U.examId = R.examId; save();
  show('exam'); renderQ(); startTimer();
};
$('examStart').onclick = () => {
  const set = new Set(U.picked), exam = curExam();
  const names = exam.sections.flatMap(s => s.mondais.filter(m => set.has(pid(s.key, m.key)))
    .map(m => `${s.name} ${m.key}`));
  startRun(pickedQs(), names.length > 2 ? `${names.length} 大問` : names.join(' + '), pickedMinutes());
};
$('examAll').onclick = () => {
  const exam = curExam();
  U.picked = exam.sections.flatMap(s => s.mondais.map(m => pid(s.key, m.key)));
  save();
  startRun(allQs(exam), 'Toàn bộ đề', exam.sections.reduce((a, s) => a + s.minutes, 0));
};

/* ================= chấm điểm ================= */
function submit(auto){
  stopTimer();
  R.done = true; R.finishedAt = R.elapsed;
  D.last = R; D.run = null;
  D.history.unshift({ examId:R.examId, label:R.label, n:R.qs.length, elapsed:R.elapsed });
  D.history = D.history.slice(0, 30);
  save(); grade(); show('examResult');
  if(auto) setTimeout(() => alert('Hết giờ! Bài đã được nộp tự động.'), 60);
}
function grade(){
  const exam = examById(R.examId);
  const groups = [];                      // chấm riêng từng 大問
  let correct = 0, graded = 0, answered = 0;
  R.qs.forEach(q => {
    const key = `${q.secName} ${q.mondai}`;
    let g = groups.find(x => x.key === key);
    if(!g) groups.push(g = { key, total:0, graded:0, correct:0, answered:0 });
    const ans = ansOf(exam, q.qid, q.ans), mine = R.answers[q.qid];
    g.total++;
    if(mine){ g.answered++; answered++; }
    if(ans){
      g.graded++; graded++;
      if(mine === ans){ g.correct++; correct++; }
    }
  });
  const pct = graded ? Math.round(correct / graded * 100) : 0;
  $('erRing').style.setProperty('--p', pct);
  $('erPct').textContent = graded ? pct + '%' : '—';
  $('erTitle').textContent = !graded ? 'Chưa có đáp án để chấm'
    : pct >= 80 ? 'Tuyệt vời! 合格ライン' : pct >= 60 ? 'Khá ổn, cần luyện thêm' : 'Cần ôn lại kỹ hơn';
  $('erDesc').textContent = (graded ? `Đúng ${correct}/${graded} câu · ` : 'Bấm "Nhập đáp án" để dán key rồi chấm lại · ')
    + `làm ${answered}/${R.qs.length} câu · thời gian ${fmt(R.finishedAt || R.elapsed)}`
    + (graded < R.qs.length ? ` · ${R.qs.length - graded} câu chưa có đáp án` : '');

  const gh = $('erMondais'); gh.innerHTML = '';
  groups.forEach(g => {
    const p = g.graded ? Math.round(g.correct / g.graded * 100) : 0;
    const el = document.createElement('div');
    el.className = 'mres';
    el.innerHTML = `<div class="top"><span class="nm jp">${esc(g.key)}</span>
        <span class="sc" style="color:${g.graded ? (p >= 60 ? 'var(--ok)' : 'var(--bad)') : 'var(--text-3)'}">
        ${g.graded ? g.correct + '/' + g.graded : '—'}</span></div>
      <div class="bar"><i style="width:${p}%"></i></div>
      <div class="sub">${g.graded ? p + '% · ' : 'chưa có đáp án · '}làm ${g.answered}/${g.total} câu</div>`;
    gh.appendChild(el);
  });

  const rv = $('erReview'); rv.innerHTML = '';
  R.qs.forEach(q => {
    const ans = ansOf(exam, q.qid, q.ans), mine = R.answers[q.qid];
    const state = !ans ? 'na' : (mine === ans ? 'ok' : 'no');
    const d = document.createElement('details');
    d.className = 'ritem';
    const opts = optLabels(q).map((o, k) => {
      const cls = [ans === k + 1 ? 'right' : '', mine === k + 1 ? 'mine' : ''].join(' ').trim();
      return `<li class="${cls}">${o ? esc(o) : 'lựa chọn ' + (k+1)}` +
             `${ans === k + 1 ? ' ← đáp án' : ''}${mine === k + 1 ? ' (bạn chọn)' : ''}</li>`;
    }).join('');
    const pg = (q.p !== undefined && exam.passages[q.p]) ? exam.passages[q.p] : null;
    d.innerHTML = `<summary>
        <span class="mark ${state}">${state === 'ok' ? '✓' : state === 'no' ? '✕' : '?'}</span>
        <span class="badge">${esc(q.mondai)}</span>
        <span class="q jp">${esc(q.no ? '問' + q.no + '. ' : '')}${esc((q.text || '').slice(0, 60))}</span>
        <span class="pick">${mine || '—'}${ans ? ' / ' + ans : ''}</span>
      </summary>
      <div class="body jp">${pg ? `<div style="font-size:13px;color:var(--text-3);font-weight:700;margin-bottom:6px">${esc(pg.title)}</div><div style="white-space:pre-wrap;margin-bottom:8px">${esc(pg.text)}</div>` : ''}
        <div style="white-space:pre-wrap">${markup(q)}</div>
        <ol>${opts}</ol>
        ${q.note ? `<div style="font-size:12.5px;color:var(--text-3);margin-top:8px">${esc(q.note)}</div>` : ''}
        ${!ans ? '<div class="noans" style="margin-top:10px">Câu này chưa có đáp án — nhập key để chấm.</div>' : ''}
      </div>`;
    rv.appendChild(d);
  });
  return { correct, graded, answered, groups, pct };
}
$('erHome').onclick = () => { renderSetup(); renderCard(); show('setup'); };
$('erAgain').onclick = () => startRun(R.qs, R.label, Math.round((R.limit || 60) / 60));
$('erWrong').onclick = () => {
  const exam = examById(R.examId);
  const bad = R.qs.filter(q => { const a = ansOf(exam, q.qid, q.ans); return a && R.answers[q.qid] !== a; });
  if(!bad.length) return;
  startRun(bad, 'Câu sai · ' + R.label, Math.max(1, Math.round(bad.length * 1.5)));
};
$('erKey').onclick = () => { renderSetup(); show('setup'); openKeys(); };

/* ================= bàn phím ================= */
document.addEventListener('keydown', e => {
  if(!R || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if($('exam').classList.contains('hidden')) return;
  if(/^[1-4]$/.test(e.key)){ const b = $('exOpts').children[+e.key - 1]; if(b) b.click(); }
  else if(e.key === 'ArrowLeft') $('exPrev').click();
  else if(e.key === 'ArrowRight' || e.key === 'Enter') $('exNext').click();
  else if(e.key.toLowerCase() === 'f') $('exFlag').click();
});

/* ================= khởi động ================= */
renderCard();
window.EXAM_MODE = { get R(){ return R; }, get D(){ return D; }, get U(){ return U; },
                     renderCard, startRun, submit, grade, parseKeys, pickedQs, allQs, curExam, fmt, tick };
})();
