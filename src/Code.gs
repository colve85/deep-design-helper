/**********************************************************************
 * Code.gs — 웹앱 진입점과 설정값
 *
 * 배포: 배포 > 새 배포 > 웹 앱
 *   실행 사용자: 웹 앱에 액세스하는 사용자 (교사마다 자기 API 키를 쓰게 하려면)
 *   액세스 권한: 필요한 범위로
 **********************************************************************/

var APP_TITLE   = '깊이 있는 수업·평가 설계 도우미';
var APP_VERSION = '2.3.0';
var DEFAULT_MODEL = 'gemini-2.5-flash';

/** 한글 문서를 드라이브에 저장할 때 사용할 폴더 이름 */
var DRIVE_FOLDER = '수업설계_한글문서';

/**
 * 제작 표기. 화면 왼쪽 아래, 사용 안내 창, 한글 문서 끝에 함께 쓰인다.
 * 다른 학교·다른 분이 쓰실 때는 이 세 줄만 고치면 된다.
 */
var APP_CREDIT = {
  training: '2026 전북형 깊이 있는 수업·평가 설계 연수',
  author:   '연수 자료 한윤석(성당중학교),                            설계 도구 제작  인월고등학교 유경현',
  doc:      '2026 전북형 깊이 있는 수업·평가 설계 연수 · 설계 도구 제작 인월고등학교 유경현'
};

function doGet(e) {
  var t = HtmlService.createTemplateFromFile('Index');
  t.appTitle = APP_TITLE;
  t.appVersion = APP_VERSION;
  return t.evaluate()
    .setTitle(APP_TITLE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Index.html 안에서 Style.html / Script.html 을 끼워 넣을 때 사용 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/** 모든 과목의 단원을 하나의 배열로 합친다. 과목을 추가하려면 여기에 덧붙인다. */
function getAllUnits_() {
  return [].concat(UNITS_COMMON_MATH_1, UNITS_COMMON_MATH_2);
}

function getSubjects_() {
  var units = getAllUnits_(), seen = {}, out = [];
  for (var i = 0; i < units.length; i++) {
    if (!seen[units[i].subject]) { seen[units[i].subject] = true; out.push(units[i].subject); }
  }
  return out;
}

function getUnitById_(id) {
  var units = getAllUnits_();
  for (var i = 0; i < units.length; i++) if (units[i].id === id) return units[i];
  return null;
}

function todayStr_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Seoul', 'yyyy. M. d.');
}

/**
 * 실행 환경 이름. Apps Script 에서는 'gas',
 * Node(Vercel·로컬 개발 서버)에서는 lib/gas-runtime.js 가 넣어 준 값이 쓰인다.
 * 화면은 이 값으로 드라이브 저장·API 키 보관 방식을 구별한다.
 */
function runtimeName_() {
  return (typeof GAS_RUNTIME_OVERRIDE !== 'undefined') ? GAS_RUNTIME_OVERRIDE : 'gas';
}
