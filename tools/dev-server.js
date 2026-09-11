#!/usr/bin/env node
/**
 * dev-server.js — 브라우저에서 웹앱을 그대로 열어 보는 개발 서버
 *
 *   node tools/dev-server.js          → http://localhost:8080
 *   PORT=3000 node tools/dev-server.js
 *
 * Apps Script 에 올리지 않고도 화면과 서버 함수를 함께 시험할 수 있다.
 * google.script.run 호출은 /api 로 중계되어 src/*.gs 의 함수를 실제로 실행한다.
 * (Gemini 호출과 드라이브 저장은 Apps Script 환경에서만 동작한다.)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { loadContext } = require('./gas-shim');

const SRC = path.join(__dirname, '..', 'src');
const PORT = process.env.PORT || 8080;
const ctx = loadContext();

const SHIM = `
<script>
window.google = { script: { run: (function make(state){
  state = state || {};
  return new Proxy({}, { get: function(_, k){
    if (typeof k !== 'string' || k === 'then' || k === 'toJSON') return undefined;
    if (k === 'withSuccessHandler')
      return function(f){ return make({ s:f, f:state.f }); };
    if (k === 'withFailureHandler')
      return function(f){ return make({ s:state.s, f:f }); };
    return function(){
      var args = Array.prototype.slice.call(arguments);
      fetch('/api', { method:'POST', headers:{'Content-Type':'application/json'},
                      body: JSON.stringify({ fn:k, args:args }) })
        .then(function(r){ return r.json(); })
        .then(function(j){ if (j.error) { if (state.f) state.f(new Error(j.error)); }
                           else if (state.s) state.s(j.result); })
        .catch(function(e){ if (state.f) state.f(e); });
    };
  }});
})() } };
</script>`;

function renderIndex() {
  let html = fs.readFileSync(path.join(SRC, 'Index.html'), 'utf8');
  html = html.replace(/<\?=\s*appTitle\s*\?>/g, ctx.APP_TITLE);
  html = html.replace(/<\?=\s*appVersion\s*\?>/g, ctx.APP_VERSION);
  html = html.replace(/<\?!=\s*include\('([^']+)'\);?\s*\?>/g, function (_, name) {
    const part = fs.readFileSync(path.join(SRC, name + '.html'), 'utf8');
    return name === 'Script' ? SHIM + part : part;
  });
  return html;
}

http.createServer(function (req, res) {
  if (req.method === 'POST' && req.url === '/api') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', function () {
      let out;
      try {
        const { fn, args } = JSON.parse(body);
        if (typeof ctx[fn] !== 'function') throw new Error('없는 함수: ' + fn);
        out = { result: ctx[fn].apply(null, args) };
      } catch (e) {
        out = { error: e.message };
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(out));
    });
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(renderIndex());
}).listen(PORT, function () {
  console.log('개발 서버 실행 중 → http://localhost:' + PORT);
});
