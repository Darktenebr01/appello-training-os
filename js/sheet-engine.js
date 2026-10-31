/* Lightweight spreadsheet formula engine. No eval(), no network, no external
   libraries. Supports ranges, arithmetic, comparisons, and the functions used
   by the training templates. */
(function () {
  'use strict';

  const ERR = {
    VALUE: { __error: '#VALUE!' },
    REF: { __error: '#REF!' },
    DIV0: { __error: '#DIV/0!' },
    NAME: { __error: '#NAME?' },
    NA: { __error: '#N/A' },
    CYCLE: { __error: '#CYCLE!' },
    NUM: { __error: '#NUM!' }
  };

  function isErr(v) { return v && typeof v === 'object' && v.__error; }
  function colToIndex(col) {
    let n = 0;
    for (const ch of col.replace(/\$/g, '').toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n - 1;
  }
  function indexToCol(i) {
    let s = '';
    let n = i + 1;
    while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
    return s;
  }
  function normalizeRef(ref) { return String(ref).replace(/\$/g, '').toUpperCase(); }
  function parseRef(ref) {
    const m = String(ref).match(/^\$?([A-Za-z]{1,3})\$?(\d+)$/);
    if (!m) return null;
    return { col:colToIndex(m[1]), row:parseInt(m[2], 10) - 1, colLetter:m[1].toUpperCase(), address:normalizeRef(ref) };
  }
  function addressAt(col, row) { return indexToCol(col) + (row + 1); }

  class Lexer {
    constructor(src) { this.src = src; this.i = 0; this.tokens = []; }
    tokenize() {
      const s = this.src;
      while (this.i < s.length) {
        const ch = s[this.i];
        if (/\s/.test(ch)) { this.i++; continue; }
        if (ch === '"') { this.readString(); continue; }
        if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(s[this.i + 1]))) { this.readNumber(); continue; }
        if (/[A-Za-z_$]/.test(ch)) { this.readDocs(); continue; }
        const two = s.slice(this.i, this.i + 2);
        if (['<=','>=','<>'].includes(two)) { this.tokens.push({ type:'op', value:two }); this.i += 2; continue; }
        if ('+-*/^&=<>(),:%'.includes(ch)) { this.tokens.push({ type:ch === '(' || ch === ')' || ch === ',' || ch === ':' ? 'punc' : 'op', value:ch }); this.i++; continue; }
        this.tokens.push({ type:'bad', value:ch }); this.i++;
      }
      this.tokens.push({ type:'eof', value:'' });
      return this.tokens;
    }
    readString() {
      let out = '';
      this.i++;
      while (this.i < this.src.length) {
        const ch = this.src[this.i];
        if (ch === '"') {
          if (this.src[this.i + 1] === '"') { out += '"'; this.i += 2; continue; }
          this.i++; break;
        }
        out += ch; this.i++;
      }
      this.tokens.push({ type:'string', value:out });
    }
    readNumber() {
      const start = this.i;
      while (this.i < this.src.length && /[0-9.]/.test(this.src[this.i])) this.i++;
      const n = Number(this.src.slice(start, this.i));
      this.tokens.push({ type:'number', value:n });
    }
    readDocs() {
      const start = this.i;
      while (this.i < this.src.length && /[A-Za-z0-9_$]/.test(this.src[this.i])) this.i++;
      const word = this.src.slice(start, this.i);
      if (/^\$?[A-Za-z]{1,3}\$?\d+$/.test(word)) this.tokens.push({ type:'ref', value:normalizeRef(word) });
      else this.tokens.push({ type:'word', value:word.toUpperCase() });
    }
  }

  class Parser {
    constructor(tokens) { this.tokens = tokens; this.i = 0; }
    peek() { return this.tokens[this.i]; }
    next() { return this.tokens[this.i++]; }
    match(type, value) {
      const t = this.peek();
      if (t.type === type && (value === undefined || t.value === value)) { this.i++; return t; }
      return null;
    }
    expect(type, value) {
      const t = this.match(type, value);
      if (!t) throw new Error(`Expected ${value || type}`);
      return t;
    }
    parse() {
      const node = this.parseComparison();
      if (this.peek().type !== 'eof') throw new Error('Unexpected token ' + this.peek().value);
      return node;
    }
    parseComparison() {
      let left = this.parseConcat();
      while (this.peek().type === 'op' && ['=','<>','<','>','<=','>='].includes(this.peek().value)) {
        const op = this.next().value;
        const right = this.parseConcat();
        left = { type:'binary', op, left, right };
      }
      return left;
    }
    parseConcat() {
      let left = this.parseAdd();
      while (this.peek().type === 'op' && this.peek().value === '&') {
        this.next(); const right = this.parseAdd(); left = { type:'binary', op:'&', left, right };
      }
      return left;
    }
    parseAdd() {
      let left = this.parseMul();
      while (this.peek().type === 'op' && ['+','-'].includes(this.peek().value)) {
        const op = this.next().value; const right = this.parseMul(); left = { type:'binary', op, left, right };
      }
      return left;
    }
    parseMul() {
      let left = this.parsePower();
      while (this.peek().type === 'op' && ['*','/'].includes(this.peek().value)) {
        const op = this.next().value; const right = this.parsePower(); left = { type:'binary', op, left, right };
      }
      return left;
    }
    parsePower() {
      let left = this.parseUnary();
      if (this.peek().type === 'op' && this.peek().value === '^') {
        this.next(); const right = this.parsePower(); left = { type:'binary', op:'^', left, right };
      }
      return left;
    }
    parseUnary() {
      if (this.peek().type === 'op' && ['+','-'].includes(this.peek().value)) {
        const op = this.next().value; return { type:'unary', op, arg:this.parseUnary() };
      }
      return this.parsePostfix();
    }
    parsePostfix() {
      let node = this.parsePrimary();
      while (this.peek().type === 'op' && this.peek().value === '%') { this.next(); node = { type:'percent', arg:node }; }
      return node;
    }
    parsePrimary() {
      const t = this.peek();
      if (t.type === 'number') { this.next(); return { type:'lit', value:t.value }; }
      if (t.type === 'string') { this.next(); return { type:'lit', value:t.value }; }
      if (t.type === 'ref') {
        this.next();
        if (this.peek().type === 'punc' && this.peek().value === ':') {
          this.next();
          const end = this.expect('ref');
          return { type:'range', start:t.value, end:end.value };
        }
        return { type:'ref', ref:t.value };
      }
      if (t.type === 'word') {
        this.next();
        if (this.peek().type === 'punc' && this.peek().value === '(') {
          this.next();
          const args = [];
          if (!(this.peek().type === 'punc' && this.peek().value === ')')) {
            while (true) {
              if (this.peek().type === 'punc' && this.peek().value === ',') { args.push({ type:'lit', value:'' }); this.next(); continue; }
              args.push(this.parseComparison());
              if (this.peek().type === 'punc' && this.peek().value === ',') { this.next(); continue; }
              break;
            }
          }
          this.expect('punc', ')');
          return { type:'func', name:t.value, args };
        }
        if (t.value === 'TRUE') return { type:'lit', value:true };
        if (t.value === 'FALSE') return { type:'lit', value:false };
        if (t.value === 'PI') return { type:'lit', value:Math.PI };
        throw new Error('Unknown name ' + t.value);
      }
      if (t.type === 'punc' && t.value === '(') {
        this.next(); const node = this.parseComparison(); this.expect('punc', ')'); return node;
      }
      throw new Error('Unexpected end of formula');
    }
  }

  function parseFormula(formula) {
    const src = String(formula || '').replace(/^=/, '');
    return new Parser(new Lexer(src).tokenize()).parse();
  }

  function flatten(value) {
    if (value && value.__range) {
      const out = [];
      value.values.forEach(row => row.forEach(v => out.push(v)));
      return out;
    }
    if (Array.isArray(value)) return value.flatMap(flatten);
    return [value];
  }
  function isBlank(v) { return v === '' || v === null || v === undefined; }
  function toNumber(v) {
    if (isErr(v)) return v;
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (isBlank(v)) return 0;
    const n = Number(String(v).replace(/,/g, '').replace(/[%$]/g, ''));
    return isNaN(n) ? ERR.VALUE : n;
  }
  function toText(v) {
    if (isErr(v)) return v.__error;
    if (isBlank(v)) return '';
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    return String(v);
  }
  function truthy(v) {
    if (isErr(v)) return false;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    const s = String(v).toUpperCase();
    if (s === 'TRUE') return true;
    if (s === 'FALSE' || s === '') return false;
    return true;
  }
  function compareValues(a, b) {
    if (isErr(a)) return a;
    if (isErr(b)) return b;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    const an = isBlank(a) ? null : Number(a), bn = isBlank(b) ? null : Number(b);
    if (an !== null && bn !== null && !isNaN(an) && !isNaN(bn)) return an - bn;
    return String(toText(a)).toLowerCase().localeCompare(String(toText(b)).toLowerCase());
  }
  function firstError(values) {
    for (const v of values) { if (isErr(v)) return v; for (const x of flatten(v)) if (isErr(x)) return x; }
    return null;
  }

  function formatNonDate(value, fmt, style) {
    if (isErr(value)) return value.__error;
    if (isBlank(value)) return '';
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (fmt === 'text') return String(value);
    const n = typeof value === 'number' ? value : Number(value);
    if (isNaN(n)) return String(value);
    if (fmt === 'currency') return n.toLocaleString('en-US', { style:'currency', currency:'USD', minimumFractionDigits: style && style.decimals != null ? style.decimals : 0, maximumFractionDigits: style && style.decimals != null ? style.decimals : 2 });
    if (fmt === 'percent') return (n * 100).toLocaleString('en-US', { minimumFractionDigits: style && style.decimals != null ? style.decimals : 0, maximumFractionDigits: style && style.decimals != null ? style.decimals : 1 }) + '%';
    if (fmt === 'number') return n.toLocaleString('en-US', { minimumFractionDigits: style && style.decimals != null ? style.decimals : 0, maximumFractionDigits: style && style.decimals != null ? style.decimals : 2 });
    if (Number.isInteger(n)) return n.toLocaleString('en-US');
    return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  function formatDateSerial(serial, fmt) {
    if (isErr(serial)) return serial.__error;
    const n = Number(serial);
    if (isNaN(n)) return String(serial);
    const utc = Date.UTC(1899, 11, 30) + Math.round(n) * 86400000;
    const d = new Date(utc);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthsFull = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const daysFull = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    if (fmt === 'iso') return d.toISOString().slice(0,10);
    if (fmt === 'date') return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
    return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
  }

  function formatValue(value, style) {
    const s = style || {};
    if (isErr(value)) return value.__error;
    if (isBlank(value)) return '';
    if (s.fmt === 'date') {
      if (typeof value === 'number') return formatDateSerial(value, 'date');
      return String(value);
    }
    return formatNonDate(value, s.fmt, s);
  }

  function createContext(sheet) {
    return { sheet, cache:new Map(), visiting:new Set() };
  }

  function computeCell(address, ctx) {
    const addr = normalizeRef(address);
    if (ctx.cache.has(addr)) return ctx.cache.get(addr);
    if (ctx.visiting.has(addr)) return ERR.CYCLE;
    const cell = ctx.sheet.cells && ctx.sheet.cells[addr];
    if (!cell) { ctx.cache.set(addr, ''); return ''; }
    const raw = cell.v == null ? '' : String(cell.v);
    ctx.visiting.add(addr);
    let value;
    if (raw.startsWith('=')) {
      try {
        const ast = parseFormula(raw);
        value = evalNode(ast, ctx);
      } catch (e) {
        value = ERR.VALUE;
      }
    } else {
      value = parseLiteral(raw);
    }
    ctx.visiting.delete(addr);
    ctx.cache.set(addr, value);
    return value;
  }

  function parseLiteral(raw) {
    if (raw == null) return '';
    const s = String(raw);
    if (s.startsWith("'")) return s.slice(1);
    if (s.trim() === '') return '';
    if (/^-?\d+(\.\d+)?$/.test(s.trim())) return Number(s);
    if (/^-?\$?\d{1,3}(,\d{3})*(\.\d+)?$/.test(s.trim())) return Number(s.replace(/[$,]/g, ''));
    if (/^-?\d+(\.\d+)?%$/.test(s.trim())) return Number(s.replace('%','')) / 100;
    if (/^(true|false)$/i.test(s.trim())) return s.trim().toLowerCase() === 'true';
    // Date-like literals remain text so the learner can read them; formulas
    // that need arithmetic dates should use DATE() or a numeric serial.
    return s;
  }

  function cellValue(address, ctx) {
    const addr = normalizeRef(address);
    if (!parseRef(addr)) return ERR.REF;
    return computeCell(addr, ctx);
  }

  function rangeValues(start, end, ctx) {
    const a = parseRef(start), b = parseRef(end);
    if (!a || !b) return ERR.REF;
    const r1 = Math.min(a.row, b.row), r2 = Math.max(a.row, b.row);
    const c1 = Math.min(a.col, b.col), c2 = Math.max(a.col, b.col);
    const rows = [];
    for (let r = r1; r <= r2; r++) {
      const row = [];
      for (let c = c1; c <= c2; c++) row.push(cellValue(addressAt(c, r), ctx));
      rows.push(row);
    }
    return { __range:true, values:rows, c1, c2, r1, r2 };
  }

  function plainArgs(values) {
    const out = [];
    values.forEach(v => {
      if (v && v.__range) v.values.forEach(row => row.forEach(x => out.push(x)));
      else out.push(v);
    });
    return out;
  }
  function numericArgs(values) {
    return plainArgs(values).map(v => {
      if (isErr(v)) return v;
      if (typeof v === 'number') return v;
      if (typeof v === 'boolean') return v ? 1 : 0;
      if (isBlank(v)) return null;
      const n = Number(String(v).replace(/,/g, ''));
      return isNaN(n) ? null : n;
    }).filter(v => v !== null);
  }
  function cleanNumberArgs(values) {
    const err = firstError(values);
    if (err) return { error:err };
    return { nums:numericArgs(values) };
  }

  function criteriaMatcher(criteria) {
    if (isErr(criteria)) return () => false;
    let op = '=', raw = criteria;
    if (typeof criteria === 'string') {
      const m = criteria.match(/^(>=|<=|<>|>|<|=)(.*)$/);
      if (m) { op = m[1]; raw = m[2]; }
      if (/^".*"$/.test(raw)) raw = raw.slice(1, -1);
    }
    const numeric = raw !== '' && !isNaN(Number(raw));
    const target = numeric ? Number(raw) : String(raw).toLowerCase();
    return value => {
      if (numeric) {
        const n = Number(value);
        if (isNaN(n) || isBlank(value)) return false;
        switch (op) { case '>': return n > target; case '<': return n < target; case '>=': return n >= target; case '<=': return n <= target; case '<>': return n !== target; default: return n === target; }
      }
      const s = String(toText(value)).toLowerCase();
      const targetText = String(target);
      if (targetText.includes('*') || targetText.includes('?')) {
        const re = new RegExp('^' + targetText.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
        return re.test(s);
      }
      switch (op) { case '<>': return s !== targetText; case '>': return s > targetText; case '<': return s < targetText; case '>=': return s >= targetText; case '<=': return s <= targetText; default: return s === targetText; }
    };
  }

  function fnTEXT(value, format) {
    if (isErr(value)) return value;
    const fmt = String(format || '');
    if (typeof value === 'number' && /[ymd]/i.test(fmt) && !/[#0]/.test(fmt)) {
      const utc = Date.UTC(1899, 11, 30) + Math.round(value) * 86400000;
      const d = new Date(utc);
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const monthsFull = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      const daysFull = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      return fmt
        .replace(/mmmm/g, monthsFull[d.getUTCMonth()])
        .replace(/mmm/g, months[d.getUTCMonth()])
        .replace(/yyyy/g, String(d.getUTCFullYear()))
        .replace(/yy/g, String(d.getUTCFullYear()).slice(-2))
        .replace(/dddd/g, daysFull[d.getUTCDay()])
        .replace(/dd/g, String(d.getUTCDate()).padStart(2,'0'))
        .replace(/d/g, String(d.getUTCDate()))
        .replace(/mm/g, String(d.getUTCMonth() + 1).padStart(2,'0'))
        .replace(/m/g, String(d.getUTCMonth() + 1));
    }
    if (typeof value !== 'number') return String(value);
    if (fmt.includes('%')) {
      const decimals = (fmt.split('.')[1] || '').replace(/[^0]/g, '').length;
      return (value * 100).toFixed(decimals) + '%';
    }
    if (fmt.includes('$')) {
      const decimals = fmt.includes('.00') ? 2 : 0;
      return '$' + value.toLocaleString('en-US', { minimumFractionDigits:decimals, maximumFractionDigits:decimals });
    }
    const decimals = (fmt.split('.')[1] || '').replace(/[^0]/g, '').length;
    return value.toLocaleString('en-US', { minimumFractionDigits:decimals, maximumFractionDigits:decimals });
  }

  function dateFromSerial(serial) {
    return new Date(Date.UTC(1899, 11, 30) + Math.round(Number(serial) || 0) * 86400000);
  }
  function serialFromDate(date) {
    return Math.round((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - Date.UTC(1899, 11, 30)) / 86400000);
  }
  function addMonthsSerial(serial, months) {
    const d = dateFromSerial(serial);
    const day = d.getUTCDate();
    const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + Number(months), 1));
    const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(day, last));
    return serialFromDate(target);
  }
  function holidaySet(values) {
    const set = new Set();
    values.forEach(v => {
      if (v && v.__range) plainArgs([v]).forEach(x => { const n = Number(x); if (!isNaN(n)) set.add(Math.round(n)); });
      else { const n = Number(v); if (!isNaN(n)) set.add(Math.round(n)); }
    });
    return set;
  }
  function isWeekendSerial(serial) {
    const day = dateFromSerial(serial).getUTCDay();
    return day === 0 || day === 6;
  }

  function evalFunction(name, argNodes, ctx) {
    // Lazy functions first.
    if (name === 'IF') {
      const cond = evalNode(argNodes[0], ctx);
      if (isErr(cond)) return cond;
      if (truthy(cond)) return argNodes[1] ? evalNode(argNodes[1], ctx) : true;
      return argNodes[2] ? evalNode(argNodes[2], ctx) : false;
    }
    if (name === 'IFERROR') {
      const v = evalNode(argNodes[0], ctx);
      return isErr(v) ? (argNodes[1] ? evalNode(argNodes[1], ctx) : '') : v;
    }
    const values = argNodes.map(n => evalNode(n, ctx));
    const err = firstError(values);
    if (err && name !== 'ISERROR') return err;
    const flat = plainArgs(values);
    switch (name) {
      case 'SUM': { const a = cleanNumberArgs(values); if (a.error) return a.error; return a.nums.reduce((x,y) => x + y, 0); }
      case 'AVERAGE': { const a = cleanNumberArgs(values); if (a.error) return a.error; return a.nums.length ? a.nums.reduce((x,y) => x+y, 0) / a.nums.length : ERR.DIV0; }
      case 'COUNT': return numericArgs(values).length;
      case 'COUNTA': return flat.filter(v => !isBlank(v) && !(typeof v === 'string' && v === '')).length;
      case 'MIN': { const a = cleanNumberArgs(values); if (a.error) return a.error; return a.nums.length ? Math.min(...a.nums) : 0; }
      case 'MAX': { const a = cleanNumberArgs(values); if (a.error) return a.error; return a.nums.length ? Math.max(...a.nums) : 0; }
      case 'ROUND': { const n = toNumber(values[0]), d = values[1] == null ? 0 : toNumber(values[1]); if (isErr(n)) return n; if (isErr(d)) return d; const f = Math.pow(10, d); return Math.round(n * f) / f; }
      case 'ABS': { const n = toNumber(values[0]); return isErr(n) ? n : Math.abs(n); }
      case 'DATE': {
        const y = toNumber(values[0]), m = toNumber(values[1]), d = toNumber(values[2]);
        if (isErr(y) || isErr(m) || isErr(d)) return ERR.VALUE;
        const utc = Date.UTC(y, m - 1, d);
        return Math.round((utc - Date.UTC(1899, 11, 30)) / 86400000);
      }
      case 'TODAY': {
        const today = Utils.simNow();
        return Math.round((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(1899, 11, 30)) / 86400000);
      }
      case 'NOW': {
        const today = Utils.simNow();
        const serial = Math.round((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(1899, 11, 30)) / 86400000);
        return serial + (today.getHours() * 3600 + today.getMinutes() * 60) / 86400;
      }
      case 'TEXT': return fnTEXT(values[0], values[1] == null ? '' : values[1]);
      case 'VLOOKUP': {
        const lookup = values[0], range = values[1], colIndex = Math.round(toNumber(values[2]));
        const approximate = values[3] != null && truthy(values[3]);
        if (!range || !range.__range) return ERR.NA;
        if (colIndex < 1) return ERR.REF;
        const rows = range.values;
        let found = -1;
        for (let i = 0; i < rows.length; i++) {
          const cmp = compareValues(rows[i][0], lookup);
          if (isErr(cmp)) return cmp;
          if (cmp === 0) { found = i; break; }
          if (approximate && cmp < 0) found = i;
        }
        if (found < 0) return ERR.NA;
        const out = rows[found][colIndex - 1];
        return out == null ? ERR.REF : out;
      }
      case 'XLOOKUP': {
        const lookup = values[0], lookupRange = values[1], returnRange = values[2];
        const notFound = values[3] != null ? values[3] : ERR.NA;
        if (!lookupRange || !lookupRange.__range || !returnRange || !returnRange.__range) return ERR.NA;
        const look = plainArgs([lookupRange]);
        const ret = plainArgs([returnRange]);
        for (let i = 0; i < look.length; i++) {
          const cmp = compareValues(look[i], lookup);
          if (isErr(cmp)) return cmp;
          if (cmp === 0) return ret[i] == null ? '' : ret[i];
        }
        return notFound;
      }
      case 'COUNTIF': {
        const range = values[0], criteria = values[1];
        if (!range || !range.__range) return ERR.VALUE;
        const matcher = criteriaMatcher(criteria);
        return plainArgs([range]).filter(v => matcher(v)).length;
      }
      case 'SUMIF': {
        const range = values[0], criteria = values[1], sumRange = values[2] || values[0];
        if (!range || !range.__range || !sumRange || !sumRange.__range) return ERR.VALUE;
        const matcher = criteriaMatcher(criteria);
        const vals = plainArgs([range]); const sumVals = plainArgs([sumRange]);
        let total = 0;
        vals.forEach((v, i) => { if (matcher(v)) { const n = Number(sumVals[i]); if (!isNaN(n)) total += n; } });
        return total;
      }
      case 'CONCAT':
      case 'CONCATENATE': return flat.map(toText).join('');
      case 'LEN': return toText(values[0]).length;
      case 'LEFT': return toText(values[0]).slice(0, values[1] == null ? 1 : Math.max(0, Math.round(toNumber(values[1]))));
      case 'RIGHT': { const n = values[1] == null ? 1 : Math.max(0, Math.round(toNumber(values[1]))); const s = toText(values[0]); return s.slice(Math.max(0, s.length - n)); }
      case 'MID': { const s = toText(values[0]); const start = Math.max(1, Math.round(toNumber(values[1]))); const len = Math.max(0, Math.round(toNumber(values[2]))); return s.slice(start - 1, start - 1 + len); }
      case 'UPPER': return toText(values[0]).toUpperCase();
      case 'LOWER': return toText(values[0]).toLowerCase();
      case 'TRIM': return toText(values[0]).trim().replace(/\s+/g, ' ');
      case 'VALUE': {
        const n = Number(String(values[0]).replace(/[$,%]/g, ''));
        return isNaN(n) ? ERR.VALUE : n;
      }
      case 'AND': return flat.every(truthy);
      case 'OR': return flat.some(truthy);
      case 'NOT': return !truthy(values[0]);
      case 'ISBLANK': return isBlank(values[0]);
      case 'ISNUMBER': return typeof values[0] === 'number' && !isErr(values[0]);
      case 'ISTEXT': return typeof values[0] === 'string';
      case 'ISERROR': return isErr(values[0]);
      case 'PI': return Math.PI;
      case 'ROUNDUP': { const n = toNumber(values[0]), d = values[1] == null ? 0 : toNumber(values[1]); if (isErr(n) || isErr(d)) return ERR.VALUE; const f = Math.pow(10,d); return Math.ceil(n*f)/f; }
      case 'ROUNDDOWN': { const n = toNumber(values[0]), d = values[1] == null ? 0 : toNumber(values[1]); if (isErr(n) || isErr(d)) return ERR.VALUE; const f = Math.pow(10,d); return Math.floor(n*f)/f; }
      case 'MEDIAN': { const a = cleanNumberArgs(values); if (a.error) return a.error; if (!a.nums.length) return ERR.NUM; const s = a.nums.slice().sort((x,y)=>x-y); const m = Math.floor(s.length/2); return s.length % 2 ? s[m] : (s[m-1]+s[m])/2; }
      case 'STDEV': { const a = cleanNumberArgs(values); if (a.error) return a.error; if (a.nums.length < 2) return ERR.DIV0; const mean = a.nums.reduce((x,y)=>x+y,0)/a.nums.length; return Math.sqrt(a.nums.reduce((t,x)=>t+(x-mean)**2,0)/(a.nums.length-1)); }
      case 'EDATE': { const s = toNumber(values[0]); return isErr(s) ? s : addMonthsSerial(s, toNumber(values[1])); }
      case 'EOMONTH': { const s = toNumber(values[0]); if (isErr(s)) return s; const d = dateFromSerial(s); const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth()+Number(values[1]||0)+1, 0)); return serialFromDate(target); }
      case 'NETWORKDAYS': {
        const start = Math.round(toNumber(values[0])), end = Math.round(toNumber(values[1]));
        if (isErr(start) || isErr(end)) return ERR.VALUE;
        const holidays = holidaySet(values.slice(2));
        let n = 0;
        for (let s = Math.min(start,end), e = Math.max(start,end); s <= e; s++) if (!isWeekendSerial(s) && !holidays.has(s)) n++;
        return n;
      }
      case 'WORKDAY': {
        let s = Math.round(toNumber(values[0]));
        const days = Math.round(toNumber(values[1]));
        if (isErr(s) || isErr(days)) return ERR.VALUE;
        const holidays = holidaySet(values.slice(2));
        const sign = days < 0 ? -1 : 1;
        let remaining = Math.abs(days);
        while (remaining > 0) { s += sign; if (!isWeekendSerial(s) && !holidays.has(s)) remaining--; }
        return s;
      }
      case 'TEXTJOIN': {
        const delimiter = toText(values[0]);
        const ignore = truthy(values[1]);
        const parts = [];
        values.slice(2).forEach(v => { if (v && v.__range) plainArgs([v]).forEach(x => { if (!ignore || !isBlank(x)) parts.push(toText(x)); }); else if (!ignore || !isBlank(v)) parts.push(toText(v)); });
        return parts.join(delimiter);
      }
      case 'SUMIFS': {
        const sumRange = values[0];
        if (!sumRange || !sumRange.__range) return ERR.VALUE;
        const sums = plainArgs([sumRange]);
        let total = 0;
        for (let i = 0; i < sums.length; i++) {
          let ok = true;
          for (let p = 1; p + 1 < values.length; p += 2) {
            const r = values[p]; if (!r || !r.__range) { ok = false; break; }
            const vals = plainArgs([r]);
            if (!criteriaMatcher(values[p+1])(vals[i])) { ok = false; break; }
          }
          if (ok) { const n = Number(sums[i]); if (!isNaN(n)) total += n; }
        }
        return total;
      }
      case 'COUNTIFS': {
        let count = 0;
        const first = values[0] && values[0].__range ? plainArgs([values[0]]) : [];
        for (let i = 0; i < first.length; i++) {
          let ok = true;
          for (let p = 0; p + 1 < values.length; p += 2) {
            const r = values[p]; if (!r || !r.__range) { ok = false; break; }
            const vals = plainArgs([r]);
            if (!criteriaMatcher(values[p+1])(vals[i])) { ok = false; break; }
          }
          if (ok) count++;
        }
        return count;
      }
      case 'AVERAGEIF': {
        const range = values[0], criteria = values[1], avgRange = values[2] || values[0];
        if (!range || !range.__range || !avgRange || !avgRange.__range) return ERR.VALUE;
        const matcher = criteriaMatcher(criteria), vals = plainArgs([range]), avgs = plainArgs([avgRange]);
        let total = 0, n = 0;
        vals.forEach((v,i) => { if (matcher(v)) { const num = Number(avgs[i]); if (!isNaN(num)) { total += num; n++; } } });
        return n ? total / n : ERR.DIV0;
      }
      case 'INDEX': {
        const range = values[0]; if (!range || !range.__range) return ERR.VALUE;
        const row = Math.max(1, Math.round(toNumber(values[1]) || 1));
        const col = values[2] == null ? 1 : Math.max(1, Math.round(toNumber(values[2])));
        const rows = range.values; const target = rows[row-1]; if (!target) return ERR.REF;
        return target[col-1] == null ? ERR.REF : target[col-1];
      }
      case 'MATCH': {
        const lookup = values[0], range = values[1]; const mode = values[2] == null ? 1 : toNumber(values[2]);
        if (!range || !range.__range) return ERR.NA;
        const vals = plainArgs([range]);
        if (mode === 0) { const i = vals.findIndex(v => compareValues(v, lookup) === 0); return i < 0 ? ERR.NA : i + 1; }
        let best = -1;
        vals.forEach((v,i) => { const c = compareValues(v, lookup); if (mode > 0 ? c <= 0 : c >= 0) best = i; });
        return best < 0 ? ERR.NA : best + 1;
      }
      case 'CHOOSE': { const i = Math.round(toNumber(values[0])); return values[i] == null ? ERR.VALUE : values[i]; }
      case 'PROPER': return toText(values[0]).replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
      case 'EXACT': return toText(values[0]) === toText(values[1]);
      case 'PMT': {
        const rate = toNumber(values[0]), nper = toNumber(values[1]), pv = toNumber(values[2]);
        if (isErr(rate) || isErr(nper) || isErr(pv) || nper === 0) return ERR.NUM;
        if (rate === 0) return -pv / nper;
        return -(rate * pv) / (1 - Math.pow(1 + rate, -nper));
      }
      default: return ERR.NAME;
    }
  }

  function evalNode(node, ctx) {
    if (!node) return '';
    switch (node.type) {
      case 'lit': return node.value;
      case 'ref': return cellValue(node.ref, ctx);
      case 'range': return rangeValues(node.start, node.end, ctx);
      case 'percent': {
        const v = toNumber(evalNode(node.arg, ctx));
        return isErr(v) ? v : v / 100;
      }
      case 'unary': {
        const v = toNumber(evalNode(node.arg, ctx));
        if (isErr(v)) return v;
        return node.op === '-' ? -v : v;
      }
      case 'binary': {
        let a = evalNode(node.left, ctx);
        if (isErr(a)) return a;
        let b = evalNode(node.right, ctx);
        if (isErr(b)) return b;
        if (node.op === '&') return toText(a) + toText(b);
        if (['=','<>','<','>','<=','>='].includes(node.op)) {
          const cmp = compareValues(a, b);
          if (isErr(cmp)) return cmp;
          switch (node.op) {
            case '=': return cmp === 0;
            case '<>': return cmp !== 0;
            case '<': return cmp < 0;
            case '>': return cmp > 0;
            case '<=': return cmp <= 0;
            case '>=': return cmp >= 0;
          }
        }
        const x = toNumber(a), y = toNumber(b);
        if (isErr(x)) return x;
        if (isErr(y)) return y;
        switch (node.op) {
          case '+': return x + y;
          case '-': return x - y;
          case '*': return x * y;
          case '/': return y === 0 ? ERR.DIV0 : x / y;
          case '^': return Math.pow(x, y);
        }
        return ERR.VALUE;
      }
      case 'func': return evalFunction(node.name, node.args, ctx);
      default: return ERR.VALUE;
    }
  }

  function computeSheet(sheet) {
    const ctx = createContext(sheet);
    const out = {};
    Object.keys(sheet.cells || {}).forEach(addr => {
      const cell = sheet.cells[addr];
      const raw = cell.v == null ? '' : String(cell.v);
      let value;
      if (raw.startsWith('=')) value = computeCell(addr, ctx);
      else value = parseLiteral(raw);
      out[addr] = { value, display:formatValue(value, cell.s), error:isErr(value) ? value.__error : null, raw, style:cell.s || null };
    });
    return out;
  }

  function conditionalStyle(cell, sheet) {
    const formats = sheet.conditionalFormats || [];
    const ref = parseRef(cell.address);
    if (!ref) return null;
    for (const rule of formats) {
      if (!rule.range) continue;
      const [start, end] = rule.range.split(':');
      const a = parseRef(start), b = parseRef(end || start);
      if (!a || !b) continue;
      if (ref.col < Math.min(a.col,b.col) || ref.col > Math.max(a.col,b.col) || ref.row < Math.min(a.row,b.row) || ref.row > Math.max(a.row,b.row)) continue;
      let match = false;
      const val = cell.value;
      if (rule.type === 'lessThan') match = typeof val === 'number' && val < Number(rule.value);
      else if (rule.type === 'greaterThan') match = typeof val === 'number' && val > Number(rule.value);
      else if (rule.type === 'lessThanOrEqual') match = typeof val === 'number' && val <= Number(rule.value);
      else if (rule.type === 'greaterThanOrEqual') match = typeof val === 'number' && val >= Number(rule.value);
      else if (rule.type === 'equals') match = String(val).toLowerCase() === String(rule.value).toLowerCase();
      else if (rule.type === 'contains') match = String(val).toLowerCase().includes(String(rule.value).toLowerCase());
      else if (rule.type === 'between') match = typeof val === 'number' && val >= Number(rule.value) && val <= Number(rule.value2);
      if (match) return rule.style || null;
    }
    return null;
  }

  function evaluateSheet(sheet) {
    const computed = computeSheet(sheet);
    Object.values(computed).forEach(c => { c.conditional = conditionalStyle(c, sheet); });
    return computed;
  }

  function usedBounds(sheet) {
    let maxRow = 0, maxCol = 0;
    Object.keys(sheet.cells || {}).forEach(addr => {
      const ref = parseRef(addr);
      if (!ref) return;
      maxRow = Math.max(maxRow, ref.row); maxCol = Math.max(maxCol, ref.col);
    });
    return { maxRow, maxCol };
  }

  function shiftFormula(formula, rowOffset, colOffset) {
    if (!formula || formula[0] !== '=') return formula;
    // Avoid shifting inside double-quoted string literals.
    return formula.replace(/(\$?)([A-Za-z]{1,3})(\$?)(\d+)/g, (match, colAbs, col, rowAbs, row, offset, full) => {
      let inside = false;
      for (let i = 0; i < offset; i++) { if (full[i] === '"') inside = !inside; }
      if (inside) return match;
      // Do not rewrite function names or true/false (they have no digits, so
      // the regex already excludes them), or words in sheet names.
      const newCol = colAbs ? col : indexToCol(Math.max(0, colToIndex(col) + colOffset));
      const newRow = rowAbs ? Number(row) : Math.max(1, Number(row) + rowOffset);
      return `${colAbs}${newCol}${rowAbs}${newRow}`;
    });
  }

  function explainFormula(formula, sheet, activeAddress) {
    let ast;
    const raw = String(formula || '');
    if (!raw.startsWith('=')) return { title:'This cell is not a formula', explanation:'It contains a value or text. Type = before an expression to make it calculate.', parts:[] };
    try { ast = parseFormula(raw); } catch (e) { return { title:'This formula has a syntax error', explanation:'Check the parentheses, commas, and quotation marks. A formula must be complete before it can calculate.', parts:[] }; }
    const fnDescriptions = {
      SUM:'adds all the numbers in the cells or range you give it.',
      AVERAGE:'adds the numbers and divides by how many there are.',
      COUNT:'counts how many cells contain numbers.',
      COUNTA:'counts how many cells are not empty.',
      IF:'makes a decision: IF(condition, value-when-true, value-when-false).',
      VLOOKUP:'searches the first column of a table for a value and returns something from the same row.',
      XLOOKUP:'searches a range and returns the matching value from another range; more flexible than VLOOKUP.',
      TEXT:'turns a number into text using a display format, such as currency or a date pattern.',
      DATE:'builds a valid date from a year, month, and day.',
      TODAY:'returns today’s date as a spreadsheet date number.',
      ROUND:'rounds a number to a chosen number of decimal places.',
      COUNTIF:'counts cells that meet one condition.',
      SUMIF:'adds cells that meet one condition.',
      MIN:'returns the smallest number.',
      MAX:'returns the largest number.',
      CONCAT:'joins text values together.',
      IFERROR:'shows a fallback value when a formula returns an error.'
    };
    const functions = Array.from(new Set((raw.toUpperCase().match(/\b[A-Z][A-Z0-9.]*\s*\(/g) || []).map(s => s.replace(/\s*\($/, ''))));
    const refs = Array.from(new Set((raw.match(/\$?[A-Za-z]{1,3}\$?\d+(?::\$?[A-Za-z]{1,3}\$?\d+)?/g) || [])));
    const parts = [];
    functions.forEach(f => parts.push({ label:f + '()', text:fnDescriptions[f] || 'is a spreadsheet function. Check its arguments and purpose.' }));
    refs.forEach(r => {
      const bits = r.split(':');
      if (bits.length === 2) {
        const a = parseRef(bits[0]), b = parseRef(bits[1]);
        const count = a && b ? (Math.abs(a.row-b.row)+1) * (Math.abs(a.col-b.col)+1) : '?';
        parts.push({ label:r, text:`is a range of ${count} cells. A range lets one formula work across many cells.` });
      } else {
        parts.push({ label:r, text:`refers to cell ${normalizeRef(r)}. When the formula runs, it uses that cell’s value.` });
      }
    });
    if (/>=|<=|<>|\+|\-|\*|\/|&/.test(raw)) parts.push({ label:'Operators', text:'A mathematical or comparison operator. & joins text; >, <, = compare values.' });
    if (!parts.length) parts.push({ label:'Value', text:'This formula returns a single value.' });
    let sample = '';
    try {
      const ctx = createContext(sheet);
      const val = evalNode(ast, ctx);
      sample = isErr(val) ? val.__error : formatValue(val, sheet.cells[activeAddress] ? sheet.cells[activeAddress].s : {});
    } catch (e) { sample = 'error'; }
    return {
      title:'How this formula works',
      explanation:`This formula calculates a result by combining ${functions.length ? functions.join(', ') + ' with ' : ''}${refs.length ? refs.join(', ') : 'values'}. Read it left to right, then look inside the parentheses.`,
      parts,
      sample,
      formula:raw
    };
  }

  window.SheetEngine = {
    parseFormula, evaluateSheet, computeCell, formatValue, formatDateSerial, explainFormula, usedBounds,
    shiftFormula, parseRef, indexToCol, colToIndex, normalizeRef, isErr, formatNonDate, parseLiteral
  };
})();
