/* Sheets — a working spreadsheet with formulas, formatting, charts, filters,
   freeze panes, undo/redo, fill handle, and five training templates. */
(function () {
  'use strict';
  const { esc, toast, modal, confirm, Bus, debounce, fmtDate, openHelp, dateKey, simNow } = Utils;
  const E = window.SheetEngine;
  let instance = null;

  const ROWS = 40;
  const COLS = 14;
  const DEFAULT_COL_WIDTH = 112;

  function colLabel(c) { return E.indexToCol(c); }
  function cellAddress(c, r) { return colLabel(c) + (r + 1); }
  function getWb() { return Store.workbookById(instance.workbookId); }
  function getSheet() {
    const wb = getWb();
    if (!wb) return null;
    if (!wb.sheets[instance.activeSheet]) instance.activeSheet = Object.keys(wb.sheets)[0];
    return wb.sheets[instance.activeSheet];
  }
  function cellAt(sheet, address) { return sheet.cells[address]; }
  function rawAt(sheet, address) { const c = sheet.cells[address]; return c ? String(c.v || '') : ''; }
  function computedFor(sheet) { return E.evaluateSheet(sheet); }

  function selectionRect() {
    const a = instance.anchor, f = instance.focus;
    return { r1:Math.min(a.r, f.r), r2:Math.max(a.r, f.r), c1:Math.min(a.c, f.c), c2:Math.max(a.c, f.c) };
  }
  function selectedAddresses() {
    const rect = selectionRect();
    const out = [];
    for (let r = rect.r1; r <= rect.r2; r++) for (let c = rect.c1; c <= rect.c2; c++) out.push(cellAddress(c, r));
    return out;
  }
  function activeAddress() { return cellAddress(instance.focus.c, instance.focus.r); }

  function snapshot() { return JSON.stringify(getWb()); }
  function pushUndo(snap) {
    if (!snap) return;
    instance.undoStack.push(snap);
    if (instance.undoStack.length > 60) instance.undoStack.shift();
    instance.redoStack = [];
  }
  function undo() {
    if (!instance.undoStack.length) { toast('Nothing to undo', 'Make a change first. Undo covers edits, formatting, fills, and sorting in this session.', { duration:2800 }); return; }
    const current = snapshot();
    const previous = instance.undoStack.pop();
    instance.redoStack.push(current);
    const wb = JSON.parse(previous);
    Store.update(s => { const idx = s.workbooks.findIndex(w => w.id === instance.workbookId); if (idx >= 0) s.workbooks[idx] = wb; });
    ensureSelectionInSheet();
    render();
    Bus.emit('sheet:undo', { workbookId:instance.workbookId, sheetName:instance.activeSheet });
    toast('Undone', 'The last spreadsheet change was reversed.', { duration:2200 });
  }
  function redo() {
    if (!instance.redoStack.length) { toast('Nothing to redo', 'Undo a change first, then redo it.', { duration:2400 }); return; }
    const current = snapshot();
    const next = instance.redoStack.pop();
    instance.undoStack.push(current);
    const wb = JSON.parse(next);
    Store.update(s => { const idx = s.workbooks.findIndex(w => w.id === instance.workbookId); if (idx >= 0) s.workbooks[idx] = wb; });
    ensureSelectionInSheet();
    render();
    Bus.emit('sheet:redo', { workbookId:instance.workbookId, sheetName:instance.activeSheet });
    toast('Redone', 'The change was applied again.', { duration:2200 });
  }

  function ensureSelectionInSheet() {
    const sheet = getSheet();
    if (!sheet) return;
    if (!sheet.cells[activeAddress()]) { /* keep selection; empty cells are valid */ }
    if (instance.focus.r >= ROWS) instance.focus.r = ROWS - 1;
    if (instance.focus.c >= COLS) instance.focus.c = COLS - 1;
  }

  function setCellRaw(address, raw, options) {
    const sheet = getSheet();
    if (!sheet) return;
    const opts = options || {};
    if (!opts.noUndo) pushUndo(JSON.stringify(getWb()));
    const previous = rawAt(sheet, address);
    const wb = getWb();
    const cellBefore = sheet.cells[address] ? Object.assign({}, sheet.cells[address]) : {};
    Store.update(s => {
      const w = s.workbooks.find(x => x.id === wb.id);
      const sh = w.sheets[instance.activeSheet];
      if (raw === '') {
        if (sh.cells[address]) {
          if (sh.cells[address].s) sh.cells[address].v = '';
          else delete sh.cells[address];
        }
      } else {
        const oldStyle = sh.cells[address] ? sh.cells[address].s : null;
        sh.cells[address] = oldStyle ? { v:raw, s:oldStyle } : { v:raw };
      }
    });
    const computed = E.evaluateSheet(getSheet());
    const value = computed[address] ? computed[address].display : '';
    Bus.emit('sheet:cell-edited', {
      workbookId:wb.id, sheetName:instance.activeSheet, cell:address,
      formula:raw.startsWith('=') ? raw : null, value, previous
    });
    if (opts.render !== false) render();
  }

  function clearSelected() {
    const addresses = selectedAddresses();
    if (!addresses.length) return;
    pushUndo(JSON.stringify(getWb()));
    const wb = getWb();
    Store.update(s => {
      const w = s.workbooks.find(x => x.id === wb.id);
      const sh = w.sheets[instance.activeSheet];
      addresses.forEach(addr => {
        if (sh.cells[addr]) {
          if (sh.cells[addr].s) sh.cells[addr].v = '';
          else delete sh.cells[addr];
        }
      });
    });
    Bus.emit('sheet:cells-cleared', { workbookId:wb.id, sheetName:instance.activeSheet, cells:addresses });
    render();
  }

  function applyStyle(patch) {
    const addresses = selectedAddresses();
    if (!addresses.length) return;
    pushUndo(JSON.stringify(getWb()));
    const wb = getWb();
    Store.update(s => {
      const w = s.workbooks.find(x => x.id === wb.id);
      const sh = w.sheets[instance.activeSheet];
      addresses.forEach(addr => {
        if (!sh.cells[addr]) sh.cells[addr] = { v:'' };
        const cell = sh.cells[addr];
        const style = Object.assign({}, cell.s || {});
        Object.keys(patch).forEach(k => {
          if (patch[k] === null || patch[k] === undefined) delete style[k]; else style[k] = patch[k];
        });
        if (Object.keys(style).length) cell.s = style; else delete cell.s;
      });
    });
    Bus.emit('sheet:format-applied', { workbookId:wb.id, sheetName:instance.activeSheet, cells:addresses, style:patch });
    render();
  }

  /* ------------------------------- render -------------------------------- */
  function render() {
    const root = instance.root;
    if (!root) return;
    const wb = getWb();
    if (!wb) {
      root.innerHTML = `<div class="empty-state" style="height:100%"><h3>Workbook not found</h3><p>It may have been deleted. Open Sheets again or choose a template.</p></div>`;
      return;
    }
    const sheet = getSheet();
    const computed = computedFor(sheet);
    const scroll = root.querySelector('.sheet-scroll');
    const scrollState = scroll ? { top:scroll.scrollTop, left:scroll.scrollLeft } : { top:0,left:0 };
    const maxRows = Math.max(ROWS, E.usedBounds(sheet).maxRow + 6);
    const maxCols = Math.max(COLS, E.usedBounds(sheet).maxCol + 2);
    const rect = selectionRect();
    const activeAddr = activeAddress();
    const formula = rawAt(sheet, activeAddr);
    const selectedStats = selectionStats(sheet, computed, rect);
    const file = wb.fileId ? Store.fileById(wb.fileId) : null;

    root.innerHTML = `
      <div class="sheets-app">
        <header class="sheets-appbar">
          <div class="sheets-brand"><span class="sheets-mark">▦</span><div><strong>Sheets</strong><small>${esc(wb.name)}</small></div></div>
          <div class="sheets-appbar-center">
            <span class="autosave-note" data-tip="Edits are saved in this browser. The Save button also updates the file’s modified timestamp and records a training event."><i class="autosave-dot"></i> Auto-saved locally</span>
          </div>
          <div class="sheets-appbar-right">
            <button class="help-btn" data-sheet-help data-tip="Plain-language help for cells, formulas, ranges, and charts.">What is this?</button>
            <button class="btn small" data-template-gallery data-tip="Open one of the five pre-filled practice workbooks.">Templates</button>
            <button class="btn small" data-import-xlsx data-tip="Open a real .xlsx workbook from this computer into the training app.">Import</button>
            <button class="btn small" data-export-xlsx data-tip="Download this workbook as a real .xlsx file. Formulas and basic cell styles are included.">Export</button>
            <button class="btn small" data-new-workbook data-tip="Create a blank workbook.">New</button>
            <button class="btn primary small" data-save-sheet data-target="save-sheet" data-tip="Save the workbook and update its modified date.">Save</button>
            <input type="file" id="xlsx-import-input" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden aria-label="Import an .xlsx workbook">
          </div>
        </header>
        <div class="ribbon-tabs sheet-ribbon-tabs" role="tablist" aria-label="Spreadsheet ribbon tabs">
          <button class="active" data-ribbon-tab="home" role="tab">Home</button>
          <button data-ribbon-tab="insert" role="tab">Insert</button>
          <button data-ribbon-tab="formulas" role="tab">Formulas</button>
          <button data-ribbon-tab="data" role="tab">Data</button>
          <button data-ribbon-tab="view" role="tab">View</button>
        </div>
        <div class="sheets-toolbar" data-active-ribbon="home" role="toolbar" aria-label="Spreadsheet formatting">
          <div class="sheet-tool-group" data-ribbon="home">
            <button class="sheet-tool" data-undo data-tip="Undo the last change (Ctrl+Z)." aria-label="Undo">↶</button>
            <button class="sheet-tool" data-redo data-tip="Redo the last undone change (Ctrl+Y)." aria-label="Redo">↷</button>
          </div>
          <div class="sheet-tool-group" data-ribbon="home">
            <button class="sheet-tool ${isStyle(sheet,activeAddr,'b') ? 'active' : ''}" data-style="b" data-tip="Bold the selected cells (Ctrl+B)." aria-label="Bold"><b>B</b></button>
            <button class="sheet-tool ${isStyle(sheet,activeAddr,'i') ? 'active' : ''}" data-style="i" data-tip="Italicize the selected cells." aria-label="Italic"><i>I</i></button>
            <button class="sheet-tool ${isStyle(sheet,activeAddr,'u') ? 'active' : ''}" data-style="u" data-tip="Underline the selected cells." aria-label="Underline"><u>U</u></button>
          </div>
          <div class="sheet-tool-group" data-ribbon="home">
            <label class="color-tool" data-tip="Fill the selected cells with a background color."><span>A</span><input type="color" id="fill-color" value="${esc((sheet.cells[activeAddr] && sheet.cells[activeAddr].s && sheet.cells[activeAddr].s.bg) || '#fff3cd')}" aria-label="Fill color"></label>
            <label class="color-tool text-color" data-tip="Change the text color of the selected cells."><span>𝔸</span><input type="color" id="text-color" value="${esc((sheet.cells[activeAddr] && sheet.cells[activeAddr].s && sheet.cells[activeAddr].s.color) || '#17202b')}" aria-label="Text color"></label>
            <button class="sheet-tool" data-border data-tip="Add or remove a thin border around selected cells." aria-label="Borders">▦</button>
          </div>
          <div class="sheet-tool-group" data-ribbon="home">
            <button class="sheet-tool" data-align="left" data-tip="Align text left.">≡</button>
            <button class="sheet-tool" data-align="center" data-tip="Align text center.">≣</button>
            <button class="sheet-tool" data-align="right" data-tip="Align text right.">≡</button>
          </div>
          <div class="sheet-tool-group" data-ribbon="home">
            <button class="sheet-tool" data-fmt="currency" data-tip="Format numbers as US dollars.">$</button>
            <button class="sheet-tool" data-fmt="percent" data-tip="Format numbers as percentages.">%</button>
            <button class="sheet-tool" data-fmt="date" data-tip="Format a date number as a readable date.">📅</button>
            <button class="sheet-tool" data-fmt="number" data-tip="Format numbers with thousands separators.">1,000</button>
          </div>
          <div class="sheet-tool-group" data-ribbon="data">
            <button class="sheet-tool" data-filter data-tip="Filter data by the selected column.">⏷ Filter</button>
            <button class="sheet-tool" data-sort-asc data-tip="Sort the table ascending by the selected column.">A→Z</button>
            <button class="sheet-tool" data-sort-desc data-tip="Sort the table descending by the selected column.">Z→A</button>
            <button class="sheet-tool" data-conditional data-tip="Add a rule that changes cell colors automatically.">◐ Conditional</button>
          </div>
          <div class="sheet-tool-group" data-ribbon="insert">
            <button class="sheet-tool chart-tool" data-chart data-tip="Insert a bar or pie chart from your data.">▥ Chart</button>
            <button class="sheet-tool" data-insert-table data-tip="Insert a small formatted table with headers.">▦ Table</button>
          </div>
          <div class="sheet-tool-group" data-ribbon="formulas">
            <button class="sheet-tool" data-insert-formula="=SUM(" data-tip="Insert a SUM formula.">Σ Sum</button>
            <button class="sheet-tool" data-insert-formula="=AVERAGE(" data-tip="Insert an AVERAGE formula.">x̄ Average</button>
            <button class="sheet-tool" data-insert-formula="=IF(" data-tip="Insert an IF formula.">IF</button>
            <button class="sheet-tool explain-tool" data-explain data-tip="Translate the selected formula into plain English.">? Explain</button>
          </div>
          <div class="sheet-tool-group" data-ribbon="view">
            <button class="sheet-tool" data-freeze data-tip="Freeze the header row, first column, or both.">❄ Freeze</button>
            <button class="sheet-tool" data-toggle-gridlines data-tip="Show or hide gridlines on this sheet.">▦ Gridlines</button>
            <button class="sheet-tool" data-explain data-tip="Explain the selected formula.">? Formula help</button>
          </div>
        </div>
        <div class="formula-bar">
          <input id="name-box" class="name-box" value="${esc(rect.r1 === rect.r2 && rect.c1 === rect.c2 ? activeAddr : `${cellAddress(rect.c1,rect.r1)}:${cellAddress(rect.c2,rect.r2)}`)}" aria-label="Name box" data-tip="The address of the selected cell or range. Type an address and press Enter to jump there.">
          <span class="formula-fx">ƒx</span>
          <input id="formula-input" class="formula-input" value="${esc(formula)}" aria-label="Formula bar" placeholder="Enter a value or formula, starting with =" data-tip="Shows what is really in the cell. Type =SUM(D2:D9) to calculate. Press Enter to apply.">
          <button class="icon-btn formula-explain" data-explain aria-label="Explain formula" data-tip="Explain the selected formula in plain language.">?</button>
          <button class="icon-btn" data-formula-cancel aria-label="Cancel formula edit" data-tip="Restore the cell’s previous content.">✕</button>
          <button class="icon-btn formula-enter" data-formula-enter aria-label="Apply formula" data-tip="Apply the formula bar to the selected cell.">✓</button>
        </div>
        <div class="sheet-main ${sheet.chart ? 'has-chart' : ''}">
          <div class="sheet-scroll" id="sheet-scroll">
            <table class="sheet-grid ${sheet.hideGridlines ? 'no-gridlines' : ''}" role="grid" aria-label="${esc(wb.name)} spreadsheet" tabindex="0">
              <colgroup><col style="width:46px">${Array.from({length:maxCols}, (_,c) => `<col style="width:${sheet.colWidths[colLabel(c)] || DEFAULT_COL_WIDTH}px">`).join('')}</colgroup>
              <thead><tr><th class="corner-cell"></th>${Array.from({length:maxCols}, (_,c) => `<th class="col-head ${isColumnSelected(c)?'selected':''}" data-col="${c}">${colLabel(c)}</th>`).join('')}</tr></thead>
              <tbody>
                ${Array.from({length:maxRows}, (_,r) => `<tr class="${isRowHidden(sheet,r)?'row-hidden':''}"><th class="row-head ${isRowSelected(r)?'selected':''}" data-row="${r}">${r+1}</th>${Array.from({length:maxCols}, (_,c) => renderCell(sheet, computed, c, r, activeAddr)).join('')}</tr>`).join('')}
              </tbody>
            </table>
          </div>
          ${sheet.chart ? chartPanel(sheet, computed) : ''}
        </div>
        <footer class="sheet-footer">
          <div class="sheet-tabs" role="tablist" aria-label="Sheets in this workbook">
            ${Object.keys(wb.sheets).map(name => `<button class="sheet-tab ${name === instance.activeSheet ? 'active' : ''}" role="tab" aria-selected="${name===instance.activeSheet}" data-sheet-tab="${esc(name)}" data-tip="Switch to the ${esc(name)} sheet. Double-click to rename.">${esc(name)}</button>`).join('')}
            <button class="sheet-add" data-add-sheet aria-label="Add sheet" data-tip="Add another sheet to this workbook.">+</button>
          </div>
          <div class="sheet-status">
            <span>${selectedStats.count ? `${selectedStats.count} cells · Sum ${esc(Utils.formatNumber(selectedStats.sum))} · Avg ${esc(Utils.formatNumber(selectedStats.avg))}` : 'Ready'}</span>
            <span class="sheet-file-status">${file ? esc(fmtDate(file.updatedAt || file.createdAt, 'medium')) : 'Unsaved workbook'}</span>
          </div>
        </footer>
      </div>`;
    bind();
    const sc = root.querySelector('.sheet-scroll');
    if (sc) { sc.scrollTop = scrollState.top; sc.scrollLeft = scrollState.left; }
    ensureActiveVisible();
    updateSelectionChrome();
  }

  function isLightColor(value) {
    const h = String(value || '').trim().replace('#','');
    if (h.length === 3) return (0.299 * parseInt(h[0]+h[0],16) + 0.587 * parseInt(h[1]+h[1],16) + 0.114 * parseInt(h[2]+h[2],16)) > 158;
    if (h.length !== 6 || /[^0-9a-f]/i.test(h)) return false;
    const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
    return (0.299*r + 0.587*g + 0.114*b) > 158;
  }

  function renderCell(sheet, computed, c, r, activeAddr) {
    const addr = cellAddress(c, r);
    const cell = sheet.cells[addr];
    const comp = computed[addr];
    const style = cell && cell.s ? cell.s : {};
    const cond = comp && comp.conditional ? comp.conditional : {};
    const isActive = addr === activeAddr;
    const selected = isInSelection(c, r);
    const frozen = (r < (sheet.freeze ? sheet.freeze.row : 0)) || (c < (sheet.freeze ? sheet.freeze.col : 0));
    const numeric = comp && typeof comp.value === 'number';
    const align = style.align || cond.align || (numeric ? 'right' : 'left');
    const cellBg = cond.bg || style.bg || '#1b1b1b';
    const contrastFg = isLightColor(cellBg) ? '#1b2737' : '#e7e7e7';
    const explicitFg = cond.color || style.color || null;
    const cellFg = explicitFg && (isLightColor(explicitFg) !== isLightColor(cellBg)) ? explicitFg : contrastFg;
    const css = [
      `background-color:${cellBg}`,
      `color:${cellFg}`,
      `font-weight:${style.b || cond.b || false ? 700 : 400}`,
      `font-style:${style.i ? 'italic' : 'normal'}`,
      `text-decoration:${style.u ? 'underline' : 'none'}`,
      `text-align:${align}`,
      style.border ? 'border:1px solid #b9c9da' : '',
      cond.bold ? 'font-weight:700' : ''
    ].filter(Boolean).join(';');
    const display = comp ? comp.display : '';
    const error = comp && comp.error;
    const classes = ['sheet-cell'];
    if (isActive) classes.push('active-cell');
    if (selected) classes.push('selected-cell');
    if (frozen) classes.push('frozen-cell');
    if (frozen && r < (sheet.freeze ? sheet.freeze.row : 0) && c < (sheet.freeze ? sheet.freeze.col : 0)) classes.push('frozen-corner');
    if (error) classes.push('cell-error');
    return `<td class="${classes.join(' ')}" data-cell="${addr}" data-col="${c}" data-row="${r}" style="${css}" aria-label="${esc(addr)} ${esc(display || 'empty')}">${esc(display)}${isActive ? '<span class="fill-handle" id="fill-handle" title="Drag to fill down or right" data-tip="Fill handle: drag to copy this value or formula into nearby cells."></span>' : ''}</td>`;
  }

  function isInSelection(c, r) {
    const rect = selectionRect();
    return r >= rect.r1 && r <= rect.r2 && c >= rect.c1 && c <= rect.c2;
  }
  function isColumnSelected(c) { const rect = selectionRect(); return c >= rect.c1 && c <= rect.c2; }
  function isRowSelected(r) { const rect = selectionRect(); return r >= rect.r1 && r <= rect.r2; }
  function isRowHidden(sheet, r) { return (sheet.hiddenRows || []).includes(r + 1); }
  function isStyle(sheet, address, key) { const c = sheet.cells[address]; return !!(c && c.s && c.s[key]); }

  function selectionStats(sheet, computed, rect) {
    let sum = 0, count = 0;
    for (let r = rect.r1; r <= rect.r2; r++) for (let c = rect.c1; c <= rect.c2; c++) {
      const comp = computed[cellAddress(c, r)];
      if (comp && typeof comp.value === 'number' && !comp.error) { sum += comp.value; count++; }
    }
    return { sum, count, avg:count ? sum / count : 0 };
  }

  function chartPanel(sheet, computed) {
    return `<aside class="chart-panel" aria-label="Chart">
      <div class="chart-head"><div><span class="eyebrow">Chart</span><strong>${esc(sheet.chart.title || 'Data chart')}</strong></div><button class="icon-btn" data-close-chart aria-label="Hide chart" data-tip="Hide the chart panel. The chart stays in the workbook.">✕</button></div>
      <div class="chart-type-toggle"><button class="${sheet.chart.type === 'bar' ? 'active' : ''}" data-chart-type="bar">Bar</button><button class="${sheet.chart.type === 'pie' ? 'active' : ''}" data-chart-type="pie">Pie</button></div>
      <div class="chart-canvas" data-chart-render>${renderChartSvg(sheet, computed)}</div>
      <div class="chart-foot"><span class="muted-small">Range ${esc(sheet.chart.range)}</span><button class="btn small" data-explain-chart data-tip="Explain how the chart gets its numbers.">How is this chart made?</button></div>
    </aside>`;
  }

  function chartData(sheet, computed) {
    const chart = sheet.chart;
    if (!chart || !chart.range) return null;
    const [a, b] = chart.range.split(':');
    const ra = E.parseRef(a), rb = E.parseRef(b || a);
    if (!ra || !rb) return null;
    const r1 = Math.min(ra.row, rb.row), r2 = Math.max(ra.row, rb.row);
    const labelCol = E.colToIndex(chart.labelCol || E.indexToCol(ra.col));
    let series = (chart.seriesCols && chart.seriesCols.length ? chart.seriesCols : []).map(x => E.colToIndex(x));
    if (!series.length) {
      // Auto-detect numeric columns in the selected range.
      for (let c = Math.min(ra.col, rb.col); c <= Math.max(ra.col, rb.col); c++) {
        if (c === labelCol) continue;
        let numeric = 0;
        for (let r = r1; r <= r2; r++) { const comp = computed[cellAddress(c, r)]; if (comp && typeof comp.value === 'number') numeric++; }
        if (numeric >= 2) series.push(c);
        if (series.length >= 2) break;
      }
    }
    if (!series.length) return null;
    const rows = [];
    for (let r = r1; r <= r2; r++) {
      const labelComp = computed[cellAddress(labelCol, r)];
      const label = labelComp ? String(labelComp.display) : '';
      if (!label || /^(category|total|name|date|month)$/i.test(label)) continue;
      const values = series.map(c => {
        const comp = computed[cellAddress(c, r)];
        return comp && typeof comp.value === 'number' ? comp.value : null;
      });
      if (values.some(v => v !== null)) rows.push({ label, values });
    }
    if (!rows.length) return null;
    return {
      labels:rows.map(r => r.label), rows,
      series,
      seriesNames:series.map(c => {
        const comp = computed[cellAddress(c, r1)];
        return comp && comp.display ? String(comp.display) : colLabel(c);
      }),
      colors:['#2f7fd3', '#21a366', '#7a5bd3', '#d38b2c', '#c04f5e']
    };
  }

  function renderChartSvg(sheet, computed) {
    const data = chartData(sheet, computed);
    if (!data) return `<div class="chart-empty"><span>▥</span><p>No numeric data to chart yet.</p><small>Try selecting a range with labels and numbers.</small></div>`;
    if (sheet.chart.type === 'pie') return renderPie(data);
    return renderBar(data);
  }

  function renderBar(data) {
    const W = 378, H = 255, ml = 43, mr = 12, mt = 16, mb = 58;
    const innerW = W - ml - mr, innerH = H - mt - mb;
    const max = Math.max(1, ...data.rows.flatMap(r => r.values.filter(v => v != null)));
    const min = Math.min(0, ...data.rows.flatMap(r => r.values.filter(v => v != null)));
    const span = max - min || 1;
    const groupW = innerW / data.rows.length;
    const barW = Math.min(18, (groupW * .7) / data.series.length);
    const ticks = 4;
    let grid = '';
    for (let i = 0; i <= ticks; i++) {
      const v = min + span * (i / ticks);
      const y = mt + innerH - (i / ticks) * innerH;
      grid += `<line x1="${ml}" y1="${y}" x2="${W-mr}" y2="${y}" stroke="#e7edf5" stroke-width="1"/><text x="${ml-6}" y="${y+3}" text-anchor="end" class="chart-axis-text">${v>=1000?'$'+(v/1000).toFixed(1)+'k':Math.round(v)}</text>`;
    }
    let bars = '';
    data.rows.forEach((row, i) => {
      const groupX = ml + i * groupW + groupW / 2;
      row.values.forEach((v, s) => {
        if (v == null) return;
        const h = Math.abs(v - (min < 0 ? 0 : min)) / span * innerH;
        const baseY = min < 0 ? mt + innerH - ((0 - min) / span) * innerH : mt + innerH;
        const y = v >= 0 ? baseY - h : baseY;
        const x = groupX - (data.series.length * barW) / 2 + s * barW;
        bars += `<rect x="${x}" y="${y}" width="${barW-2}" height="${Math.max(1,h)}" rx="2" fill="${data.colors[s%data.colors.length]}" opacity=".92"><title>${esc(row.label)} · ${esc(data.seriesNames[s])}: ${v.toLocaleString()}</title></rect>`;
      });
      const label = row.label.length > 11 ? row.label.slice(0, 10) + '…' : row.label;
      bars += `<text x="${groupX}" y="${H-mb+16}" text-anchor="end" transform="rotate(-28 ${groupX} ${H-mb+16})" class="chart-axis-text">${esc(label)}</text>`;
    });
    const legend = data.seriesNames.map((n, i) => `<g transform="translate(${ml + i*104},${H-16})"><rect width="8" height="8" rx="2" fill="${data.colors[i%data.colors.length]}"/><text x="12" y="8" class="chart-legend-text">${esc(n.slice(0,14))}</text></g>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Bar chart">${grid}${bars}${legend}</svg>`;
  }

  function renderPie(data) {
    const W = 378, H = 255;
    const values = data.rows.map(r => Math.max(0, r.values[0] || 0));
    const total = values.reduce((a,b) => a+b, 0) || 1;
    const colors = ['#2f7fd3','#21a366','#7a5bd3','#d38b2c','#c04f5e','#3b9cb0','#8a9a35','#b56a91'];
    let a0 = -Math.PI / 2, paths = '';
    const cx = 118, cy = 118, rad = 88;
    values.forEach((v, i) => {
      const angle = v / total * Math.PI * 2;
      const a1 = a0 + angle;
      const x0 = cx + Math.cos(a0) * rad, y0 = cy + Math.sin(a0) * rad;
      const x1 = cx + Math.cos(a1) * rad, y1 = cy + Math.sin(a1) * rad;
      const large = angle > Math.PI ? 1 : 0;
      if (v > 0) paths += `<path d="M ${cx} ${cy} L ${x0} ${y0} A ${rad} ${rad} 0 ${large} 1 ${x1} ${y1} Z" fill="${colors[i%colors.length]}" stroke="#fff" stroke-width="2"><title>${esc(data.rows[i].label)}: ${v.toLocaleString()}</title></path>`;
      a0 = a1;
    });
    const legend = data.rows.slice(0, 8).map((r, i) => `<g transform="translate(228,${38 + i*24})"><rect width="9" height="9" rx="2" fill="${colors[i%colors.length]}"/><text x="14" y="8" class="chart-legend-text">${esc((r.label.length>14?r.label.slice(0,13)+'…':r.label))} ${Math.round(values[i]/total*100)}%</text></g>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Pie chart">${paths}${legend}</svg>`;
  }

  /* ------------------------------- bind ---------------------------------- */
  function bind() {
    const root = instance.root;
    const $ = s => root.querySelector(s);
    const $$ = s => Array.from(root.querySelectorAll(s));
    $$('[data-sheet-help]').forEach(b => b.onclick = () => openHelp('sheets'));
    $$('[data-ribbon-tab]').forEach(b => b.onclick = () => {
      const tab = b.dataset.ribbonTab;
      $$('[data-ribbon-tab]').forEach(x => x.classList.toggle('active', x === b));
      const ribbon = root.querySelector('.sheets-toolbar');
      if (ribbon) ribbon.dataset.activeRibbon = tab;
    });
    $$('[data-insert-formula]').forEach(b => b.onclick = () => {
      const input = $('#formula-input');
      if (!input) return;
      input.focus();
      const start = input.selectionStart == null ? input.value.length : input.selectionStart;
      const end = input.selectionEnd == null ? start : input.selectionEnd;
      input.value = input.value.slice(0, start) + b.dataset.insertFormula + input.value.slice(end);
      input.setSelectionRange(start + b.dataset.insertFormula.length, start + b.dataset.insertFormula.length);
      toast('Formula started', 'Finish the range, close the bracket, and press Enter. Use Explain if you need plain language.', { duration:3400 });
    });
    $$('[data-insert-table]').forEach(b => b.onclick = () => {
      const sheet = getSheet();
      const baseR = instance.focus.r, baseC = instance.focus.c;
      const rows = [['Item','Owner','Due'],['New action','Elizabeth','2026-11-12'],['Follow-up','Daniel','2026-11-13']];
      Store.update(s => {
        const w = s.workbooks.find(x => x.id === getWb().id);
        const sh = w.sheets[instance.activeSheet];
        rows.forEach((row, r) => row.forEach((value, c) => {
          const addr = cellAddress(baseC + c, baseR + r);
          sh.cells[addr] = { v:value, s:Object.assign({ border:true }, r === 0 ? { b:true, bg:'#dce9f9', color:'#12365f' } : {}) };
        }));
      });
      render();
      Bus.emit('sheet:table-inserted', { workbookId:getWb().id, sheetName:instance.activeSheet, row:baseR, col:baseC });
      toast('Table inserted', 'A small bordered table is ready. Rename the headers and replace the sample rows.', { kind:'success' });
    });
    $$('[data-toggle-gridlines]').forEach(b => b.onclick = () => {
      Store.update(s => { const w = s.workbooks.find(x => x.id === getWb().id); const sh = w.sheets[instance.activeSheet]; sh.hideGridlines = !sh.hideGridlines; });
      render();
    });
    $$('[data-template-gallery]').forEach(b => b.onclick = openTemplateGallery);
    $$('[data-new-workbook]').forEach(b => b.onclick = newWorkbook);
    $$('[data-save-sheet]').forEach(b => b.onclick = saveWorkbook);
    $$('[data-export-xlsx]').forEach(b => b.onclick = exportWorkbook);
    const importInput = $('#xlsx-import-input');
    $$('[data-import-xlsx]').forEach(b => b.onclick = () => { if (importInput) importInput.click(); });
    if (importInput) importInput.onchange = async () => { const f = importInput.files && importInput.files[0]; importInput.value = ''; await importWorkbookFile(f); };
    $$('[data-undo]').forEach(b => b.onclick = undo);
    $$('[data-redo]').forEach(b => b.onclick = redo);
    $$('[data-style]').forEach(b => b.onclick = () => { const key = b.dataset.style; const active = isStyle(getSheet(), activeAddress(), key); applyStyle({ [key]: active ? null : true }); });
    $$('[data-align]').forEach(b => b.onclick = () => applyStyle({ align:b.dataset.align }));
    $$('[data-border]').forEach(b => b.onclick = () => { const c = getSheet().cells[activeAddress()]; const on = c && c.s && c.s.border; applyStyle({ border:on ? null : true }); });
    $$('[data-fmt]').forEach(b => b.onclick = () => applyStyle({ fmt:b.dataset.fmt }));
    const fill = $('#fill-color'); if (fill) fill.onchange = () => applyStyle({ bg:fill.value });
    const text = $('#text-color'); if (text) text.onchange = () => applyStyle({ color:text.value });
    $$('[data-freeze]').forEach(b => b.onclick = e => {
      const r = b.getBoundingClientRect();
      const sheet = getSheet();
      OS.contextMenu(r.left, r.bottom + 4, [
        { label:'Freeze top row', icon:'❄', action:() => setFreeze(1,0) },
        { label:'Freeze first column', icon:'❄', action:() => setFreeze(0,1) },
        { label:'Freeze top row + first column', icon:'❄', action:() => setFreeze(1,1) },
        { separator:true },
        { label:'Unfreeze panes', icon:'✕', action:() => setFreeze(0,0) }
      ]);
    });
    $$('[data-filter]').forEach(b => b.onclick = openFilter);
    $$('[data-sort-asc]').forEach(b => b.onclick = () => sortSelected('asc'));
    $$('[data-sort-desc]').forEach(b => b.onclick = () => sortSelected('desc'));
    $$('[data-conditional]').forEach(b => b.onclick = openConditional);
    $$('[data-chart]').forEach(b => b.onclick = insertChart);
    $$('[data-close-chart]').forEach(b => b.onclick = () => { pushUndo(JSON.stringify(getWb())); const wb = getWb(); Store.update(s => { const w = s.workbooks.find(x => x.id === wb.id); w.sheets[instance.activeSheet].chart = null; }); render(); });
    $$('[data-chart-type]').forEach(b => b.onclick = () => { pushUndo(JSON.stringify(getWb())); const wb = getWb(); Store.update(s => { const w = s.workbooks.find(x => x.id === wb.id); const sh = w.sheets[instance.activeSheet]; if (sh.chart) sh.chart.type = b.dataset.chartType; }); Bus.emit('sheet:chart-updated', { workbookId:wb.id, sheetName:instance.activeSheet, type:b.dataset.chartType }); render(); });
    $$('[data-explain]').forEach(b => b.onclick = explainSelected);
    $$('[data-explain-chart]').forEach(b => b.onclick = explainChart);
    $$('[data-formula-enter]').forEach(b => b.onclick = applyFormulaBar);
    $$('[data-formula-cancel]').forEach(b => b.onclick = () => { render(); });
    $('#formula-input').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); applyFormulaBar(); } if (e.key === 'Escape') { render(); } };
    $('#name-box').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); gotoAddress(e.target.value); } };
    $$('[data-sheet-tab]').forEach(b => {
      b.onclick = () => { instance.activeSheet = b.dataset.sheetTab; instance.anchor = {r:0,c:0}; instance.focus = {r:0,c:0}; render(); Bus.emit('sheet:tab-opened', { workbookId:instance.workbookId, sheetName:instance.activeSheet }); };
      b.ondblclick = () => renameSheet(b.dataset.sheetTab);
    });
    $$('[data-add-sheet]').forEach(b => b.onclick = addSheet);
    bindGrid();
    bindFillHandle();
  }

  function bindGrid() {
    const root = instance.root;
    const table = root.querySelector('.sheet-grid');
    if (!table) return;
    table.onmousedown = e => {
      const td = e.target.closest('td[data-cell]');
      if (!td) return;
      if (e.target.closest('#fill-handle')) return;
      if (instance.editing) return;
      const c = Number(td.dataset.col), r = Number(td.dataset.row);
      if (e.shiftKey) instance.focus = { c, r };
      else { instance.anchor = { c, r }; instance.focus = { c, r }; }
      instance.dragging = true;
      updateSelectionChrome();
      e.preventDefault();
      table.focus({ preventScroll:true });
    };
    table.onmouseover = e => {
      if (!instance.dragging) return;
      const td = e.target.closest('td[data-cell]');
      if (!td) return;
      instance.focus = { c:Number(td.dataset.col), r:Number(td.dataset.row) };
      updateSelectionChrome();
    };
    table.ondblclick = e => {
      const td = e.target.closest('td[data-cell]');
      if (td) startEdit(td.dataset.cell, null, false);
    };
    table.ontouchstart = null;
    document.addEventListener('mouseup', onDocMouseUp);
    table.onkeydown = onGridKeydown;
    table.onpaste = onPaste;
    table.onselectstart = e => { if (e.target.closest('td')) e.preventDefault(); };
  }
  function onDocMouseUp() { instance.dragging = false; }

  function onGridKeydown(e) {
    if (instance.editing) return;
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) return;
    const key = e.key;
    if (e.ctrlKey || e.metaKey) {
      if (key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
      if (key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
      if (key.toLowerCase() === 'c') { e.preventDefault(); copySelection(false); return; }
      if (key.toLowerCase() === 'x') { e.preventDefault(); copySelection(true); return; }
      if (key.toLowerCase() === 'v') { e.preventDefault(); pasteSelection(); return; }
      if (key.toLowerCase() === 'b') { e.preventDefault(); applyStyle({ b:!isStyle(getSheet(),activeAddress(),'b') ? true : null }); return; }
      if (key.toLowerCase() === 'a') { e.preventDefault(); instance.anchor = {c:0,r:0}; instance.focus = {c:COLS-1,r:ROWS-1}; updateSelectionChrome(); return; }
      return;
    }
    if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
      e.preventDefault();
      const delta = { ArrowUp:[0,-1], ArrowDown:[0,1], ArrowLeft:[-1,0], ArrowRight:[1,0] }[key];
      const next = { c:E.clamp(instance.focus.c + delta[0],0,COLS-1), r:E.clamp(instance.focus.r + delta[1],0,ROWS-1) };
      if (e.shiftKey) instance.focus = next; else { instance.anchor = next; instance.focus = next; }
      updateSelectionChrome();
      ensureActiveVisible();
      return;
    }
    if (key === 'Enter') { e.preventDefault(); moveSelection(0,1); return; }
    if (key === 'Tab') { e.preventDefault(); moveSelection(e.shiftKey ? -1 : 1,0); return; }
    if (key === 'F2') { e.preventDefault(); startEdit(activeAddress(), null, false); return; }
    if (key === 'Delete' || key === 'Backspace') { e.preventDefault(); clearSelected(); return; }
    if (key === 'Escape') { return; }
    if (key.length === 1 && !e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      startEdit(activeAddress(), key, true);
    }
  }

  function moveSelection(dc, dr) {
    const next = { c:E.clamp(instance.focus.c + dc,0,COLS-1), r:E.clamp(instance.focus.r + dr,0,ROWS-1) };
    instance.anchor = next; instance.focus = next;
    updateSelectionChrome();
    ensureActiveVisible();
  }

  function updateSelectionChrome() {
    const root = instance.root;
    if (!root) return;
    const sheet = getSheet();
    const active = activeAddress();
    const rect = selectionRect();
    root.querySelectorAll('td[data-cell]').forEach(td => {
      const c = Number(td.dataset.col), r = Number(td.dataset.row);
      const selected = r >= rect.r1 && r <= rect.r2 && c >= rect.c1 && c <= rect.c2;
      td.classList.toggle('selected-cell', selected);
      td.classList.toggle('active-cell', td.dataset.cell === active);
      if (td.dataset.cell === active && !td.querySelector('#fill-handle')) {
        const span = document.createElement('span');
        span.className = 'fill-handle'; span.id = 'fill-handle'; span.title = 'Drag to fill down or right';
        td.appendChild(span);
        span.onmousedown = startFillDrag;
      }
      if (td.dataset.cell !== active) { const fh = td.querySelector('#fill-handle'); if (fh) fh.remove(); }
    });
    root.querySelectorAll('.col-head').forEach(th => th.classList.toggle('selected', Number(th.dataset.col) >= rect.c1 && Number(th.dataset.col) <= rect.c2));
    root.querySelectorAll('.row-head').forEach(th => th.classList.toggle('selected', Number(th.dataset.row) >= rect.r1 && Number(th.dataset.row) <= rect.r2));
    const nameBox = root.querySelector('#name-box');
    if (nameBox) nameBox.value = rect.r1 === rect.r2 && rect.c1 === rect.c2 ? active : `${cellAddress(rect.c1,rect.r1)}:${cellAddress(rect.c2,rect.r2)}`;
    const formula = root.querySelector('#formula-input');
    if (formula) formula.value = rawAt(sheet, active);
    const stat = root.querySelector('.sheet-status span');
    if (stat) {
      const computed = computedFor(sheet);
      const stats = selectionStats(sheet, computed, rect);
      stat.textContent = stats.count ? `${stats.count} cells · Sum ${Utils.formatNumber(stats.sum)} · Avg ${Utils.formatNumber(stats.avg)}` : 'Ready';
    }
  }

  function ensureActiveVisible() {
    const root = instance.root;
    if (!root) return;
    const td = root.querySelector(`td[data-cell="${activeAddress()}"]`);
    if (!td) return;
    const sc = root.querySelector('.sheet-scroll');
    if (!sc) return;
    const tr = td.getBoundingClientRect(), sr = sc.getBoundingClientRect();
    if (tr.bottom > sr.bottom - 4) sc.scrollTop += tr.bottom - sr.bottom + 12;
    if (tr.top < sr.top + 28) sc.scrollTop -= sr.top + 28 - tr.top + 8;
    if (tr.right > sr.right - 4) sc.scrollLeft += tr.right - sr.right + 12;
    if (tr.left < sr.left + 50) sc.scrollLeft -= sr.left + 50 - tr.left + 8;
  }

  /* ------------------------------- editing ------------------------------- */
  function startEdit(address, initial, replace) {
    if (instance.editing) return;
    const root = instance.root;
    const td = root.querySelector(`td[data-cell="${address}"]`);
    if (!td) return;
    const sheet = getSheet();
    const raw = rawAt(sheet, address);
    instance.editing = true;
    td.classList.add('editing-cell');
    td.innerHTML = `<input class="cell-editor" id="cell-editor" type="text" value="${esc(initial != null ? initial : raw)}" aria-label="Edit ${esc(address)}">`;
    const input = td.querySelector('#cell-editor');
    if (replace && initial != null) input.value = initial;
    input.focus();
    if (!replace) input.select();
    else input.setSelectionRange(input.value.length, input.value.length);
    let committed = false, cancelled = false;
    const commit = (move) => {
      if (committed || cancelled) return;
      committed = true;
      const value = input.value;
      instance.editing = false;
      setCellRaw(address, value);
      if (move) { instance.anchor = { ...parseAddr(address) }; instance.focus = { ...parseAddr(address) }; if (move === 'down') moveSelection(0,1); else if (move === 'right') moveSelection(1,0); }
    };
    input.onkeydown = e => {
      if (e.key === 'Enter') { e.preventDefault(); const val = input.value; committed = true; instance.editing = false; setCellRaw(address, val); moveSelection(0,1); }
      else if (e.key === 'Tab') { e.preventDefault(); const val = input.value; committed = true; instance.editing = false; setCellRaw(address, val); moveSelection(1,0); }
      else if (e.key === 'Escape') { e.preventDefault(); cancelled = true; instance.editing = false; render(); }
      else if (e.key === 'F2') { e.preventDefault(); }
    };
    input.onblur = () => { if (!committed && !cancelled) { committed = true; instance.editing = false; setCellRaw(address, input.value); } };
  }
  function parseAddr(addr) { const ref = E.parseRef(addr); return { c:ref ? ref.col : 0, r:ref ? ref.row : 0 }; }

  function applyFormulaBar() {
    const root = instance.root;
    const input = root.querySelector('#formula-input');
    if (!input) return;
    setCellRaw(activeAddress(), input.value);
    setTimeout(() => { const table = instance.root.querySelector('.sheet-grid'); if (table) table.focus(); }, 30);
  }
  function gotoAddress(value) {
    const v = String(value || '').trim();
    const ref = E.parseRef(v);
    if (!ref) { toast('Not a cell address', 'Use a cell address such as D11 or a range such as A1:B4.', { kind:'error' }); return; }
    instance.anchor = { c:ref.col, r:ref.row };
    instance.focus = { c:ref.col, r:ref.row };
    updateSelectionChrome();
    ensureActiveVisible();
    const table = instance.root.querySelector('.sheet-grid'); if (table) table.focus();
  }

  /* --------------------------- copy / paste ----------------------------- */
  function copySelection(cut) {
    const sheet = getSheet();
    const rect = selectionRect();
    const matrix = [];
    for (let r = rect.r1; r <= rect.r2; r++) {
      const row = [];
      for (let c = rect.c1; c <= rect.c2; c++) row.push(rawAt(sheet, cellAddress(c, r)));
      matrix.push(row);
    }
    instance.clipboard = { matrix, origin:{ c:rect.c1, r:rect.r1 }, cut:!!cut };
    Utils.copyText(matrix.map(row => row.join('\t')).join('\n'));
    if (cut) {
      pushUndo(JSON.stringify(getWb()));
      const wb = getWb();
      Store.update(s => {
        const w = s.workbooks.find(x => x.id === wb.id);
        const sh = w.sheets[instance.activeSheet];
        for (let r = rect.r1; r <= rect.r2; r++) for (let c = rect.c1; c <= rect.c2; c++) {
          const addr = cellAddress(c,r);
          if (sh.cells[addr]) { if (sh.cells[addr].s) sh.cells[addr].v = ''; else delete sh.cells[addr]; }
        }
      });
      Bus.emit('sheet:cut', { workbookId:wb.id, sheetName:instance.activeSheet, cells:selectedAddresses() });
      render();
    }
    toast(cut ? 'Cells cut' : 'Cells copied', `${matrix.length} × ${matrix[0] ? matrix[0].length : 0} cells. Paste with Ctrl+V.`, { duration:2500 });
  }

  function pasteMatrix(matrix) {
    const sheet = getSheet();
    const origin = instance.focus;
    pushUndo(JSON.stringify(getWb()));
    const wb = getWb();
    Store.update(s => {
      const w = s.workbooks.find(x => x.id === wb.id);
      const sh = w.sheets[instance.activeSheet];
      matrix.forEach((row, dr) => row.forEach((raw, dc) => {
        const addr = cellAddress(origin.c + dc, origin.r + dr);
        if (addr.length > 8) return;
        const old = sh.cells[addr];
        sh.cells[addr] = old && old.s ? { v:String(raw), s:old.s } : { v:String(raw) };
      }));
    });
    const computed = E.evaluateSheet(getSheet());
    Bus.emit('sheet:pasted', { workbookId:wb.id, sheetName:instance.activeSheet, cell:cellAddress(origin.c,origin.r), count:matrix.length * (matrix[0]||[]).length, values:matrix.flat().slice(0,20) });
    instance.clipboard = null;
    render();
    toast('Pasted', 'The clipboard content was inserted at the selected cell.', { kind:'success', duration:2500 });
  }

  function pasteSelection() {
    if (!instance.clipboard) { toast('Nothing copied', 'Select cells and press Ctrl+C first. You can also paste tab-separated text from another app.', { duration:3200 }); return; }
    const source = instance.clipboard;
    const origin = instance.focus;
    const shifted = source.matrix.map((row, dr) => row.map((raw, dc) => {
      if (String(raw).startsWith('=')) return E.shiftFormula(raw, origin.r - source.origin.r, origin.c - source.origin.c);
      return raw;
    }));
    pasteMatrix(shifted);
  }

  function onPaste(e) {
    if (instance.editing) return;
    const text = e.clipboardData && e.clipboardData.getData('text/plain');
    if (!text) return;
    e.preventDefault();
    const rows = text.replace(/\r/g, '').split('\n').filter((line, i, arr) => line !== '' || i < arr.length - 1);
    const matrix = rows.map(row => row.split('\t'));
    pasteMatrix(matrix);
  }

  /* --------------------------- fill handle ------------------------------ */
  function bindFillHandle() {
    const handle = instance.root.querySelector('#fill-handle');
    if (handle) handle.onmousedown = startFillDrag;
  }
  function startFillDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    instance.filling = true;
    instance.fillTarget = { ...instance.focus };
    const rect = selectionRect();
    instance.root.classList.add('is-filling');
    const move = ev => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const td = el && el.closest && el.closest('td[data-cell]');
      if (!td) return;
      const c = Number(td.dataset.col), r = Number(td.dataset.row);
      instance.fillTarget = { c, r };
      instance.root.querySelectorAll('td.fill-preview').forEach(x => x.classList.remove('fill-preview'));
      const r1 = Math.min(rect.r1, r), r2 = Math.max(rect.r2, r), c1 = Math.min(rect.c1, c), c2 = Math.max(rect.c2, c);
      for (let rr = r1; rr <= r2; rr++) for (let cc = c1; cc <= c2; cc++) {
        if (rr >= rect.r1 && rr <= rect.r2 && cc >= rect.c1 && cc <= rect.c2) continue;
        const td2 = instance.root.querySelector(`td[data-cell="${cellAddress(cc,rr)}"]`); if (td2) td2.classList.add('fill-preview');
      }
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      instance.root.classList.remove('is-filling');
      instance.root.querySelectorAll('td.fill-preview').forEach(x => x.classList.remove('fill-preview'));
      applyFill(rect, instance.fillTarget);
      instance.filling = false;
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }
  function applyFill(rect, target) {
    if (!target) return;
    if (target.r === rect.r2 && target.c === rect.c2) return;
    const fillDown = target.r > rect.r2;
    const fillRight = target.c > rect.c2;
    if (!fillDown && !fillRight) return;
    const sheet = getSheet();
    pushUndo(JSON.stringify(getWb()));
    const wb = getWb();
    const edits = [];
    Store.update(s => {
      const w = s.workbooks.find(x => x.id === wb.id);
      const sh = w.sheets[instance.activeSheet];
      if (fillDown) {
        const endRow = Math.min(ROWS - 1, target.r);
        for (let c = rect.c1; c <= rect.c2; c++) {
          for (let r = rect.r2 + 1; r <= endRow; r++) {
            const sourceAddr = cellAddress(c, rect.r1 + ((r - rect.r1) % Math.max(1, rect.r2 - rect.r1 + 1)));
            const source = sh.cells[sourceAddr];
            if (!source) continue;
            const addr = cellAddress(c, r);
            const offset = r - (rect.r1 + ((r - rect.r1) % Math.max(1, rect.r2 - rect.r1 + 1)));
            const raw = source.v != null ? String(source.v) : '';
            const val = raw.startsWith('=') ? E.shiftFormula(raw, offset, 0) : raw;
            sh.cells[addr] = source.s ? { v:val, s:JSON.parse(JSON.stringify(source.s)) } : { v:val };
            edits.push({ cell:addr, value:val });
          }
        }
      }
      if (fillRight) {
        const endCol = Math.min(COLS - 1, target.c);
        for (let r = rect.r1; r <= rect.r2; r++) {
          for (let c = rect.c2 + 1; c <= endCol; c++) {
            const sourceAddr = cellAddress(rect.c1 + ((c - rect.c1) % Math.max(1, rect.c2 - rect.c1 + 1)), r);
            const source = sh.cells[sourceAddr];
            if (!source) continue;
            const addr = cellAddress(c, r);
            const offset = c - (rect.c1 + ((c - rect.c1) % Math.max(1, rect.c2 - rect.c1 + 1)));
            const raw = source.v != null ? String(source.v) : '';
            const val = raw.startsWith('=') ? E.shiftFormula(raw, 0, offset) : raw;
            sh.cells[addr] = source.s ? { v:val, s:JSON.parse(JSON.stringify(source.s)) } : { v:val };
            edits.push({ cell:addr, value:val });
          }
        }
      }
    });
    instance.focus = { c:Math.max(rect.c2, target.c), r:Math.max(rect.r2, target.r) };
    Bus.emit('sheet:filled', { workbookId:wb.id, sheetName:instance.activeSheet, cells:edits.map(e => e.cell), count:edits.length });
    render();
    toast('Fill applied', `${edits.length} cell${edits.length === 1 ? '' : 's'} filled. Formulas kept their relative references.`, { kind:'success', duration:3200 });
  }

  /* ------------------------------- freeze -------------------------------- */
  function setFreeze(row, col) {
    pushUndo(JSON.stringify(getWb()));
    const wb = getWb();
    Store.update(s => { const w = s.workbooks.find(x => x.id === wb.id); w.sheets[instance.activeSheet].freeze = { row, col }; });
    Bus.emit('sheet:freeze', { workbookId:wb.id, sheetName:instance.activeSheet, row, col });
    render();
    toast(row || col ? 'Panes frozen' : 'Panes unfrozen', row ? (col ? 'Top row and first column stay visible.' : 'Top row stays visible.') : col ? 'First column stays visible.' : 'The whole sheet scrolls normally.', { duration:2600 });
  }

  /* ------------------------------ filters -------------------------------- */
  function openFilter() {
    const sheet = getSheet();
    const col = instance.focus.c;
    const bounds = E.usedBounds(sheet);
    if (bounds.maxRow < 2) { toast('No data to filter', 'Add a header row and at least one data row first.', { kind:'error' }); return; }
    const values = new Set();
    for (let r = 1; r <= bounds.maxRow; r++) {
      const c = sheet.cells[cellAddress(col,r)];
      if (c) values.add(String(c.v));
    }
    const active = sheet.filter && sheet.filter.col === col ? sheet.filter : null;
    modal({
      title:`Filter column ${colLabel(col)}`,
      subtitle:'Choose which values stay visible. Filtering hides rows; it does not delete data.',
      size:'narrow',
      body:`<div class="filter-list">${Array.from(values).map(v => `<label class="checkbox-row"><input type="checkbox" value="${esc(v)}" ${!active || !active.values || active.values.includes(v) ? 'checked' : ''}><span>${esc(v || '(blank)')}</span></label>`).join('')}</div>
        <div class="help-callout" style="margin-top:10px"><span>💡</span><div>Filters are best when your table has one header row and no blank rows in the data.</div></div>`,
      footer:`<div class="left-actions"><button class="btn danger small" data-clear-filter>Clear filter</button></div><button class="btn" data-cancel>Cancel</button><button class="btn primary" data-apply-filter>Apply filter</button>`,
      onOpen({ modal: el, close }) {
        el.querySelector('[data-cancel]').onclick = close;
        el.querySelector('[data-clear-filter]').onclick = () => {
          pushUndo(JSON.stringify(getWb()));
          const wb = getWb();
          Store.update(s => { const w = s.workbooks.find(x => x.id === wb.id); w.sheets[instance.activeSheet].hiddenRows = []; w.sheets[instance.activeSheet].filter = null; });
          close(); render(); toast('Filter cleared', 'All rows are visible again.', { kind:'success' });
        };
        el.querySelector('[data-apply-filter]').onclick = () => {
          const checked = Array.from(el.querySelectorAll('.filter-list input:checked')).map(x => x.value);
          pushUndo(JSON.stringify(getWb()));
          const wb = getWb();
          const hidden = [];
          for (let r = 1; r <= E.usedBounds(sheet).maxRow; r++) {
            const c = sheet.cells[cellAddress(col,r)];
            const v = c ? String(c.v) : '';
            if (!checked.includes(v)) hidden.push(r + 1);
          }
          Store.update(s => {
            const w = s.workbooks.find(x => x.id === wb.id);
            w.sheets[instance.activeSheet].hiddenRows = hidden;
            w.sheets[instance.activeSheet].filter = { col, values:checked };
          });
          Bus.emit('sheet:filtered', { workbookId:wb.id, sheetName:instance.activeSheet, column:colLabel(col), hidden:hidden.length });
          close(); render();
          toast('Filter applied', `${hidden.length} row${hidden.length === 1 ? '' : 's'} hidden. Clear it from the Filter button whenever you need.`, { kind:'success' });
        };
      }
    });
  }

  /* -------------------------------- sort --------------------------------- */
  function sortSelected(dir) {
    const sheet = getSheet();
    const col = instance.focus.c;
    const bounds = E.usedBounds(sheet);
    if (bounds.maxRow < 2) { toast('No data to sort', 'Add data below the header row first.', { kind:'error' }); return; }
    pushUndo(JSON.stringify(getWb()));
    const wb = getWb();
    Store.update(s => {
      const w = s.workbooks.find(x => x.id === wb.id);
      const sh = w.sheets[instance.activeSheet];
      const rows = [];
      for (let r = 1; r <= bounds.maxRow; r++) {
        const row = { original:r, cells:{}, key:'' };
        for (let c = 0; c <= bounds.maxCol; c++) {
          const addr = cellAddress(c,r);
          if (sh.cells[addr]) row.cells[c] = JSON.parse(JSON.stringify(sh.cells[addr]));
        }
        const comp = E.evaluateSheet({ cells:sh.cells }).cells; // unused; use direct display below
        const keyCell = row.cells[col];
        row.key = keyCell ? String(keyCell.v) : '';
        rows.push(row);
      }
      rows.sort((a,b) => {
        const an = Number(a.key), bn = Number(b.key);
        const cmp = (!isNaN(an) && !isNaN(bn) && a.key !== '' && b.key !== '') ? an - bn : String(a.key).localeCompare(String(b.key), undefined, { numeric:true, sensitivity:'base' });
        return dir === 'asc' ? cmp : -cmp;
      });
      const newCells = {};
      rows.forEach((row, idx) => {
        Object.entries(row.cells).forEach(([c, cell]) => { newCells[cellAddress(Number(c), idx + 1)] = cell; });
      });
      sh.cells = newCells;
      sh.hiddenRows = [];
      sh.filter = null;
    });
    Bus.emit('sheet:sorted', { workbookId:wb.id, sheetName:instance.activeSheet, column:colLabel(col), direction:dir });
    render();
    toast('Sorted', `Rows sorted ${dir === 'asc' ? 'A→Z' : 'Z→A'} by column ${colLabel(col)}.`, { kind:'success' });
  }

  /* -------------------------- conditional formatting --------------------- */
  function openConditional() {
    const range = (() => { const rect = selectionRect(); return rect.r1 === rect.r2 && rect.c1 === rect.c2 ? activeAddress() : `${cellAddress(rect.c1,rect.r1)}:${cellAddress(rect.c2,rect.r2)}`; })();
    modal({
      title:'Conditional formatting',
      subtitle:`Apply a rule to ${range}. A rule changes the cell color automatically when its value matches a condition.`,
      size:'narrow',
      body:`<div class="form-grid"><div class="field span-2"><label for="cf-type">Rule</label><select id="cf-type" class="select"><option value="lessThan">Cell value is less than</option><option value="greaterThan">Cell value is greater than</option><option value="contains">Text contains</option><option value="equals">Text equals</option></select></div><div class="field"><label for="cf-value">Value</label><input id="cf-value" class="input" value="0"></div><div class="field"><label for="cf-fill">Fill color</label><input id="cf-fill" class="input" type="color" value="#fdeceb"></div></div><div class="help-callout" style="margin-top:12px"><span>🎨</span><div>Example: a variance below zero turns red. That helps the executive see the problem without reading every number.</div></div>`,
      footer:`<div class="left-actions"><button class="btn danger small" data-clear-cf>Clear all rules</button></div><button class="btn" data-cancel>Cancel</button><button class="btn primary" data-apply-cf>Apply rule</button>`,
      onOpen({ modal: el, close }) {
        el.querySelector('[data-cancel]').onclick = close;
        el.querySelector('[data-clear-cf]').onclick = () => {
          pushUndo(JSON.stringify(getWb()));
          const wb = getWb();
          Store.update(s => { const w = s.workbooks.find(x => x.id === wb.id); w.sheets[instance.activeSheet].conditionalFormats = []; });
          close(); render(); toast('Conditional rules cleared', 'The sheet uses normal formatting again.', { kind:'success' });
        };
        el.querySelector('[data-apply-cf]').onclick = () => {
          const type = el.querySelector('#cf-type').value;
          const value = el.querySelector('#cf-value').value;
          const fill = el.querySelector('#cf-fill').value;
          pushUndo(JSON.stringify(getWb()));
          const wb = getWb();
          Store.update(s => {
            const w = s.workbooks.find(x => x.id === wb.id);
            const sh = w.sheets[instance.activeSheet];
            sh.conditionalFormats = sh.conditionalFormats || [];
            sh.conditionalFormats.push({ range, type, value: type === 'lessThan' || type === 'greaterThan' ? Number(value) : value, style:{ bg:fill, color:'#5b1b14' } });
          });
          Bus.emit('sheet:conditional-applied', { workbookId:wb.id, sheetName:instance.activeSheet, range, rule:type });
          close(); render(); toast('Rule applied', 'Matching cells will recolor automatically as values change.', { kind:'success' });
        };
      }
    });
  }

  /* ------------------------------- charts -------------------------------- */
  function insertChart() {
    const sheet = getSheet();
    const rect = selectionRect();
    const range = `${cellAddress(rect.c1,rect.r1)}:${cellAddress(rect.c2,rect.r2)}`;
    pushUndo(JSON.stringify(getWb()));
    const wb = getWb();
    Store.update(s => {
      const w = s.workbooks.find(x => x.id === wb.id);
      const sh = w.sheets[instance.activeSheet];
      sh.chart = { type:'bar', range, title:`${instance.activeSheet} chart`, labelCol:colLabel(rect.c1), seriesCols:[] };
    });
    Bus.emit('sheet:chart-created', { workbookId:wb.id, sheetName:instance.activeSheet, range, type:'bar' });
    render();
    toast('Chart inserted', 'A bar chart was created from the selected range. Use the chart panel to switch to a pie chart.', { kind:'success' });
  }
  function explainChart() {
    const sheet = getSheet();
    if (!sheet.chart) return;
    const data = chartData(sheet, computedFor(sheet));
    modal({
      title:'How this chart is built',
      subtitle:'Charts show the result of formulas, but they do not change the data.',
      size:'narrow',
      body:`<div class="help-callout"><span>📊</span><div>The chart reads the range <strong>${esc(sheet.chart.range)}</strong>. It takes the labels from column <strong>${esc(sheet.chart.labelCol || 'A')}</strong> and numeric values from the selected series columns.</div></div>${data ? `<div class="chart-explain-rows">${data.rows.slice(0,8).map(r => `<div class="chart-explain-row"><span>${esc(r.label)}</span><strong>${r.values.map(v => v == null ? '—' : esc(Utils.formatNumber(v))).join(' · ')}</strong></div>`).join('')}</div>` : '<p class="muted" style="margin-top:12px">There is no numeric data to chart yet.</p>'}<p class="muted-small" style="margin-top:12px">When a formula recalculates, the chart redraws from the new numbers.</p>`,
      footer:`<button class="btn primary" data-close>Close</button>`,
      onOpen({ modal: el, close }) { el.querySelector('[data-close]').onclick = close; }
    });
  }

  /* ----------------------------- explain --------------------------------- */
  function explainSelected() {
    const sheet = getSheet();
    const address = activeAddress();
    const raw = rawAt(sheet, address);
    const info = E.explainFormula(raw, sheet, address);
    modal({
      title:info.title,
      subtitle:`Selected cell ${address}${sheet.cells[address] && sheet.cells[address].s && sheet.cells[address].s.fmt ? ' · formatted as ' + sheet.cells[address].s.fmt : ''}`,
      size:'wide',
      body:`<div class="formula-explain-formula"><code>${esc(raw || '(empty cell)')}</code>${info.sample ? `<span class="pill blue">Result: ${esc(info.sample)}</span>` : ''}</div>
        <p style="font-size:12.5px;line-height:1.6;color:#3f5065;margin-top:13px">${esc(info.explanation)}</p>
        <div class="formula-parts">${(info.parts || []).map(p => `<div class="formula-part"><strong>${esc(p.label)}</strong><p>${esc(p.text)}</p></div>`).join('')}</div>
        <div class="help-callout" style="margin-top:14px"><span>💡</span><div>Formulas start with <strong>=</strong>. A range like <strong>D2:D9</strong> means every cell from D2 down to D9. Change a number in the range and every formula that uses it recalculates automatically.</div></div>`,
      footer:`<div class="left-actions"><button class="btn" data-open-glossary>Open glossary</button></div><button class="btn primary" data-close>Got it</button>`,
      onOpen({ modal: el, close }) {
        el.querySelector('[data-close]').onclick = close;
        el.querySelector('[data-open-glossary]').onclick = () => { close(); setTimeout(() => Utils.openGlossary('formula'), 80); };
      }
    });
  }

  /* ------------------------------ templates ------------------------------ */
  const TEMPLATE_INFO = {
    'wb-expenses': { icon:'💳', label:'Executive Expense Report', desc:'Budget vs actual, variance formulas, conditional formatting, and a bar chart.' },
    'wb-travel': { icon:'✈', label:'Travel Itinerary & Budget', desc:'A three-city itinerary, budget cap, formula-driven headroom, and charts.' },
    'wb-actions': { icon:'✅', label:'Meeting Action Tracker', desc:'Owners, due dates, priorities, status counts, and a status chart.' },
    'wb-contacts': { icon:'👥', label:'Contact & Vendor List', desc:'The full training directory with time zones and communication styles.' },
    'wb-board': { icon:'🏛', label:'Board Meeting Agenda & Attendees', desc:'Attendance tracker, dietary notes, counts, and a timed board agenda.' }
  };

  function openTemplateGallery() {
    const wbs = Store.state.workbooks.filter(w => w.template);
    modal({
      title:'Workbook templates',
      subtitle:'Every template is pre-filled with realistic, fictional data so you can practise instead of starting from a blank page.',
      size:'wide',
      body:`<div class="template-gallery">${wbs.map(w => `<button class="template-gallery-card" data-open-wb="${w.id}"><span class="template-gallery-icon">${(TEMPLATE_INFO[w.id] || {}).icon || '▦'}</span><span class="template-gallery-copy"><strong>${esc(w.name)}</strong><p>${esc((TEMPLATE_INFO[w.id] || {}).desc || 'A pre-filled training workbook.')}</p><span class="template-gallery-meta">${Object.keys(w.sheets).length} sheet${Object.keys(w.sheets).length === 1 ? '' : 's'} · ${Object.keys(w.sheets[w.activeSheet] ? w.sheets[w.activeSheet].cells : {}).length} cells</span></span><span class="template-gallery-open">Open ↗</span></button>`).join('')}</div>`,
      footer:`<button class="btn primary" data-close>Close</button>`,
      onOpen({ modal: el, close }) {
        el.querySelector('[data-close]').onclick = close;
        el.querySelectorAll('[data-open-wb]').forEach(b => b.onclick = () => { close(); openWorkbook(b.dataset.openWb); });
      }
    });
  }

  function openWorkbook(id) {
    const wb = Store.workbookById(id);
    if (!wb) { toast('Workbook not found', 'It may have been removed. Choose another template.', { kind:'error' }); return; }
    instance.workbookId = wb.id;
    instance.activeSheet = wb.activeSheet || Object.keys(wb.sheets)[0];
    instance.anchor = { c:0, r:0 }; instance.focus = { c:0, r:0 };
    instance.undoStack = []; instance.redoStack = [];
    Store.update(s => { s.activeWorkbookId = wb.id; });
    if (wb.fileId) Store.touchFile(wb.fileId);
    render();
    Bus.emit('sheet:workbook-opened', { workbookId:wb.id, name:wb.name, sheetName:instance.activeSheet });
    toast('Workbook opened', wb.name, { kind:'success', duration:2600 });
  }

  function newWorkbook() {
    const wb = {
      id:Utils.uid('wb'), name:'Untitled workbook', fileId:null, activeSheet:'Sheet1',
      sheets:{ Sheet1:{ name:'Sheet1', cells:{}, colWidths:{ A:150,B:150,C:150,D:150,E:150,F:150 }, rowHeights:{}, freeze:{row:0,col:0}, conditionalFormats:[], chart:null, filter:null, hiddenRows:[] } }
    };
    Store.update(s => s.workbooks.push(wb));
    instance.workbookId = wb.id; instance.activeSheet = 'Sheet1';
    instance.anchor = { c:0, r:0 }; instance.focus = { c:0, r:0 };
    instance.undoStack = []; instance.redoStack = [];
    render();
    Bus.emit('sheet:workbook-created', { workbookId:wb.id, name:wb.name });
    toast('New workbook', 'A blank workbook is ready. Use Save to store it in Files.', { kind:'success' });
  }

  function exportWorkbook() {
    const wb = getWb();
    if (!wb) return;
    try {
      const bytes = XLSX.writeWorkbook(wb);
      const filename = String(wb.name || 'workbook').replace(/[\\/:*?"<>|]/g, ' ').trim() + '.xlsx';
      Utils.downloadFile(filename, bytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      Bus.emit('sheet:exported', { workbookId:wb.id, name:wb.name, file:filename, sheets:Object.keys(wb.sheets).length });
      toast('Workbook exported', `${filename} downloads as a real Sheets-compatible file with formulas, text, and basic styles.`, { kind:'success', duration:4400 });
    } catch (err) {
      console.error(err);
      toast('Export failed', err.message || 'The workbook could not be packaged.', { kind:'error' });
    }
  }
  async function importWorkbookFile(file) {
    if (!file) return;
    try {
      toast('Opening workbook', `Reading ${file.name} locally. Nothing is uploaded.`, { duration:2200 });
      const buffer = await file.arrayBuffer();
      const parsed = await XLSX.readWorkbook(buffer, file.name);
      const id = Utils.uid('wb');
      const fileId = Utils.uid('f');
      const sheetNames = Object.keys(parsed.sheets);
      const wb = {
        id, name:parsed.name, fileId, activeSheet:sheetNames[0],
        sheets:parsed.sheets, createdAt:Utils.simNowIso(), updatedAt:Utils.simNowIso(), imported:true
      };
      Store.update(s => {
        s.workbooks.push(wb);
        s.files.push({ id:fileId, parentId:null, name:file.name, type:'sheet', workbookId:id, createdAt:Utils.simNowIso(), updatedAt:Utils.simNowIso(), imported:true });
        s.activeWorkbookId = id;
      });
      Store.saveNow();
      instance.activeSheet = sheetNames[0];
      instance.selection = { r1:1, c1:1, r2:1, c2:1, anchor:null };
      instance.undoStack = []; instance.redoStack = [];
      Bus.emit('sheet:imported', { workbookId:id, name:parsed.name, file:file.name, sheets:sheetNames.length, size:file.size });
      render();
      toast('Workbook imported', `${parsed.name} is open with ${sheetNames.length} worksheet${sheetNames.length === 1 ? '' : 's'}. Imported files stay in this browser.`, { kind:'success', duration:4600 });
    } catch (err) {
      console.error(err);
      toast('Could not import workbook', err.message || 'That file is not a readable .xlsx workbook.', { kind:'error', duration:6200 });
    }
  }

  function saveWorkbook() {
    const wb = getWb();
    if (!wb) return;
    let fileId = wb.fileId;
    Store.update(s => {
      const w = s.workbooks.find(x => x.id === wb.id);
      if (!fileId) {
        fileId = Utils.uid('f');
        w.fileId = fileId;
        s.files.push({ id:fileId, parentId:null, name:w.name + '.xlsx', type:'sheet', workbookId:w.id, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() });
      } else {
        const f = s.files.find(x => x.id === fileId);
        if (f) { f.name = w.name + '.xlsx'; f.updatedAt = new Date().toISOString(); }
      }
      s.activeWorkbookId = w.id;
      const f = s.files.find(x => x.id === fileId);
      if (f) { s.recentFiles = [f.id, ...(s.recentFiles || []).filter(id => id !== f.id)].slice(0,10); }
    });
    Store.saveNow();
    const file = Store.fileById(fileId);
    Bus.emit('sheet:saved', { workbookId:wb.id, fileId, name:wb.name, sheetName:instance.activeSheet, cells:Object.keys(getSheet().cells).length });
    toast('Workbook saved', `${wb.name} is saved in Files${file ? ' · ' + fmtDate(Utils.simNowIso(), 'medium') : ''}.`, { kind:'success' });
    render();
  }

  function addSheet() {
    const wb = getWb();
    const base = 'Sheet';
    let n = Object.keys(wb.sheets).length + 1;
    while (wb.sheets[base + n]) n++;
    const name = base + n;
    pushUndo(JSON.stringify(getWb()));
    Store.update(s => {
      const w = s.workbooks.find(x => x.id === wb.id);
      w.sheets[name] = { name, cells:{}, colWidths:{A:150,B:150,C:150,D:150,E:150,F:150}, rowHeights:{}, freeze:{row:0,col:0}, conditionalFormats:[], chart:null, filter:null, hiddenRows:[] };
    });
    instance.activeSheet = name;
    instance.anchor = {c:0,r:0}; instance.focus = {c:0,r:0};
    render();
    Bus.emit('sheet:sheet-added', { workbookId:wb.id, sheetName:name });
    toast('Sheet added', `${name} is ready.`, { kind:'success' });
  }

  function renameSheet(oldName) {
    modal({
      title:'Rename sheet', size:'narrow',
      body:`<div class="field"><label for="sheet-rename">Sheet name</label><input id="sheet-rename" class="input" value="${esc(oldName)}" maxlength="31" data-tip="Keep sheet names short and descriptive, such as Budget or Itinerary."></div>`,
      footer:`<button class="btn" data-cancel>Cancel</button><button class="btn primary" data-ok>Rename</button>`,
      onOpen({ modal: el, close }) {
        const input = el.querySelector('#sheet-rename');
        el.querySelector('[data-cancel]').onclick = close;
        const go = () => {
          const val = input.value.trim();
          if (!val) { toast('Name required', 'A sheet needs a name.', { kind:'error' }); return; }
          if (val === oldName) { close(); return; }
          if (Store.workbookById(instance.workbookId).sheets[val]) { toast('Name already used', 'Choose a different sheet name.', { kind:'error' }); return; }
          pushUndo(JSON.stringify(getWb()));
          Store.update(s => {
            const w = s.workbooks.find(x => x.id === instance.workbookId);
            w.sheets[val] = w.sheets[oldName];
            w.sheets[val].name = val;
            delete w.sheets[oldName];
            if (w.activeSheet === oldName) w.activeSheet = val;
          });
          instance.activeSheet = val;
          close(); render();
          Bus.emit('sheet:renamed', { workbookId:instance.workbookId, from:oldName, to:val });
        };
        el.querySelector('[data-ok]').onclick = go;
        input.onkeydown = e => { if (e.key === 'Enter') go(); };
        setTimeout(() => { input.focus(); input.select(); }, 30);
      }
    });
  }

  /* ------------------------------- app ---------------------------------- */
  const app = {
    mount(container, win, params) {
      instance = {
        root:document.createElement('div'), win, workbookId:null, activeSheet:null,
        anchor:{ c:0,r:0 }, focus:{ c:0,r:0 }, editing:false, dragging:false, undoStack:[], redoStack:[],
        clipboard:null, filling:false, fillTarget:null
      };
      instance.root.className = 'sheets-root app-fill';
      container.innerHTML = '';
      container.appendChild(instance.root);
      let wb = null;
      if (params && params.fileId) { const f = Store.fileById(params.fileId); if (f && f.workbookId) wb = Store.workbookById(f.workbookId); }
      if (!wb && params && params.workbookId) wb = Store.workbookById(params.workbookId);
      if (!wb) wb = Store.workbookById(Store.state.activeWorkbookId) || Store.state.workbooks[0];
      instance.workbookId = wb ? wb.id : null;
      instance.activeSheet = wb ? (wb.activeSheet || Object.keys(wb.sheets)[0]) : null;
      if (params && params.fileId) Store.touchFile(params.fileId);
      render();
    },
    reopen(params) {
      if (!instance) return;
      if (params && (params.fileId || params.workbookId)) {
        let wb = null;
        if (params.fileId) { const f = Store.fileById(params.fileId); if (f && f.workbookId) wb = Store.workbookById(f.workbookId); }
        if (!wb && params.workbookId) wb = Store.workbookById(params.workbookId);
        if (wb) {
          instance.workbookId = wb.id;
          instance.activeSheet = wb.activeSheet || Object.keys(wb.sheets)[0];
          instance.anchor = {c:0,r:0}; instance.focus = {c:0,r:0};
          instance.undoStack = []; instance.redoStack = [];
          Store.update(s => { s.activeWorkbookId = wb.id; });
          if (wb.fileId) Store.touchFile(wb.fileId);
        }
      }
      render();
      Bus.emit('sheet:reopened', { workbookId:instance.workbookId });
    },
    destroy() { if (instance) { instance.root = null; instance = null; } }
  };
  App.register('sheets', app);

  window.SheetsApp = {
    openWorkbook(id) {
      if (!OS.isOpen('sheets')) { OS.openApp('sheets', { workbookId:id }); return; }
      const wb = Store.workbookById(id);
      if (instance && wb) { instance.workbookId = wb.id; instance.activeSheet = wb.activeSheet || Object.keys(wb.sheets)[0]; render(); }
    },
    save() { if (instance) saveWorkbook(); }
  };
})();
