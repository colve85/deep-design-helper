#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {loadContext} = require('../lib/gas-runtime');
const c = loadContext();
assert.equal(c.getSubjects_().length, 21);
assert.equal(c.getAllUnits_().length, 127);
assert.equal(c.UNITS_EXTENDED_MATH.length, 35);
assert.equal(c.UNITS_OFFICIAL_MATH.length, 74);
assert.equal(c.UNITS_OFFICIAL_MATH.reduce((n,u)=>n+u.officialContentElements.length,0),194);
assert(c.UNITS_OFFICIAL_MATH.some(u=>u.subject==='중학교 수학'));
assert(c.UNITS_OFFICIAL_MATH.some(u=>u.subject==='전문 수학'));
assert(c.UNITS_OFFICIAL_MATH.every(u=>u.standardStatus==='official-source-linked'));
assert(c.UNITS_OFFICIAL_MATH.every(u=>u.officialContentElements.length>=1));
for (const u of c.UNITS_EXTENDED_MATH) {
  assert.equal(u.standardStatus, 'draft');
  assert(u.standards.every(s=>s.code.includes('교사 재구성')));
  assert.deepEqual(Array.from(new Set(u.lessons.map(l=>l.phase))), Array.from(c.LESSON_PHASES));
  assert(u.ex.task.includes('교사용 예상 결과'));
  const result=c.api_checkAlignment({stages:{0:u.ex,1:u.ex,2:u.ex,3:u.ex},lessons:u.lessons});
  assert.equal(result.items.find(i=>i.area==='루브릭 수준').level,'ok');
  const prompt=c.api_buildPrompt({stageId:2,meta:{subject:u.subject,unit:u.name,standards:u.standards},stages:{0:u.ex,1:u.ex},lessons:u.lessons});
  assert(prompt.includes(u.subject));
  assert(prompt.includes('공식 성취기준 원문'));
}
// Regression: workbook's complete 3-level rubric passes; incomplete versions do not.
for (const [rubric, expected] of [['우수: 설명 보통: 계산 미흡: 표시','ok'],['매우 우수: 설명 우수: 계산 보통: 표시 향상 필요: 관찰','ok'],['우수: 설명 보통: 계산','warn']]) {
  const result=c.api_checkAlignment({stages:{2:{rubric}},lessons:[]});
  assert.equal(result.items.find(i=>i.area==='루브릭 수준').level,expected);
}
// Execute the actual frontend functions with a minimal DOM to test data flow.
const nodes={};
function node(id){return nodes[id]||(nodes[id]={value:'',innerHTML:'',textContent:'',classList:{add(){},remove(){},toggle(){}}});}
const ui=vm.createContext({window:{addEventListener(){}},document:{getElementById:node,querySelectorAll(){return[];}},console,setTimeout(){},clearTimeout(){},localStorage:{getItem(){return null;},setItem(){}},confirm(){return true;}});
const script=fs.readFileSync(path.join(__dirname,'../src/Script.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
vm.runInContext(script,ui);
ui.BOOT=c.api_bootstrap();
ui.render=function(){};
ui.save=function(){};
const a=c.UNITS_EXTENDED_MATH[0],b=c.UNITS_EXTENDED_MATH[6];
ui.state.unitId=a.id;
ui.state.stages[0].bigIdea='기본수학 작성 내용';
ui.state.lessons=[a.lessons[0]];
node('selUnit').value=b.id;
ui.onUnitChange();
assert.equal(ui.state.lessons.length,0);
assert.equal(ui.state.stages[0].bigIdea,undefined);
ui.state.stages[0].bigIdea='대수 작성 내용';
node('selUnit').value=a.id;ui.onUnitChange();
assert.equal(ui.state.stages[0].bigIdea,'기본수학 작성 내용');
assert.equal(ui.state.lessons.length,1);
ui.renderStandards();
node('stdEdit').value='TEST-01 | 직접 입력한 기준의 검증용 문장';
node('stdApply').onclick();
assert.equal(ui.selectedStandards(a)[0].code,'TEST-01');
const req=ui.buildRequest(2,'stage');
assert.equal(req.meta.standards[0].code,'TEST-01');
const payload=ui.designPayload();
assert.equal(payload.meta.standards[0].code,'TEST-01');
assert(c.api_buildPrompt(req).includes('직접 입력한 기준의 검증용 문장'));
assert(JSON.stringify(c.buildDesignBlocks_(payload)).includes('직접 입력한 기준의 검증용 문장'));
const saved=JSON.parse(JSON.stringify(ui.state));
assert.equal(saved.standardOverrides[a.id][0].code,'TEST-01');
assert.equal(saved.unitDrafts[b.id].stages[0].bigIdea,'대수 작성 내용');
// Representative answer checks, independent calculations.
assert.equal(2*(12-2*2)**2,128);
assert.equal(90/(90+180),1/3);
assert.equal(Math.ceil(24*1.1/1.5),18);
assert.equal([0,1,3,3].reduce((a,b)=>a+b)/4,1.75);
console.log('확장 검증 통과: 21과목군·127단원, 공식 74영역·194내용요소, 루브릭, 과목 전환, 성취기준→프롬프트·문서·저장');
