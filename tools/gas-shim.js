/**
 * gas-shim.js — Node 에서 Apps Script 전역(Utilities 등)을 흉내내어
 * src/*.gs 를 그대로 실행할 수 있게 한다. 테스트 전용.
 */
const fs = require('fs');
const zlib = require('zlib');
const vm = require('vm');
const path = require('path');

function Blob(bytes, type, name) { this._b = Buffer.from(bytes); this._t = type; this._n = name; }
Blob.prototype.getBytes = function () {
  const a = []; for (const v of this._b) a.push(v > 127 ? v - 256 : v); return a;
};
Blob.prototype.getName = function () { return this._n; };
Blob.prototype.setName = function (n) { this._n = n; return this; };
Blob.prototype.setContentType = function (t) { this._t = t; return this; };
Blob.prototype.getDataAsString = function () { return this._b.toString('utf8'); };

function toBuf(x) {
  if (x instanceof Blob) return x._b;
  if (typeof x === 'string') return Buffer.from(x, 'utf8');
  return Buffer.from(x.map(v => (v < 0 ? v + 256 : v)));
}

/** STORE/DEFLATE 를 모두 읽는 최소 zip 리더 */
function unzipEntries(buf) {
  const out = []; let i = 0;
  while (i + 4 <= buf.length && buf.readUInt32LE(i) === 0x04034b50) {
    const method = buf.readUInt16LE(i + 8);
    const csize = buf.readUInt32LE(i + 18);
    const nlen = buf.readUInt16LE(i + 26);
    const elen = buf.readUInt16LE(i + 28);
    const name = buf.slice(i + 30, i + 30 + nlen).toString('utf8');
    const start = i + 30 + nlen + elen;
    let data = buf.slice(start, start + csize);
    if (method === 8) data = zlib.inflateRawSync(data);
    out.push(new Blob(data, 'application/octet-stream', name));
    i = start + csize;
  }
  return out;
}

const Utilities = {
  base64Decode: s => {
    const b = Buffer.from(s, 'base64'); const a = [];
    for (const v of b) a.push(v > 127 ? v - 256 : v);
    return a;
  },
  base64Encode: b => toBuf(b).toString('base64'),
  newBlob: (d, t, n) => new Blob(toBuf(d), t, n),
  ungzip: b => new Blob(zlib.gunzipSync(toBuf(b)), 'application/zip', 'x'),
  unzip: b => unzipEntries(toBuf(b)),
  formatDate: (d, tz, fmt) => {
    const dt = d instanceof Date ? d : new Date();
    return dt.getFullYear() + '. ' + (dt.getMonth() + 1) + '. ' + dt.getDate() + '.';
  }
};

const GAS_FILES = ['Code.gs', 'Stages.gs', 'UnitsCommonMath1.gs', 'UnitsCommonMath2.gs',
                   'HwpxTemplate.gs', 'Hwpx.gs', 'DocBuilder.gs', 'Api.gs'];

function loadContext() {
  const ctx = vm.createContext({
    Utilities, console, Blob,
    Session: { getScriptTimeZone: () => 'Asia/Seoul', getActiveUser: () => ({ getEmail: () => '' }) },
    PropertiesService: {
      getUserProperties: () => ({ getProperty: () => null, setProperty: () => {}, deleteProperty: () => {} }),
      getScriptProperties: () => ({ getProperty: () => null })
    },
    HtmlService: { createTemplateFromFile: () => ({ evaluate: () => ({}) }) },
    DriveApp: {}, UrlFetchApp: {}, Logger: { log: console.log }
  });
  const src = path.join(__dirname, '..', 'src');
  for (const f of GAS_FILES) {
    vm.runInContext(fs.readFileSync(path.join(src, f), 'utf8'), ctx, { filename: f });
  }
  return ctx;
}

module.exports = { loadContext, Utilities, Blob, GAS_FILES };
