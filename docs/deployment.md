# 배포 안내

## 1. 프로젝트 만들기

### 편집기에 직접 붙여넣는 경우

1. [script.google.com](https://script.google.com) → **새 프로젝트**
2. 프로젝트 이름을 알아보기 쉽게 바꿉니다. (예: `깊이있는수업평가설계`)
3. `src/` 안의 파일을 같은 이름으로 만들어 내용을 붙여넣습니다.

   | 저장소 파일 | 편집기에서 만들 때 |
   |---|---|
   | `Code.gs`, `Stages.gs`, `UnitsCommonMath1.gs`, `UnitsCommonMath2.gs`, `Api.gs`, `DocBuilder.gs`, `Hwpx.gs`, `HwpxTemplate.gs` | **＋ → 스크립트**, 이름에서 `.gs`는 자동으로 붙습니다 |
   | `Index.html`, `Style.html`, `Script.html` | **＋ → HTML**, 이름은 확장자 없이 `Index`, `Style`, `Script` |

   처음 만들어져 있는 `Code.gs`는 내용을 지우고 이 저장소의 `Code.gs` 내용을 넣으면 됩니다.

4. `appsscript.json`은 **프로젝트 설정 → "appsscript.json" 매니페스트 파일을 편집기에 표시**를
   켜면 편집할 수 있습니다. 켜지 않고 넘어가도 동작합니다.

### clasp 를 쓰는 경우

```bash
npm install -g @google/clasp
clasp login
clasp create --type webapp --title "깊이 있는 수업·평가 설계 도우미"
# 만들어진 .clasp.json 의 scriptId 를 확인하고, rootDir 을 "src" 로 둡니다
clasp push
clasp deploy
```

`.clasp.json.example`을 `.clasp.json`으로 복사해 `scriptId`만 채워도 됩니다.
`.clasp.json`은 `.gitignore`에 들어 있어 저장소에 올라가지 않습니다.

---

## 2. 웹 앱으로 배포

**배포 → 새 배포 → 유형 선택: 웹 앱**

| 항목 | 권장 값 | 이유 |
|---|---|---|
| 실행 사용자 | **웹 앱에 액세스하는 사용자** | 교사마다 자기 Gemini 키와 자기 드라이브를 쓰게 됩니다 |
| 액세스 권한 | 조직 내 모든 사용자 | 연수 참여자에게 링크만 주면 됩니다 |

배포 후 나오는 웹 앱 URL을 공유하면 됩니다.

> Google Workspace 계정이 아닌 개인 계정이라면 `appsscript.json`의
> `webapp.access`가 `DOMAIN`으로 되어 있을 때 배포가 되지 않습니다.
> 편집기 배포 화면에서 액세스 권한을 직접 고르거나, 매니페스트의 값을 바꿔 주세요.

---

## 3. 권한

처음 실행할 때 권한 승인 화면이 나옵니다.

| 권한 | 쓰이는 곳 | 없어도 되나 |
|---|---|---|
| 외부 서비스 연결 (`script.external_request`) | Gemini API 호출 | 붙여넣기 모드만 쓴다면 필요 없음 |
| Google Drive | `[드라이브에 저장]` 대체 내려받기 | `Api.gs`의 `api_saveHwpxToDrive` 를 지우면 요청되지 않음 |

브라우저에서 바로 내려받기가 되는 환경이라면 드라이브 권한은 쓰이지 않습니다.
학교 크롬 정책으로 저장이 막힐 때를 대비한 대체 경로입니다.

---

## 4. Gemini API 키

- 웹앱의 **설정**에서 키를 넣으면 **사용자 속성(UserProperties)** 에 저장됩니다.
  실행 사용자를 "웹 앱에 액세스하는 사용자"로 배포했다면 교사마다 자기 키를 씁니다.
- 학교에서 공용 키 하나를 쓰려면 Apps Script **프로젝트 설정 → 스크립트 속성**에
  `GEMINI_API_KEY`(필요하면 `GEMINI_MODEL`)를 추가합니다. 사용자 키가 없을 때 이 값이 쓰입니다.
- 모델명 기본값은 `Code.gs`의 `DEFAULT_MODEL`입니다. 사용하는 모델명이 다르면 설정에서 바꾸세요.

키가 없어도 **붙여넣기 모드**로 모든 기능을 쓸 수 있습니다.

---

## 5. 점검

- 편집기에서 `test_makeHwpx` 함수를 실행하면 한글 문서 생성이 정상인지 실행 로그로 확인할 수 있습니다.
- 저장소에서는 `node tools/verify.js` 로 전체를 점검합니다.

---

## 6. 자주 묻는 것

**내려받기 버튼을 눌렀는데 파일이 저장되지 않습니다.**
브라우저나 조직 정책이 스크립트가 시작한 저장을 막는 경우입니다.
하단의 **[드라이브에 저장]** 을 누르면 내 드라이브 `수업설계_한글문서` 폴더에 저장한 뒤 링크를 줍니다.

**작성 중이던 내용이 사라졌습니다.**
브라우저 임시저장(localStorage)에 자동으로 보관되지만, 시크릿 창이나 사이트 데이터 삭제 시에는
남지 않습니다. 중요한 설계안은 **JSON 내보내기**로 파일로 보관하세요.

**AI가 준 결과를 가져오지 못합니다.**
모델이 설명 문장을 함께 낸 경우입니다. `{`로 시작해 `}`로 끝나는 부분(소재 제안은 `[` ~ `]`)만
붙여 넣어 보세요.
