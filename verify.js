#!/usr/bin/env node
/**
 * verify.js — 배포 전 점검
 *
 *   node tools/verify.js
 *
 *  1) 모든 .gs / .html 파일의 구문 검사
 *  2) 단원 데이터 무결성 (필수 필드, 단계 정의와의 대응, 내용 요소)
 *  3) 모든 단원에 대해 한글 문서 생성이 성공하는지
 *  4) 프롬프트 생성과 정합성 점검 동작
 *
 *  실패하면 0이 아닌 종료 코드를 돌려준다. (GitHub Actions 에서 사용)
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadContext, renderIndex, handleApi } = require('../lib/gas-runtime');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
let failed = 0;
function ok(msg) { console.log('  ✓ ' + msg); }
function bad(msg) { console.error('  ✗ ' + msg); failed++; }
function section(t) { console.log('\n' + t); }

/* 1. 구문 검사 --------------------------------------------------- */
section('1. 구문 검사');
for (const f of fs.readdirSync(SRC)) {
  const p = path.join(SRC, f);
  const text = fs.readFileSync(p, 'utf8');
  try {
    if (f.endsWith('.gs')) {
      new vm.Script(text, { filename: f });
      ok(f);
    } else if (f.endsWith('.html')) {
      const scripts = text.match(/<script>([\s\S]*?)<\/script>/g) || [];
      scripts.forEach((s, i) => {
        new vm.Script(s.replace(/^<script>/, '').replace(/<\/script>$/, ''),
                      { filename: f + '#' + i });
      });
      ok(f + (scripts.length ? ' (script ' + scripts.length + '개)' : ''));
    }
  } catch (e) {
    bad(f + ' — ' + e.message);
  }
}

/* 2. 데이터 무결성 ----------------------------------------------- */
section('2. 단원 데이터');
const ctx = loadContext();
const units = ctx.getAllUnits_();
const stages = ctx.STAGES;
const lessonKeys = ctx.LESSON_COLUMNS.map(c => c.key);

const ids = {};
let lessonCount = 0;
units.forEach(u => {
  const where = u.subject + '/' + u.name;
  if (!u.id) bad(where + ' — id 없음');
  if (ids[u.id]) bad('중복 id: ' + u.id);
  ids[u.id] = 1;
  if (!u.standards || !u.standards.length) bad(where + ' — 성취기준 없음');
  stages.forEach(st => st.fields.forEach(f => {
    if (!u.ex[f.key] || !String(u.ex[f.key]).trim()) bad(where + ' — ex.' + f.key + ' 비어 있음');
  }));
  if (!u.lessons || u.lessons.length < 2) bad(where + ' — 내용 요소가 2개 미만');
  (u.lessons || []).forEach((L, i) => {
    lessonCount++;
    lessonKeys.forEach(k => {
      if (!L[k] || !String(L[k]).trim()) bad(where + ' — lessons[' + i + '].' + k + ' 비어 있음');
    });
    if (L.phase && ctx.LESSON_PHASES.indexOf(L.phase) < 0) {
      bad(where + ' — lessons[' + i + '].phase 값이 목록에 없음: ' + L.phase);
    }
  });
});
if (!failed) ok(units.length + '개 단원 · ' +
  units.reduce((a, u) => a + u.standards.length, 0) + '개 성취기준 · ' +
  lessonCount + '개 내용 요소');
ok('과목: ' + ctx.getSubjects_().join(', '));

/* 3. 한글 문서 생성 ---------------------------------------------- */
section('3. 한글 문서 생성');
let docFail = 0, sample = null;
units.forEach(u => {
  const design = {
    meta: { school: '인월고등학교', teacher: '교사', subject: u.subject, area: u.area,
            unit: u.name, grade: '1학년', periods: '4차시', standards: u.standards },
    stages: { 0: u.ex, 1: u.ex, 2: u.ex, 3: u.ex },
    lessons: u.lessons
  };
  design.alignment = ctx.api_checkAlignment(design);
  try {
    const out = ctx.api_makeHwpx(design);
    if (!out.b64 || out.b64.length < 1000) throw new Error('결과가 너무 작음');
    if (!sample) sample = out;
  } catch (e) {
    docFail++; bad(u.name + ' — ' + e.message);
  }
});
if (!docFail) ok(units.length + '개 단원 모두 생성 성공 (예: ' + sample.name + ')');
if (process.env.WRITE_SAMPLE && sample) {
  fs.writeFileSync(path.join(ROOT, process.env.WRITE_SAMPLE), Buffer.from(sample.b64, 'base64'));
  ok('샘플 저장: ' + process.env.WRITE_SAMPLE);
}

