/**********************************************************************
 * Code.gs — 웹앱 진입점과 설정값
 *
 * 배포: 배포 > 새 배포 > 웹 앱
 *   실행 사용자: 웹 앱에 액세스하는 사용자 (교사마다 자기 API 키를 쓰게 하려면)
 *   액세스 권한: 필요한 범위로
 **********************************************************************/

var APP_TITLE   = '깊이 있는 수업·평가 설계 도우미';
var APP_VERSION = '2.1.0';
var DEFAULT_MODEL = 'gemini-2.5-flash';

/** 한글 문서를 드라이브에 저장할 때 사용할 폴더 이름 */
var DRIVE_FOLDER = '수업설계_한글문서';

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
