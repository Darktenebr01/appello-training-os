/* Minimal, dependency-free .xlsx reader/writer for the training Sheets app.
   Supports multiple worksheets, inline/shared text, formulas, basic cell
   styles, number formats, column widths, and a real ZIP package. */
(function () {
  'use strict';

  const enc = new TextEncoder();
  const dec = new TextDecoder('utf-8');
  const te = v => enc.encode(String(v));

  const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  })();
  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function dosDateTime(date) {
    const d = date || new Date();
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
    const dateBits = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    return { time, date: dateBits };
  }
  function u16(view, off, value) { view.setUint16(off, value, true); }
  function u32(view, off, value) { view.setUint32(off, value >>> 0, true); }

  function zipStore(files) {
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    const { time, date } = dosDateTime(new Date());
    files.forEach(file => {
      const name = te(file.name);
      const data = file.data instanceof Uint8Array ? file.data : te(file.data);
      const crc = crc32(data);
      const local = new Uint8Array(30 + name.length + data.length);
      const lv = new DataView(local.buffer);
      u32(lv, 0, 0x04034b50); u16(lv, 4, 20); u16(lv, 6, 0x0800); u16(lv, 8, 0);
      u16(lv, 10, time); u16(lv, 12, date); u32(lv, 14, crc);
      u32(lv, 18, data.length); u32(lv, 22, data.length);
      u16(lv, 26, name.length); u16(lv, 28, 0);
      local.set(name, 30); local.set(data, 30 + name.length);
      localParts.push(local);

      const central = new Uint8Array(46 + name.length);
      const cv = new DataView(central.buffer);
      u32(cv, 0, 0x02014b50); u16(cv, 4, 20); u16(cv, 6, 20); u16(cv, 8, 0x0800);
      u16(cv, 10, 0); u16(cv, 12, time); u16(cv, 14, date); u32(cv, 16, crc);
      u32(cv, 20, data.length); u32(cv, 24, data.length); u16(cv, 28, name.length);
      u16(cv, 30, 0); u16(cv, 32, 0); u16(cv, 34, 0); u16(cv, 36, 0);
      u32(cv, 38, 0); u32(cv, 42, offset);
      central.set(name, 46);
      centralParts.push(central);
      offset += local.length;
    });
    const centralSize = centralParts.reduce((n, p) => n + p.length, 0);
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    u32(ev, 0, 0x06054b50); u16(ev, 4, 0); u16(ev, 6, 0);
    u16(ev, 8, files.length); u16(ev, 10, files.length);
    u32(ev, 12, centralSize); u32(ev, 16, offset); u16(ev, 20, 0);
    const result = new Uint8Array(offset + centralSize + eocd.length);
    let pos = 0;
    localParts.forEach(p => { result.set(p, pos); pos += p.length; });
    centralParts.forEach(p => { result.set(p, pos); pos += p.length; });
    result.set(eocd, pos);
    return result;
  }

  async function inflateRaw(bytes) {
    if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot read compressed .xlsx files. Try Chrome or Edge.');
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  async function unzip(buffer) {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let eocd = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 66000); i--) {
      if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('This does not look like a valid .xlsx ZIP package.');
    const count = view.getUint16(eocd + 10, true);
    let ptr = view.getUint32(eocd + 16, true);
    const map = new Map();
    for (let i = 0; i < count; i++) {
      if (view.getUint32(ptr, true) !== 0x02014b50) throw new Error('The workbook ZIP directory is damaged.');
      const method = view.getUint16(ptr + 10, true);
      const compSize = view.getUint32(ptr + 20, true);
      const nameLen = view.getUint16(ptr + 28, true);
      const extraLen = view.getUint16(ptr + 30, true);
      const commentLen = view.getUint16(ptr + 32, true);
      const localOffset = view.getUint32(ptr + 42, true);
      const name = dec.decode(bytes.slice(ptr + 46, ptr + 46 + nameLen));
      if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error('The workbook has an invalid local file header.');
      const localNameLen = view.getUint16(localOffset + 26, true);
      const localExtraLen = view.getUint16(localOffset + 28, true);
      const dataStart = localOffset + 30 + localNameLen + localExtraLen;
      let data = bytes.slice(dataStart, dataStart + compSize);
      if (method === 8) data = await inflateRaw(data);
      else if (method !== 0) throw new Error('Unsupported ZIP compression method in workbook.');
      map.set(name, data);
      ptr += 46 + nameLen + extraLen + commentLen;
    }
    return map;
  }

  function xmlEscape(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }
  function safeSheetName(name, used) {
    let base = String(name || 'Sheet').replace(/[\\/?*\[\]:]/g, ' ').trim().slice(0, 31) || 'Sheet';
    let candidate = base, n = 2;
    while (used.has(candidate.toLowerCase())) { candidate = (base.slice(0, 27) + ' ' + n).slice(0, 31); n++; }
    used.add(candidate.toLowerCase());
    return candidate;
  }
  function workbookSheets(wb) {
    return Object.entries(wb.sheets || {}).map(([key, sheet]) => [key, sheet]);
  }
  function styleKey(style) {
    const s = style || {};
    return JSON.stringify({ b:!!s.b, i:!!s.i, u:!!s.u, bg:s.bg || '', color:s.color || '', border:!!s.border, align:s.align || '', fmt:s.fmt || '' });
  }
  function buildStyles(wb) {
    const keys = new Map();
    const keysOrder = [];
    const add = style => {
      const key = styleKey(style);
      if (!keys.has(key)) { keys.set(key, keysOrder.length + 1); keysOrder.push(style || {}); }
      return keys.get(key);
    };
    Object.values(wb.sheets || {}).forEach(sh => Object.values(sh.cells || {}).forEach(cell => add(cell.s)));
    const fonts = [`<font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font>`];
    const fontIndex = new Map([['default', 0]]);
    keysOrder.forEach(style => {
      const parts = [];
      if (style.b) parts.push('b');
      if (style.i) parts.push('i');
      if (style.u) parts.push('u');
      if (style.color) parts.push('color:' + style.color);
      const fk = parts.join('|') || 'default';
      if (!fontIndex.has(fk)) {
        let f = '<font>';
        if (style.b) f += '<b/>'; if (style.i) f += '<i/>'; if (style.u) f += '<u/>';
        f += `<sz val="11"/><color rgb="${(style.color || '#000000').replace('#','').toUpperCase()}"/><name val="Calibri"/><family val="2"/></font>`;
        fontIndex.set(fk, fonts.push(f) - 1);
      }
    });
    const fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
    const fillIndex = new Map([['', 0]]);
    keysOrder.forEach(style => {
      if (style.bg && !fillIndex.has(style.bg)) {
        fillIndex.set(style.bg, fills.push(`<fill><patternFill patternType="solid"><fgColor rgb="${style.bg.replace('#','').toUpperCase()}"/><bgColor indexed="64"/></patternFill></fill>`) - 1);
      }
    });
    const borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>', '<border><left style="thin"><color rgb="FF8EA9C1"/></left><right style="thin"><color rgb="FF8EA9C1"/></right><top style="thin"><color rgb="FF8EA9C1"/></top><bottom style="thin"><color rgb="FF8EA9C1"/></bottom><diagonal/></border>'];
    const xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
    keysOrder.forEach(style => {
      const fkParts = [];
      if (style.b) fkParts.push('b'); if (style.i) fkParts.push('i'); if (style.u) fkParts.push('u'); if (style.color) fkParts.push('color:' + style.color);
      const fontId = fontIndex.get(fkParts.join('|') || 'default') || 0;
      const fillId = fillIndex.get(style.bg || '') || 0;
      const borderId = style.border ? 1 : 0;
      const numFmtId = style.fmt === 'currency' ? 164 : style.fmt === 'percent' ? 10 : style.fmt === 'date' ? 14 : style.fmt === 'number' ? 4 : 0;
      const alignment = style.align ? ` applyAlignment="1"><alignment horizontal="${xmlEscape(style.align)}"/></xf>` : '/>';
      xfs.push(`<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1"${style.align ? alignment : '/>'}`);
    });
    return { xml:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0.00"/></numFmts><fonts count="${fonts.length}">${fonts.join('')}</fonts><fills count="${fills.length}">${fills.join('')}</fills><borders count="${borders.length}">${borders.join('')}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`, styleIndex: add };
  }

  function colIndex(addr) {
    const m = String(addr).match(/^([A-Z]+)(\d+)$/);
    if (!m) return { col:0, row:0 };
    let col = 0;
    for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
    return { col, row:Number(m[2]) };
  }
  function cellRef(col, row) {
    let s = '', n = col;
    while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
    return s + row;
  }
  function writeWorkbook(wb) {
    const sheets = workbookSheets(wb);
    if (!sheets.length) throw new Error('This workbook has no sheets.');
    const used = new Set();
    const names = sheets.map(([key, sheet], i) => safeSheetName(sheet.name || key, used));
    const styles = buildStyles(wb);
    const styleAdd = styles.styleIndex;
    const sheetXml = sheets.map(([key, sheet], index) => {
      const computed = window.SheetEngine.evaluateSheet(sheet);
      const cells = sheet.cells || {};
      const rows = new Map();
      Object.entries(cells).forEach(([addr, cell]) => {
        const ref = colIndex(addr);
        if (!ref.row) return;
        if (!rows.has(ref.row)) rows.set(ref.row, []);
        rows.get(ref.row).push({ addr, ref, cell });
      });
      const maxRow = Math.max(1, ...Array.from(rows.keys()));
      const maxCol = Math.max(1, ...Object.keys(cells).map(a => colIndex(a).col));
      const cols = [];
      for (let c = 1; c <= maxCol; c++) {
        const letter = cellRef(c, 1).replace(/\d+/g, '');
        const px = (sheet.colWidths && sheet.colWidths[letter]) || (sheet.colWidths && sheet.colWidths[c]) || 112;
        cols.push(`<col min="${c}" max="${c}" width="${Math.max(7, Math.round(px / 7))}" customWidth="1"/>`);
      }
      const rowXml = [];
      for (let r = 1; r <= maxRow; r++) {
        const rowCells = (rows.get(r) || []).sort((a,b) => a.ref.col - b.ref.col);
        if (!rowCells.length) continue;
        const height = sheet.rowHeights && (sheet.rowHeights[r] || sheet.rowHeights[String(r)]);
        const rowAttrs = height ? ` ht="${Math.max(15, Math.round(height * 0.75))}" customHeight="1"` : '';
        const cellXml = rowCells.map(({ addr, cell }) => {
          const raw = String(cell.v == null ? '' : cell.v);
          const isFormula = raw.startsWith('=');
          const style = cell.s || {};
          const s = styleAdd(style);
          let type = '', value = '';
          if (isFormula) {
            const result = computed[addr] || {};
            if (result.error) return `<c r="${addr}" s="${s}"><f>${xmlEscape(raw.slice(1))}</f></c>`;
            const v = result.value;
            if (typeof v === 'number' && Number.isFinite(v)) { value = String(v); }
            else if (typeof v === 'boolean') { type = ' t="b"'; value = v ? '1' : '0'; }
            else if (v != null && v !== '') { type = ' t="str"'; value = xmlEscape(v); }
            return `<c r="${addr}" s="${s}"${type}><f>${xmlEscape(raw.slice(1))}</f>${value ? `<v>${value}</v>` : ''}</c>`;
          }
          if (raw === '') return style ? `<c r="${addr}" s="${s}"/>` : '';
          if (/^-?\d+(\.\d+)?$/.test(raw)) { type = ''; value = raw; }
          else { type = ' t="inlineStr"'; value = `<is><t xml:space="preserve">${xmlEscape(raw)}</t></is>`; }
          return `<c r="${addr}" s="${s}"${type}>${type.includes('inlineStr') ? value : `<v>${value}</v>`}</c>`;
        }).join('');
        rowXml.push(`<row r="${r}"${rowAttrs}>${cellXml}</row>`);
      }
      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols.join('')}</cols><sheetData>${rowXml.join('')}</sheetData><autoFilter ref="A1:${cellRef(maxCol, Math.max(1, Math.min(maxRow, 1)))}"/></worksheet>`;
    });
    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((name, i) => `<sheet name="${xmlEscape(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`;
    const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${names.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
    const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
    const files = [
      { name:'[Content_Types].xml', data:contentTypes },
      { name:'_rels/.rels', data:rootRels },
      { name:'xl/workbook.xml', data:workbookXml },
      { name:'xl/_rels/workbook.xml.rels', data:workbookRels },
      { name:'xl/styles.xml', data:styles.xml },
      ...sheetXml.map((xml, i) => ({ name:`xl/worksheets/sheet${i + 1}.xml`, data:xml }))
    ];
    return zipStore(files);
  }

  function textOf(node, selector) {
    const el = node.querySelector(selector);
    return el ? el.textContent : '';
  }
  async function readWorkbook(buffer, fallbackName) {
    const files = await unzip(buffer);
    const parser = new DOMParser();
    const decodeFile = name => files.has(name) ? dec.decode(files.get(name)) : '';
    const workbookDoc = parser.parseFromString(decodeFile('xl/workbook.xml'), 'application/xml');
    if (workbookDoc.querySelector('parsererror')) throw new Error('The workbook XML is not readable.');
    const relDoc = parser.parseFromString(decodeFile('xl/_rels/workbook.xml.rels'), 'application/xml');
    const rels = new Map();
    relDoc.querySelectorAll('Relationship').forEach(r => rels.set(r.getAttribute('Id'), r.getAttribute('Target')));
    const sharedDoc = files.has('xl/sharedStrings.xml') ? parser.parseFromString(decodeFile('xl/sharedStrings.xml'), 'application/xml') : null;
    const shared = sharedDoc ? Array.from(sharedDoc.querySelectorAll('si')).map(si => Array.from(si.querySelectorAll('t')).map(t => t.textContent).join('')) : [];
    const styleDoc = files.has('xl/styles.xml') ? parser.parseFromString(decodeFile('xl/styles.xml'), 'application/xml') : null;
    const dateStyles = new Set([14,15,16,17,18,19,20,21,22,27,30,36,45,46,47,50,57]);
    if (styleDoc) {
      styleDoc.querySelectorAll('numFmt').forEach(n => { if (/[dmyh]/i.test(n.getAttribute('formatCode') || '')) dateStyles.add(Number(n.getAttribute('numFmtId'))); });
    }
    const sheets = {};
    const names = [];
    workbookDoc.querySelectorAll('sheet').forEach((sheetNode, index) => {
      const name = sheetNode.getAttribute('name') || `Sheet${index + 1}`;
      const rid = sheetNode.getAttribute('r:id') || sheetNode.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
      let target = rels.get(rid) || `worksheets/sheet${index + 1}.xml`;
      target = String(target).replace(/^\/?xl\//, '').replace(/^\/?worksheets\//, 'worksheets/');
      const path = 'xl/' + target.replace(/^\/+/, '');
      const xml = decodeFile(path) || decodeFile(`xl/worksheets/sheet${index + 1}.xml`);
      if (!xml) return;
      const doc = parser.parseFromString(xml, 'application/xml');
      const cells = {};
      const colWidths = {};
      doc.querySelectorAll('col').forEach(col => {
        const min = Number(col.getAttribute('min') || 1), max = Number(col.getAttribute('max') || min);
        const width = Number(col.getAttribute('width') || 0) * 7;
        for (let c = min; c <= max && c <= 100; c++) colWidths[cellRef(c, 1).replace(/\d+/g, '')] = Math.max(60, Math.round(width || 112));
      });
      doc.querySelectorAll('row').forEach(rowNode => {
        rowNode.querySelectorAll('c').forEach(cellNode => {
          const addr = cellNode.getAttribute('r');
          if (!addr) return;
          const formula = textOf(cellNode, 'f');
          const type = cellNode.getAttribute('t');
          let value = '';
          if (formula) value = '=' + formula;
          else if (type === 'inlineStr') value = Array.from(cellNode.querySelectorAll('is t')).map(t => t.textContent).join('');
          else if (type === 's') value = shared[Number(textOf(cellNode, 'v'))] || '';
          else if (type === 'str') value = textOf(cellNode, 'v');
          else if (type === 'b') value = textOf(cellNode, 'v') === '1' ? 'TRUE' : 'FALSE';
          else value = textOf(cellNode, 'v');
          const styleIdx = Number(cellNode.getAttribute('s') || 0);
          const style = {};
          if (styleIdx && styleDoc) {
            const xfs = styleDoc.querySelectorAll('cellXfs xf');
            const xf = xfs[styleIdx];
            if (xf) {
              const font = styleDoc.querySelectorAll('fonts font')[Number(xf.getAttribute('fontId') || 0)];
              if (font) {
                if (font.querySelector('b')) style.b = true;
                if (font.querySelector('i')) style.i = true;
                if (font.querySelector('u')) style.u = true;
                const color = font.querySelector('color');
                if (color && color.getAttribute('rgb')) style.color = '#' + color.getAttribute('rgb').slice(-6);
              }
              const fill = styleDoc.querySelectorAll('fills fill')[Number(xf.getAttribute('fillId') || 0)];
              const fg = fill && fill.querySelector('fgColor');
              if (fg && fg.getAttribute('rgb') && !/^0{6}$|^F{6}$/i.test(fg.getAttribute('rgb').slice(-6))) style.bg = '#' + fg.getAttribute('rgb').slice(-6);
              if (xf.getAttribute('borderId') && xf.getAttribute('borderId') !== '0') style.border = true;
              const numFmtId = Number(xf.getAttribute('numFmtId') || 0);
              if (numFmtId === 164 || numFmtId === 44) style.fmt = 'currency';
              else if (numFmtId === 9 || numFmtId === 10) style.fmt = 'percent';
              else if (dateStyles.has(numFmtId)) style.fmt = 'date';
              else if ([1,2,3,4].includes(numFmtId)) style.fmt = 'number';
              const align = xf.querySelector('alignment');
              if (align && align.getAttribute('horizontal')) style.align = align.getAttribute('horizontal');
            }
          }
          cells[addr] = { v:value, ...(Object.keys(style).length ? { s:style } : {}) };
        });
      });
      const sheetName = safeSheetName(name, new Set(names.map(n => n.toLowerCase())));
      names.push(sheetName);
      sheets[sheetName] = { name:sheetName, cells, colWidths, rowHeights:{} };
    });
    if (!Object.keys(sheets).length) throw new Error('No readable worksheets were found in this workbook.');
    return { name:(fallbackName || 'Imported workbook').replace(/\.xlsx$/i, ''), sheets };
  }

  window.XLSX = { writeWorkbook, readWorkbook, zipStore, unzip };
})();