/* 4. 프롬프트 · 점검 --------------------------------------------- */
section('4. 프롬프트와 정합성 점검');
const u0 = units[0];
const req = {
  stageId: 2,
  meta: { subject: u0.subject, area: u0.area, unit: u0.name, standards: u0.standards, periods: '4차시' },
  stages: { 0: u0.ex, 1: u0.ex },
  lessons: u0.lessons
};
const p = ctx.api_buildPrompt(req);
if (p.indexOf('앞 단계에서 교사가 이미 작성한 내용') < 0) bad('프롬프트에 앞 단계 내용이 포함되지 않음');
else ok('단계 프롬프트 ' + p.length + '자, 앞 단계 내용 포함');

const lp = ctx.api_buildLessonPrompt(req);
if (lp.indexOf('JSON 배열만') < 0) bad('소재 프롬프트 형식 지시 누락');
else ok('소재 프롬프트 ' + lp.length + '자');

const parsed = ctx.parseModelJson_('```json\n{"task":"가","evidence":"나"}\n```', false);
if (!parsed || parsed.task !== '가') bad('모델 응답 파싱 실패');
else ok('모델 응답 파싱');

const arr = ctx.parseModelJson_('여기 있습니다:\n[{"element":"가"}]', true);
if (!arr || !arr.length) bad('배열 응답 파싱 실패');
else ok('배열 응답 파싱');

const good = ctx.api_checkAlignment({
  stages: { 0: u0.ex, 1: u0.ex, 2: u0.ex, 3: u0.ex }, lessons: u0.lessons });
const empty = ctx.api_checkAlignment({ stages: {}, lessons: [] });
if (good.score <= empty.score) bad('정합성 점수가 내용에 반응하지 않음 (' + good.score + ' vs ' + empty.score + ')');
else ok('정합성 점검: 채워진 설계 ' + good.score + '% / 빈 설계 ' + empty.score + '%');

/* 5. Node 배포(Vercel·개발 서버) 경로 ----------------------------- */
section('5. Node 배포 경로');
(async function () {
  const nodeCtx = loadContext('vercel');
  if (nodeCtx.api_bootstrap().runtime !== 'vercel') bad('runtime 값이 전달되지 않음');
  else ok('runtime 구분 전달');

  const html = renderIndex(nodeCtx);
  if (html.indexOf('<?') >= 0) bad('Apps Script 템플릿 문법이 남아 있음');
  else if (html.indexOf('window.google') < 0) bad('google.script.run 어댑터가 주입되지 않음');
  else ok('화면 렌더 ' + Math.round(html.length / 1024) + 'KB');

  const boot = await handleApi(nodeCtx, { fn: 'api_bootstrap', args: [] });
  if (!boot.result || !boot.result.units) bad('api_bootstrap 중계 실패');
  else ok('api_bootstrap 중계');

  const doc = await handleApi(nodeCtx, {
    fn: 'api_makeHwpx',
    args: [{ meta: { subject: u0.subject, unit: u0.name, standards: u0.standards },
             stages: { 0: u0.ex, 1: u0.ex, 2: u0.ex, 3: u0.ex }, lessons: u0.lessons }]
  });
  if (!doc.result || !doc.result.b64) bad('한글 문서 중계 실패');
  else ok('한글 문서 중계 ' + Math.round(doc.result.b64.length / 1024) + 'KB');

  const drive = await handleApi(nodeCtx, { fn: 'api_saveHwpxToDrive', args: [{}] });
  if (!drive.error) bad('Apps Script 전용 기능이 차단되지 않음');
  else ok('Apps Script 전용 기능 안내 처리');

  const noKey = await handleApi(nodeCtx, { fn: 'api_generate', args: [{ kind: 'stage', stageId: 0, meta: {} }] });
  if (!noKey.result || noKey.result.error !== 'NO_KEY') bad('키 없을 때 처리 실패');
  else ok('키 없을 때 붙여넣기 모드 안내');

  /* 결과 --------------------------------------------------------- */
  console.log('');
  if (failed) { console.error('실패 ' + failed + '건'); process.exit(1); }
  console.log('모든 점검을 통과했습니다.');
})();
