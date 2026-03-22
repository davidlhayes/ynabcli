(function () {
  const RESERVED_KEYS = new Set(['tax', 'gtax', 'tot', 'disc', 'gc', 'atax', 'gctax', 'dtax']);

  function ynabcliCategoryDebugEnabled() {
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem('ynabcliDebugCategory') === '0') {
        return false;
      }
    } catch (e) {
      /* ignore */
    }
    return true;
  }

  function ynabcliLogCategory(tag, payload) {
    if (!ynabcliCategoryDebugEnabled()) return;
    if (payload !== undefined) {
      console.info('[ynabcli]', tag, payload);
    } else {
      console.info('[ynabcli]', tag);
    }
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function formatMoney(n) {
    if (n == null || Number.isNaN(Number(n))) return '$0.00';
    return '$' + Number(n).toFixed(2);
  }

  const state = {
    step: 1,
    totalDollars: null,
    existingTransaction: null,
    foundCategoryLabel: null,
    payeeId: null,
    payeeName: null,
    accountId: null,
    date: null,
    catalogs: { categories: [], payees: [], accounts: [], taxRates: [] },
    taxRates: [],
    /** When true, grocery (gtax) and liquor (atax) rates match sales tax (tax). */
    lockGroceryLiquorTaxToSales: true,
    postSuccess: false,
  };

  const stepTotal = document.getElementById('step-total');
  const stepHeader = document.getElementById('step-header');
  const step2Actions = document.getElementById('step2-actions');
  const stepDetailLine = document.getElementById('step-detail-line');
  const ruleAfterTotal = document.getElementById('rule-after-total');
  const ruleBeforeLines = document.getElementById('rule-before-lines');
  const confirmationWrap = document.getElementById('confirmation-wrap');
  const inputTotal = document.getElementById('input-total');
  const inputPayee = document.getElementById('input-payee');
  const inputAccount = document.getElementById('input-account');
  const inputDate = document.getElementById('input-date');
  const inputDiscount = document.getElementById('input-discount');
  const inputGiftCard = document.getElementById('input-gift-card');
  const detailRowsContainer = document.getElementById('detail-rows');
  const taxRowsContainer = document.getElementById('tax-rows');
  const taxLockGroceryLiquorToSalesEl = document.getElementById('tax-lock-grocery-liquor-to-sales');
  const payeeList = document.getElementById('payee-list');
  const confirmation = document.getElementById('confirmation');
  const confirmationCategory = document.getElementById('confirmation-category');
  const liveDisplay = document.getElementById('live-display');
  const messageEl = document.getElementById('message');
  const btnNext = document.getElementById('btn-next');
  const btnSubmit = document.getElementById('btn-submit');
  const btnAddRow = document.getElementById('btn-add-row');
  const successSummary = document.getElementById('success-summary');
  const summarySubtotal = document.getElementById('summary-subtotal');
  const summarySalesTax = document.getElementById('summary-sales-tax');
  const summaryTotalEl = document.getElementById('summary-total');
  const splitWorkbench = document.getElementById('split-workbench');
  const splitUnavailableBlock = document.getElementById('split-unavailable-block');
  const btnNewTransaction = document.getElementById('btn-new-transaction');

  let detailRowIndex = 0;
  let salesTaxPersistTimer = null;

  function foundTransactionAllowsSplitUI(txn) {
    if (!txn) return true;
    if (txn.is_split) return false;
    const raw = (txn.category_label || txn.category_name || '').trim();
    if (!raw) return false;
    // Match "Department Store" even when YNAB prefixes emoji (e.g. 🏪) or group names ("Shopping / Department Store").
    return /\bdepartment\s+store\b/i.test(raw);
  }

  function setSplitWorkbenchVisible(show) {
    if (splitWorkbench) splitWorkbench.classList.toggle('hidden', !show);
    if (splitUnavailableBlock) splitUnavailableBlock.classList.toggle('hidden', show);
    if (!show && btnNewTransaction) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => btnNewTransaction.focus());
      });
    }
  }

  function onNewTransaction() {
    state.existingTransaction = null;
    state.foundCategoryLabel = null;
    state.payeeId = null;
    state.payeeName = null;
    state.accountId = null;
    state.date = null;
    state.totalDollars = null;
    state.postSuccess = false;
    successSummary.classList.add('hidden');
    successSummary.innerHTML = '';
    resetDetailRows();
    inputTotal.value = '';
    inputPayee.value = '';
    inputAccount.value = '';
    inputDate.value = '';
    if (inputDiscount) inputDiscount.value = '';
    if (inputGiftCard) inputGiftCard.value = '';
    liveDisplay.innerHTML = '';
    resetSummaryDisplay();
    setMessage('');
    showStep(1);
  }

  function isSplitWorkbenchHidden() {
    return splitWorkbench && splitWorkbench.classList.contains('hidden');
  }

  function getCategoriesWithAbbrev() {
    const { categories = [] } = state.catalogs;
    const sortKey = (name) => (name || '').replace(/^[\s\P{Letter}\p{Number}]*/u, '').trim().toLowerCase();
    return categories.filter((c) => c.abbreviation).sort((a, b) => sortKey(a.name).localeCompare(sortKey(b.name), undefined, { sensitivity: 'base' }));
  }

  function getAbbrevFromCategoryInput(value) {
    if (!value || !value.trim()) return '';
    const raw = value.trim();
    const { categories = [] } = state.catalogs;
    const byName = categories.find((c) => c.abbreviation && c.name && c.name.trim().toLowerCase() === raw.toLowerCase());
    if (byName) return byName.abbreviation;
    const byAbbrev = categories.find((c) => c.abbreviation && c.abbreviation.toLowerCase() === raw.toLowerCase());
    return byAbbrev ? byAbbrev.abbreviation : '';
  }

  function populateCategorySelects() {
    const optionsHtml = ['<option value="">Select category</option>']
      .concat(
        getCategoriesWithAbbrev().map(
          (c) => '<option value="' + escapeHtml(c.name) + '">' + escapeHtml(c.name) + '</option>'
        )
      )
      .join('');
    detailRowsContainer.querySelectorAll('.detail-category').forEach((sel) => {
      const v = sel.value;
      sel.innerHTML = optionsHtml;
      if (v) {
        const match = Array.from(sel.options).some((o) => o.value === v);
        if (match) sel.value = v;
      }
    });
  }

  /** Per-select buffer for multi-letter type-ahead on category dropdowns; cleared on blur. */
  const categoryPrefixBySelect = new WeakMap();

  function ynabcliBufferSnapshot(sel) {
    const v = categoryPrefixBySelect.get(sel);
    return v === undefined ? '(no cache)' : v === '' ? '(empty)' : JSON.stringify(v);
  }

  function isLetterKey(key) {
    return key.length === 1 && /^\p{L}$/u.test(key);
  }

  /** Letters or space (for multi-word category names, e.g. "Pet F" → "Pet Food"). */
  function isCategoryPrefixKey(key) {
    return key.length === 1 && (key === ' ' || /^\p{L}$/u.test(key));
  }

  /** Strip leading emoji / punctuation so "🏪 Department Store" matches "d" and "de". */
  function normalizedCategoryOptionTextForPrefix(text) {
    if (!text) return '';
    return text.toLowerCase().replace(/^[^\p{L}\p{N}]+/gu, '').trim();
  }

  function findFirstOptionByPrefix(sel, prefix) {
    const pl = prefix.toLowerCase().replace(/\s+/g, ' ').trimStart();
    if (!pl) return null;
    const candidates = Array.from(sel.options).filter((o) => {
      if (!o.value) return false;
      const n = normalizedCategoryOptionTextForPrefix(o.text).replace(/\s+/g, ' ');
      return n.length > 0 && n.startsWith(pl);
    });
    // Prefer exact normalized match, then shorter names (so "Clothing" wins over "Clothing Maintenance"
    // for prefix "cl"), then alphabetical tie-break.
    candidates.sort((a, b) => {
      const na = normalizedCategoryOptionTextForPrefix(a.text).replace(/\s+/g, ' ');
      const nb = normalizedCategoryOptionTextForPrefix(b.text).replace(/\s+/g, ' ');
      const exactA = na === pl;
      const exactB = nb === pl;
      if (exactA !== exactB) return exactA ? -1 : 1;
      if (na.length !== nb.length) return na.length - nb.length;
      return a.text.localeCompare(b.text, undefined, { sensitivity: 'base' });
    });
    return candidates[0] || null;
  }

  function dispatchCategoryChangeFromPrefix(sel) {
    sel.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { fromPrefix: true } }));
  }

  function formatTaxRate(rate) {
    const n = Number(rate);
    if (Number.isNaN(n)) return '0';
    return n % 1 === 0 ? String(n) : n.toFixed(1);
  }

  function formatTaxInputValue(rate) {
    const n = Number(rate);
    if (Number.isNaN(n)) return '0';
    return String(Math.round(n * 100) / 100);
  }

  function snapTaxRateToQuarterStep(v) {
    const n = Math.max(0, Number(v) || 0);
    return Math.round(n * 4) / 4;
  }

  const LS_SALES_TAX_RATE_KEY = 'ynabcli.salesTaxRate';

  function loadStoredSalesTaxRate() {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(LS_SALES_TAX_RATE_KEY);
      if (raw == null || raw === '') return null;
      const n = parseFloat(raw);
      if (Number.isNaN(n) || n < 0) return null;
      return snapTaxRateToQuarterStep(n);
    } catch (e) {
      return null;
    }
  }

  function saveSalesTaxRateToStorage(rate) {
    try {
      if (typeof localStorage === 'undefined') return;
      const v = Number(rate);
      if (Number.isNaN(v) || v < 0) return;
      const rounded = Math.round(v * 100) / 100;
      localStorage.setItem(LS_SALES_TAX_RATE_KEY, String(rounded));
    } catch (e) {
      /* ignore quota / private mode */
    }
  }

  function applyStoredSalesTaxRateToState() {
    const stored = loadStoredSalesTaxRate();
    if (stored == null) return;
    const entry = (state.taxRates || []).find((r) => r.abbreviation === 'tax');
    if (entry) entry.rate = stored;
  }

  function persistSalesTaxRateFromState() {
    const sales = (state.taxRates || []).find((r) => r.abbreviation === 'tax');
    if (sales) saveSalesTaxRateToStorage(sales.rate);
  }

  function roundMoney2(x) {
    return Math.round(x * 100) / 100;
  }

  /** Digits-only strings are treated as integer cents (1 → $0.01, 1000 → $10.00). Otherwise parse as dollars. */
  function parseImpliedDecimalDollars(raw) {
    if (raw == null) return NaN;
    const s = String(raw).trim();
    if (s === '') return NaN;
    if (/^\d+$/.test(s)) {
      return roundMoney2(parseInt(s, 10) / 100);
    }
    const n = parseFloat(s.replace(/,/g, ''));
    return Number.isNaN(n) ? NaN : roundMoney2(n);
  }

  function applyImpliedDecimalFormatToInput(inputEl) {
    if (!inputEl) return;
    const raw = inputEl.value.trim();
    if (raw === '') return;
    const d = parseImpliedDecimalDollars(raw);
    if (!Number.isNaN(d)) inputEl.value = d.toFixed(2);
  }

  let syncingRemainder = false;

  function getEffectiveLineAmount(row) {
    const amt = row.querySelector('.detail-amount');
    const qty = row.querySelector('.detail-qty');
    const a = amt && amt.value ? parseImpliedDecimalDollars(amt.value) : NaN;
    const q = qty && qty.value ? parseFloat(qty.value) : 1;
    const qq = Number.isNaN(q) || q <= 0 ? 1 : q;
    if (Number.isNaN(a)) return 0;
    return roundMoney2(a * qq);
  }

  function seedFirstLineWithTransactionTotal() {
    if (state.totalDollars == null) return;
    [...detailRowsContainer.querySelectorAll('.detail-row')].slice(1).forEach((r) => r.remove());
    detailRowIndex = 0;
    const first = detailRowsContainer.querySelector('.detail-row');
    if (!first) return;
    delete first.dataset.autoRemainder;
    const amt = first.querySelector('.detail-amount');
    const qty = first.querySelector('.detail-qty');
    const cat = first.querySelector('.detail-category');
    if (amt) amt.value = Number(state.totalDollars).toFixed(2);
    if (qty) qty.value = '1';
    if (cat) cat.value = '';
    const taxed = first.querySelector('.detail-amount-taxed');
    if (taxed) taxed.textContent = '$0.00';
  }

  function sumEffectiveAmountsExcludingRow(rows, excludeRow) {
    let s = 0;
    rows.forEach((r) => {
      if (excludeRow && r === excludeRow) return;
      s = roundMoney2(s + getEffectiveLineAmount(r));
    });
    return s;
  }

  function syncAutoRemainder() {
    if (syncingRemainder || state.step !== 3 || state.totalDollars == null) return;
    if (isSplitWorkbenchHidden()) return;
    const total = Number(state.totalDollars);
    const rows = [...detailRowsContainer.querySelectorAll('.detail-row')];
    if (rows.length === 0) return;

    const autoRow = detailRowsContainer.querySelector('.detail-row[data-auto-remainder="true"]');

    if (autoRow) {
      const sumLocked = sumEffectiveAmountsExcludingRow(rows, autoRow);
      const rem = roundMoney2(total - sumLocked);

      if (Math.abs(rem) < 0.005) {
        autoRow.remove();
        setMessage('');
        return;
      }

      if (rem < -0.005) {
        autoRow.remove();
        setMessage('Line amounts exceed the transaction total.', true);
        return;
      }

      setMessage('');
      syncingRemainder = true;
      try {
        const amtEl = autoRow.querySelector('.detail-amount');
        const qEl = autoRow.querySelector('.detail-qty');
        if (qEl) qEl.value = '1';
        if (amtEl) amtEl.value = rem.toFixed(2);
      } finally {
        syncingRemainder = false;
      }
      return;
    }

    const eff1 = getEffectiveLineAmount(rows[0]);
    const remAfterFirst = roundMoney2(total - eff1);

    if (Math.abs(remAfterFirst) < 0.005) {
      setMessage('');
      return;
    }

    if (remAfterFirst < -0.005) {
      setMessage('First line amount exceeds the transaction total.', true);
      return;
    }

    const sumAll = rows.reduce((acc, r) => roundMoney2(acc + getEffectiveLineAmount(r)), 0);
    if (sumAll > total + 0.005) {
      setMessage('Line amounts exceed the transaction total.', true);
      return;
    }

    setMessage('');
    syncingRemainder = true;
    try {
      if (rows.length === 1) {
        appendDetailRow({ autoRemainder: true, initialAmount: remAfterFirst });
        return;
      }
      const r2 = rows[1];
      const cat = r2.querySelector('.detail-category');
      const amt = r2.querySelector('.detail-amount');
      const emptyCat = !cat || !cat.value;
      const emptyAmt = !amt || !amt.value.trim();
      if (emptyCat && emptyAmt) {
        r2.dataset.autoRemainder = 'true';
        if (amt) amt.value = remAfterFirst.toFixed(2);
        const qEl = r2.querySelector('.detail-qty');
        if (qEl) qEl.value = '1';
      } else {
        const remRest = roundMoney2(total - sumAll);
        if (remRest > 0.005) {
          appendDetailRow({ autoRemainder: true, initialAmount: remRest });
        }
      }
    } finally {
      syncingRemainder = false;
    }
  }

  function syncHeaderStateFromDom() {
    state.accountId = inputAccount.value.trim() || null;
    state.date = inputDate.value.trim() || null;
    state.payeeName = inputPayee.value.trim() || null;
    const payee = state.catalogs.payees.find((p) => p.name === state.payeeName);
    state.payeeId = payee ? payee.id : null;
  }

  function buildDetailString() {
    syncGroceryLiquorRatesFromSales();
    const total = state.totalDollars;
    const parts = [];
    detailRowsContainer.querySelectorAll('.detail-row').forEach((row) => {
      const catInput = row.querySelector('.detail-category');
      const amt = row.querySelector('.detail-amount');
      const qtyEl = row.querySelector('.detail-qty');
      const abbrev = catInput && catInput.value ? getAbbrevFromCategoryInput(catInput.value) : '';
      const amountStr = amt && amt.value ? amt.value.trim() : '';
      const qty = qtyEl && qtyEl.value ? parseFloat(qtyEl.value) : 1;
      const q = Number.isNaN(qty) || qty <= 0 ? 1 : qty;
      const lineAmt = parseImpliedDecimalDollars(amountStr);
      if (abbrev && amountStr && !Number.isNaN(lineAmt)) {
        const line = lineAmt * q;
        parts.push(line.toFixed(2) + abbrev);
      }
    });
    (state.taxRates || []).forEach((t) => {
      parts.push(formatTaxRate(t.rate) + t.abbreviation);
    });
    const discRaw = inputDiscount && inputDiscount.value ? inputDiscount.value.trim() : '';
    const gcRaw = inputGiftCard && inputGiftCard.value ? inputGiftCard.value.trim() : '';
    const discAmt = discRaw ? parseImpliedDecimalDollars(discRaw) : NaN;
    if (discRaw && !Number.isNaN(discAmt) && discAmt > 0) {
      parts.push(discAmt.toFixed(2) + 'disc');
    }
    const gcAmt = gcRaw ? parseImpliedDecimalDollars(gcRaw) : NaN;
    if (gcRaw && !Number.isNaN(gcAmt) && gcAmt > 0) {
      parts.push(gcAmt.toFixed(2) + 'gc');
    }
    if (total != null && parts.length > 0) {
      parts.push(String(Number(total).toFixed(2)) + 'tot');
    }
    return parts.join('');
  }

  function syncGroceryLiquorRatesFromSales() {
    if (!state.lockGroceryLiquorTaxToSales) return;
    const rates = state.taxRates || [];
    const sales = rates.find((r) => r.abbreviation === 'tax');
    if (!sales) return;
    const rVal = Number(sales.rate) || 0;
    ['gtax', 'atax'].forEach((abbr) => {
      const entry = rates.find((r) => r.abbreviation === abbr);
      if (entry) entry.rate = rVal;
    });
  }

  function refreshLockedTaxInputsFromSales() {
    if (!state.lockGroceryLiquorTaxToSales || !taxRowsContainer) return;
    syncGroceryLiquorRatesFromSales();
    taxRowsContainer.querySelectorAll('.tax-rate-input').forEach((el) => {
      const idx = Number(el.dataset.taxIndex);
      const tr = state.taxRates[idx];
      if (tr && (tr.abbreviation === 'gtax' || tr.abbreviation === 'atax')) {
        el.value = formatTaxInputValue(tr.rate);
      }
    });
  }

  function renderTaxRows() {
    if (!taxRowsContainer) return;
    syncGroceryLiquorRatesFromSales();
    taxRowsContainer.innerHTML = '';
    (state.taxRates || []).forEach((t, i) => {
      const row = document.createElement('div');
      const locked =
        state.lockGroceryLiquorTaxToSales && (t.abbreviation === 'gtax' || t.abbreviation === 'atax');
      row.className = 'tax-card' + (locked ? ' tax-card-locked' : '');
      if (locked) row.title = 'Locked to sales tax rate — uncheck the box above to edit separately.';
      const rateVal = Number(t.rate) || 0;
      const inputId = 'tax-rate-input-' + i;
      const isSalesTax = t.abbreviation === 'tax';
      row.innerHTML =
        '<span class="tax-card-label">' + escapeHtml(t.name) + '</span>' +
        '<div class="tax-card-controls">' +
        '<label class="sr-only" for="' +
        inputId +
        '">' +
        escapeHtml(t.name) +
        ' rate</label>' +
        '<input type="number" id="' +
        inputId +
        '" class="tax-rate-input" min="0" step="0.25" data-tax-index="' +
        i +
        '" aria-label="' +
        escapeHtml(t.name) +
        ' percent" value="' +
        escapeHtml(formatTaxInputValue(rateVal)) +
        '"' +
        (locked ? ' disabled' : '') +
        (isSalesTax ? '' : ' tabindex="-1"') +
        ' />' +
        '<span class="tax-card-suffix">%</span>' +
        '</div>';
      const numInput = row.querySelector('.tax-rate-input');
      const abbr = t.abbreviation;
      numInput.addEventListener('input', () => {
        if (locked) return;
        let v = parseFloat(numInput.value);
        if (Number.isNaN(v)) v = 0;
        v = Math.max(0, v);
        state.taxRates[i].rate = v;
        if (abbr === 'tax') {
          if (salesTaxPersistTimer) clearTimeout(salesTaxPersistTimer);
          salesTaxPersistTimer = setTimeout(() => {
            persistSalesTaxRateFromState();
            salesTaxPersistTimer = null;
          }, 400);
        }
        if (abbr === 'tax' && state.lockGroceryLiquorTaxToSales) {
          refreshLockedTaxInputsFromSales();
        }
        updateLiveDisplay();
      });
      numInput.addEventListener('change', () => {
        if (locked) return;
        if (abbr === 'tax' && salesTaxPersistTimer) {
          clearTimeout(salesTaxPersistTimer);
          salesTaxPersistTimer = null;
        }
        let v = snapTaxRateToQuarterStep(numInput.value);
        state.taxRates[i].rate = v;
        numInput.value = formatTaxInputValue(v);
        if (abbr === 'tax') {
          persistSalesTaxRateFromState();
        }
        if (abbr === 'tax' && state.lockGroceryLiquorTaxToSales) {
          refreshLockedTaxInputsFromSales();
        }
        updateLiveDisplay();
      });
      taxRowsContainer.appendChild(row);
    });
  }

  const DELETE_SVG =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m-9 4v10h10V10M10 11v6M14 11v6"/></svg>';

  function appendDetailRow(options) {
    const opts = options || {};
    const autoRemainder = !!opts.autoRemainder;
    const initialAmount = opts.initialAmount;
    const insertAfter = opts.insertAfter;
    detailRowIndex += 1;
    const i = detailRowIndex;
    const row = document.createElement('div');
    row.className = 'detail-row';
    row.dataset.rowIndex = String(i);
    if (autoRemainder) row.dataset.autoRemainder = 'true';
    let amountValue = '';
    if (opts.presetAmount != null && String(opts.presetAmount).trim() !== '') {
      amountValue = String(opts.presetAmount);
    } else if (initialAmount != null && !Number.isNaN(Number(initialAmount))) {
      amountValue = Number(initialAmount).toFixed(2);
    }
    row.innerHTML =
      '<div class="detail-cell">' +
      '<label class="sr-only" for="detail-category-' + i + '">Category</label>' +
      '<select id="detail-category-' + i + '" class="detail-category" aria-label="Category">' +
      '<option value="">Select category</option>' +
      '</select>' +
      '</div>' +
      '<div class="detail-cell">' +
      '<label class="sr-only" for="detail-qty-' + i + '">Quantity</label>' +
      '<input type="number" id="detail-qty-' + i + '" class="detail-qty" min="1" step="1" value="1" aria-label="Quantity" />' +
      '</div>' +
      '<div class="detail-cell">' +
      '<label class="sr-only" for="detail-amount-' + i + '">Amount untaxed</label>' +
      '<input type="text" id="detail-amount-' + i + '" class="detail-amount" inputmode="decimal" placeholder="0.00" aria-label="Amount untaxed" value="' +
      escapeHtml(amountValue) +
      '" />' +
      '</div>' +
      '<div class="detail-cell detail-cell-taxed">' +
      '<span class="detail-amount-taxed">$0.00</span>' +
      '</div>' +
      '<div class="detail-cell">' +
      '<label class="sr-only" for="detail-tax-type-' + i + '">Tax rate type</label>' +
      '<select id="detail-tax-type-' + i + '" class="detail-tax-type" aria-label="Tax rate type">' +
      '<option value="regular" selected>Regular</option>' +
      '<option value="grocery">Grocery</option>' +
      '<option value="alcohol">Alcohol</option>' +
      '<option value="none">Non-taxed</option>' +
      '</select>' +
      '</div>' +
      '<div class="detail-cell detail-cell-delete">' +
      '<button type="button" class="btn-icon btn-delete-row" aria-label="Delete row" title="Delete row">' +
      DELETE_SVG +
      '</button>' +
      '</div>';

    if (insertAfter && detailRowsContainer.contains(insertAfter)) {
      detailRowsContainer.insertBefore(row, insertAfter.nextSibling);
    } else {
      detailRowsContainer.appendChild(row);
    }
    populateCategorySelects();
    if (opts.presetCategory != null && opts.presetCategory !== '') {
      const sel = row.querySelector('.detail-category');
      if (sel) {
        const match = Array.from(sel.options).some((o) => o.value === opts.presetCategory);
        if (match) sel.value = opts.presetCategory;
      }
    }
    if (opts.presetTaxType != null && opts.presetTaxType !== '') {
      const tt = row.querySelector('.detail-tax-type');
      if (tt) tt.value = opts.presetTaxType;
    }
    const skipCatFocus = opts.autoFocusCategory === false;
    if (!autoRemainder && !skipCatFocus) {
      row.querySelector('.detail-category').focus();
    }
    return row;
  }

  function expandRowIntoUnitQuantityRows(rowEl, unitCount) {
    const cat = rowEl.querySelector('.detail-category');
    const amt = rowEl.querySelector('.detail-amount');
    const tax = rowEl.querySelector('.detail-tax-type');
    const qtyEl = rowEl.querySelector('.detail-qty');
    const catVal = cat ? cat.value : '';
    const taxVal = tax ? tax.value : 'regular';
    const rawAmt = amt && amt.value ? amt.value.trim() : '';
    let amountDisplayStr = '';
    if (rawAmt !== '') {
      const d = parseImpliedDecimalDollars(rawAmt);
      amountDisplayStr = Number.isNaN(d) ? rawAmt : roundMoney2(d).toFixed(2);
    }
    if (qtyEl) qtyEl.value = '1';
    if (amt && amountDisplayStr !== '') {
      amt.value = amountDisplayStr;
    }
    let ref = rowEl;
    for (let k = 1; k < unitCount; k += 1) {
      ref = appendDetailRow({
        insertAfter: ref,
        presetCategory: catVal,
        presetAmount: amountDisplayStr,
        presetTaxType: taxVal,
        autoFocusCategory: false,
      });
    }
  }

  function addDetailRow() {
    appendDetailRow({});
  }

  function focusRemainderCategoryIfPresent() {
    const row = detailRowsContainer.querySelector('.detail-row[data-auto-remainder="true"]');
    if (!row) return false;
    const cat = row.querySelector('.detail-category');
    if (!cat) return false;
    cat.focus();
    return true;
  }

  /** Prefer auto-remainder row, else last row (bottom-up) whose category is still empty. */
  function focusRemainderOrLastEmptyCategory() {
    if (focusRemainderCategoryIfPresent()) return true;
    const allRows = [...detailRowsContainer.querySelectorAll('.detail-row')];
    for (let i = allRows.length - 1; i >= 0; i -= 1) {
      const sel = allRows[i].querySelector('.detail-category');
      if (sel && !sel.value) {
        sel.focus();
        return true;
      }
    }
    return false;
  }

  function onDetailAmountKeydown(e) {
    if (e.key !== 'Tab' || e.shiftKey) return;
    if (!e.target.classList.contains('detail-amount')) return;
    if (isSplitWorkbenchHidden() || state.step !== 3 || state.totalDollars == null) return;

    const rowEl = e.target.closest('.detail-row');
    const onAutoRemainderRow = rowEl && rowEl.dataset.autoRemainder === 'true';

    // Must run before syncAutoRemainder(), which would overwrite the auto row amount with total − line1 only.
    if (onAutoRemainderRow) {
      const rows = [...detailRowsContainer.querySelectorAll('.detail-row')];
      const total = Number(state.totalDollars);
      const sumOthers = sumEffectiveAmountsExcludingRow(rows, rowEl);
      const effCur = getEffectiveLineAmount(rowEl);
      const remNew = roundMoney2(total - sumOthers - effCur);

      e.preventDefault();
      e.stopPropagation();
      requestAnimationFrame(() => {
        rowEl.removeAttribute('data-auto-remainder');
        if (remNew > 0.005) {
          appendDetailRow({ autoRemainder: true, initialAmount: remNew });
          const newAuto = detailRowsContainer.querySelector('.detail-row[data-auto-remainder="true"]');
          const cat = newAuto && newAuto.querySelector('.detail-category');
          if (cat) cat.focus();
        } else {
          if (remNew < -0.005) {
            setMessage('Line amounts exceed the transaction total.', true);
          } else {
            setMessage('');
          }
          const cat = rowEl.querySelector('.detail-category');
          if (cat) cat.focus();
        }
        syncAutoRemainder();
        updateLiveDisplay();
      });
      return;
    }

    const qtyInput = rowEl.querySelector('.detail-qty');
    const qRaw = qtyInput && qtyInput.value ? parseFloat(qtyInput.value) : 1;
    const qInt = Number.isNaN(qRaw) || qRaw <= 1 ? 1 : Math.floor(qRaw);
    if (qInt > 1) {
      e.preventDefault();
      e.stopPropagation();
      requestAnimationFrame(() => {
        expandRowIntoUnitQuantityRows(rowEl, qInt);
        syncAutoRemainder();
        updateLiveDisplay();
        if (!focusRemainderOrLastEmptyCategory()) {
          const firstNewRow = rowEl.nextElementSibling;
          const cat = firstNewRow && firstNewRow.querySelector('.detail-category');
          if (cat) cat.focus();
        }
      });
      return;
    }

    syncAutoRemainder();
    updateLiveDisplay();

    const rows = [...detailRowsContainer.querySelectorAll('.detail-row')];
    if (rows.length === 0) return;
    const eff1 = getEffectiveLineAmount(rows[0]);
    const rem = roundMoney2(Number(state.totalDollars) - eff1);

    if (rem > 0.005) {
      e.preventDefault();
      e.stopPropagation();
      requestAnimationFrame(() => {
        if (!focusRemainderCategoryIfPresent()) {
          syncAutoRemainder();
          focusRemainderCategoryIfPresent();
        }
      });
    }
  }

  function showStep(n) {
    state.step = n;
    stepTotal.classList.toggle('hidden', n !== 1);
    stepHeader.classList.toggle('hidden', n < 2);
    step2Actions.classList.toggle('hidden', n !== 2);
    stepDetailLine.classList.toggle('hidden', n !== 3);
    if (ruleAfterTotal) ruleAfterTotal.hidden = n < 2;
    if (ruleBeforeLines) ruleBeforeLines.hidden = n !== 3;
    if (confirmationWrap) confirmationWrap.classList.toggle('hidden', n !== 3);

    if (n === 1) inputTotal.focus();
    if (n === 2) inputPayee.focus();
    if (n === 3) {
      inputPayee.value = state.payeeName || '';
      inputAccount.value = state.accountId || '';
      inputDate.value = state.date || '';
      const allowSplit = foundTransactionAllowsSplitUI(state.existingTransaction);
      setSplitWorkbenchVisible(allowSplit);
      if (allowSplit) {
        seedFirstLineWithTransactionTotal();
        const firstCat = detailRowsContainer.querySelector('.detail-row .detail-category');
        if (firstCat) firstCat.focus();
      } else {
        liveDisplay.innerHTML = '';
        resetSummaryDisplay();
        setMessage('');
      }
    }
  }

  function setMessage(text, isError) {
    messageEl.textContent = text || '';
    messageEl.className = 'message' + (isError ? ' error' : '');
  }

  function resetSummaryDisplay() {
    if (summarySubtotal) summarySubtotal.textContent = '$0.00';
    if (summarySalesTax) summarySalesTax.textContent = '$0.00';
    if (summaryTotalEl) summaryTotalEl.textContent = '$0.00';
    detailRowsContainer.querySelectorAll('.detail-amount-taxed').forEach((el) => {
      el.textContent = '$0.00';
    });
  }

  const categoryCodesEl = document.getElementById('category-codes');

  async function fetchCatalogs() {
    const res = await fetch('/api/catalogs');
    if (!res.ok) throw new Error('Failed to load catalogs');
    state.catalogs = await res.json();
    const fromApi = state.catalogs.taxRates || [];
    if (fromApi.length > 0) {
      state.taxRates = fromApi.map((t) => ({ name: t.name, abbreviation: t.abbreviation, rate: Number(t.rate) }));
    } else {
      state.taxRates = [
        { name: 'Sales Tax', abbreviation: 'tax', rate: 7 },
        { name: 'Grocery Tax', abbreviation: 'gtax', rate: 1.5 },
        { name: 'Liquor Tax', abbreviation: 'atax', rate: 2.25 },
        { name: 'Gift Card Tax', abbreviation: 'gctax', rate: 0 },
        { name: 'Donations Tax', abbreviation: 'dtax', rate: 0 },
      ];
    }
    applyStoredSalesTaxRateToState();
    const { payees, accounts, categories } = state.catalogs;
    payeeList.innerHTML = '';
    payees.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.name;
      payeeList.appendChild(opt);
    });
    inputAccount.innerHTML = '<option value="">Select account</option>';
    accounts.forEach((a) => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.name;
      inputAccount.appendChild(opt);
    });
    if (categoryCodesEl) {
      categoryCodesEl.innerHTML = '';
      const sortKey = (name) => (name || '').replace(/^[\s\P{Letter}\p{Number}]*/u, '').trim().toLowerCase();
      const withAbbrev = (categories || []).filter((c) => c.abbreviation).sort((a, b) => sortKey(a.name).localeCompare(sortKey(b.name), undefined, { sensitivity: 'base' }));
      if (withAbbrev.length) {
        const table = document.createElement('table');
        table.className = 'category-codes-table';
        withAbbrev.forEach((c) => {
          const tr = document.createElement('tr');
          tr.innerHTML = '<td class="category-abbrev">' + escapeHtml(c.abbreviation) + '</td><td class="category-name">' + escapeHtml(c.name) + '</td>';
          table.appendChild(tr);
        });
        categoryCodesEl.appendChild(table);
      }
    }
    populateCategorySelects();
    renderTaxRows();
  }

  async function lookupByAmount(amountDollars) {
    const res = await fetch(`/api/lookup?amount=${encodeURIComponent(amountDollars)}`);
    if (!res.ok) throw new Error('Lookup failed');
    return res.json();
  }

  let previewDebounceTimer = null;
  async function fetchPreview() {
    syncHeaderStateFromDom();
    const total = state.totalDollars;
    const detail = buildDetailString();
    if (total == null || !detail) {
      renderPreview(null);
      return;
    }
    try {
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalDollars: total, detailString: detail }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.error) {
        renderPreview({ error: data.error });
      } else {
        renderPreview(data);
      }
    } catch (e) {
      renderPreview({ error: e.message || 'Preview failed' });
    }
  }

  function renderPreview(data) {
    if (!data) {
      liveDisplay.innerHTML = '<p class="preview-placeholder">Choose categories and amounts to see validation.</p>';
      resetSummaryDisplay();
      return;
    }
    if (data.error) {
      liveDisplay.innerHTML = '<p class="preview-error">' + escapeHtml(data.error) + '</p>';
      resetSummaryDisplay();
      return;
    }

    liveDisplay.innerHTML = '';

    let sub = 0;
    let taxSum = 0;
    const rows = data.lines || [];
    rows.forEach((row) => {
      const b = parseFloat(row.base);
      const a = parseFloat(row.amount);
      if (!Number.isNaN(b)) sub += b;
      if (!Number.isNaN(a) && !Number.isNaN(b)) taxSum += a - b;
    });

    if (summarySubtotal) summarySubtotal.textContent = formatMoney(sub);
    if (summarySalesTax) summarySalesTax.textContent = formatMoney(taxSum);
    if (summaryTotalEl) summaryTotalEl.textContent = formatMoney(data.totalDollars);

    const detailRowEls = detailRowsContainer.querySelectorAll('.detail-row');
    rows.forEach((row, i) => {
      const el = detailRowEls[i];
      if (!el) return;
      const taxed = el.querySelector('.detail-amount-taxed');
      if (!taxed) return;
      const a = parseFloat(row.amount);
      taxed.textContent = Number.isNaN(a) ? '$0.00' : formatMoney(a);
    });
    for (let j = rows.length; j < detailRowEls.length; j += 1) {
      const taxed = detailRowEls[j].querySelector('.detail-amount-taxed');
      if (taxed) taxed.textContent = '$0.00';
    }
  }

  function updateConfirmation() {
    const { payeeName, accountId, date, totalDollars, catalogs, foundCategoryLabel } = state;
    const account = catalogs.accounts.find((a) => a.id === accountId);
    const accountName = account ? account.name : (accountId || '—');
    const payee = payeeName || '—';
    const dateStr = date || '—';
    const totalStr = totalDollars != null ? `$${Number(totalDollars).toFixed(2)}` : '—';
    confirmation.textContent = `Payee: ${payee}  |  Account: ${accountName}  |  Date: ${dateStr}  |  Total: ${totalStr}`;
    if (foundCategoryLabel) {
      confirmationCategory.textContent = 'Category: ' + foundCategoryLabel;
      confirmationCategory.classList.remove('hidden');
    } else {
      confirmationCategory.textContent = '';
      confirmationCategory.classList.add('hidden');
    }
  }

  function updateLiveDisplay() {
    if (isSplitWorkbenchHidden()) return;
    const total = state.totalDollars;
    const detail = buildDetailString();
    if (total == null || !detail) {
      renderPreview(null);
      return;
    }
    clearTimeout(previewDebounceTimer);
    previewDebounceTimer = setTimeout(fetchPreview, 180);
  }

  function onDetailInput() {
    updateLiveDisplay();
  }

  async function submitUpdate() {
    syncHeaderStateFromDom();
    const detailString = buildDetailString();
    if (!detailString) {
      setMessage('Add at least one category and amount.', true);
      return;
    }
    setMessage('Updating…');
    try {
      const body = {
        totalDollars: state.totalDollars,
        detailString,
        existingTransaction: state.existingTransaction || undefined,
        payeeId: state.payeeId || undefined,
        payeeName: state.payeeName || undefined,
        accountId: state.accountId || undefined,
        date: state.date || undefined,
      };
      const res = await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        state.postSuccess = true;
        successSummary.innerHTML =
          '<p class="success-confirmation">' +
          escapeHtml(confirmation.textContent) +
          '</p>' +
          (state.foundCategoryLabel ? '<p class="success-category">Category: ' + escapeHtml(state.foundCategoryLabel) + '</p>' : '') +
          '<p class="success-message">Transaction updated.</p>';
        successSummary.classList.remove('hidden');
        setMessage('');
        resetDetailRows();
        inputTotal.value = '';
        if (inputDiscount) inputDiscount.value = '';
        if (inputGiftCard) inputGiftCard.value = '';
        liveDisplay.innerHTML = '';
        resetSummaryDisplay();
        showStep(1);
      } else {
        setMessage(data.error || 'Update failed', true);
      }
    } catch (e) {
      setMessage(e.message || 'Request failed', true);
    }
  }

  function onTotalSubmit() {
    if (state.postSuccess) {
      state.postSuccess = false;
      successSummary.classList.add('hidden');
      successSummary.innerHTML = '';
    }
    const raw = inputTotal.value.trim();
    const amount = parseImpliedDecimalDollars(raw);
    if (raw === '' || Number.isNaN(amount) || amount <= 0) {
      setMessage('Enter a valid total (digits-only = cents: 1000 → $10.00).', true);
      return;
    }
    state.totalDollars = amount;
    inputTotal.value = amount.toFixed(2);
    setMessage('');
    lookupByAmount(amount)
      .then((result) => {
        if (result.found) {
          state.existingTransaction = result.transaction;
          state.foundCategoryLabel = result.transaction.category_label || null;
          state.payeeId = result.transaction.payee_id;
          state.payeeName = result.transaction.payee_name;
          state.accountId = result.transaction.account_id;
          state.date = result.transaction.date;
          showStep(3);
          updateConfirmation();
          updateLiveDisplay();
        } else {
          state.existingTransaction = null;
          state.foundCategoryLabel = null;
          state.payeeId = null;
          state.payeeName = null;
          state.accountId = null;
          const today = new Date();
          state.date = today.toISOString().slice(0, 10);
          inputDate.value = state.date;
          showStep(2);
        }
      })
      .catch((e) => setMessage(e.message || 'Lookup failed', true));
  }

  function onDetailsNext() {
    const accountId = inputAccount.value.trim();
    const date = inputDate.value.trim();
    if (!accountId) {
      setMessage('Select an account.', true);
      return;
    }
    if (!date) {
      setMessage('Select a date.', true);
      return;
    }
    state.accountId = accountId;
    state.date = date;
    state.payeeName = inputPayee.value.trim() || null;
    const payee = state.catalogs.payees.find((p) => p.name === state.payeeName);
    state.payeeId = payee ? payee.id : null;
    setMessage('');
    showStep(3);
    updateConfirmation();
    updateLiveDisplay();
  }

  function resetDetailRows() {
    const rows = detailRowsContainer.querySelectorAll('.detail-row');
    for (let i = 1; i < rows.length; i += 1) rows[i].remove();
    const first = detailRowsContainer.querySelector('.detail-row');
    if (first) {
      delete first.dataset.autoRemainder;
      const catInput = first.querySelector('.detail-category');
      const amt = first.querySelector('.detail-amount');
      const qty = first.querySelector('.detail-qty');
      if (catInput) catInput.value = '';
      if (amt) amt.value = '';
      if (qty) qty.value = '1';
      const taxed = first.querySelector('.detail-amount-taxed');
      if (taxed) taxed.textContent = '$0.00';
    }
    detailRowIndex = 0;
  }

  detailRowsContainer.addEventListener('input', (e) => {
    const t = e.target;
    const row = t.closest('.detail-row');
    const first = detailRowsContainer.querySelector('.detail-row');
    if (row === first && (t.classList.contains('detail-amount') || t.classList.contains('detail-qty'))) {
      syncAutoRemainder();
    }
    updateLiveDisplay();
  });
  detailRowsContainer.addEventListener('change', (e) => {
    if (e.target.classList.contains('detail-category')) {
      const fromPrefix = !!(e.detail && e.detail.fromPrefix);
      ynabcliLogCategory('category change', {
        id: e.target.id,
        fromPrefix,
        value: e.target.value,
        bufferBeforeEvent: ynabcliBufferSnapshot(e.target),
      });
      if (!fromPrefix) {
        categoryPrefixBySelect.delete(e.target);
        ynabcliLogCategory('category change: buffer cleared (mouse/UI)', { id: e.target.id });
      }
      updateLiveDisplay();
    } else if (e.target.classList.contains('detail-tax-type')) {
      updateLiveDisplay();
    }
  });
  detailRowsContainer.addEventListener('focusin', (e) => {
    if (e.target.classList.contains('detail-category')) {
      ynabcliLogCategory('category focusin', { id: e.target.id, buffer: ynabcliBufferSnapshot(e.target) });
    }
  });
  detailRowsContainer.addEventListener('focusout', (e) => {
    if (e.target.classList.contains('detail-category')) {
      ynabcliLogCategory('category focusout: buffer cleared', {
        id: e.target.id,
        hadBuffer: categoryPrefixBySelect.has(e.target),
        related: e.relatedTarget && e.relatedTarget.id ? e.relatedTarget.id : String(e.relatedTarget),
      });
      categoryPrefixBySelect.delete(e.target);
    }
    if (e.target.classList.contains('detail-amount')) {
      applyImpliedDecimalFormatToInput(e.target);
      const row = e.target.closest('.detail-row');
      if (row && row.dataset.autoRemainder === 'true' && !syncingRemainder) {
        const rows = [...detailRowsContainer.querySelectorAll('.detail-row')];
        const total = Number(state.totalDollars);
        if (state.step === 3 && total != null && !Number.isNaN(total)) {
          const sumOthers = sumEffectiveAmountsExcludingRow(rows, row);
          const expected = roundMoney2(total - sumOthers);
          const actual = getEffectiveLineAmount(row);
          if (Math.abs(actual - expected) >= 0.005) {
            delete row.dataset.autoRemainder;
            syncAutoRemainder();
            updateLiveDisplay();
          }
        }
      }
    }
  });
  detailRowsContainer.addEventListener('keydown', (e) => {
    if (e.target.classList.contains('detail-category')) {
      const sel = e.target;
      if (e.key === 'Escape') {
        ynabcliLogCategory('category keydown Escape', { id: sel.id });
        categoryPrefixBySelect.delete(sel);
        return;
      }
      if (e.key === 'Backspace') {
        const buf = categoryPrefixBySelect.get(sel);
        if (!buf || buf.length === 0) return;
        e.preventDefault();
        const next = buf.slice(0, -1);
        ynabcliLogCategory('category keydown Backspace', { id: sel.id, from: buf, to: next });
        if (next.length === 0) {
          categoryPrefixBySelect.delete(sel);
        } else {
          const match = findFirstOptionByPrefix(sel, next);
          if (match) {
            categoryPrefixBySelect.set(sel, next);
            sel.value = match.value;
            dispatchCategoryChangeFromPrefix(sel);
          } else {
            categoryPrefixBySelect.delete(sel);
          }
        }
        return;
      }
      if (e.repeat) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isCategoryPrefixKey(e.key)) {
        if (e.key === ' ' && !(categoryPrefixBySelect.get(sel) || '').length) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        const ch = e.key === ' ' ? ' ' : e.key.toLowerCase();
        let buffer = (categoryPrefixBySelect.get(sel) || '') + ch;
        let match = findFirstOptionByPrefix(sel, buffer);
        let triedFallback = false;
        if (!match && ch !== ' ') {
          buffer = ch;
          triedFallback = true;
          match = findFirstOptionByPrefix(sel, buffer);
        }
        ynabcliLogCategory('category keydown prefix', {
          id: sel.id,
          key: e.key === ' ' ? 'Space' : e.key,
          bufferApplied: buffer,
          triedFallback,
          matchedText: match ? match.text : null,
        });
        if (match) {
          categoryPrefixBySelect.set(sel, buffer);
          sel.value = match.value;
          dispatchCategoryChangeFromPrefix(sel);
        } else if (e.key === ' ') {
          categoryPrefixBySelect.set(sel, buffer);
        } else {
          categoryPrefixBySelect.delete(sel);
        }
        return;
      }
      if (e.key.length === 1) {
        ynabcliLogCategory('category keydown (not handled as prefix key)', {
          id: sel.id,
          key: e.key,
          isCategoryPrefixKey: isCategoryPrefixKey(e.key),
        });
      }
    }
    if (
      e.key === 'Enter' &&
      !e.metaKey &&
      !e.ctrlKey &&
      e.target.classList.contains('detail-amount')
    ) {
      e.preventDefault();
      submitUpdate();
    }
    if (e.target.classList.contains('detail-amount')) {
      onDetailAmountKeydown(e);
    }
  });

  detailRowsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-delete-row');
    if (!btn) return;
    const row = btn.closest('.detail-row');
    if (!row || detailRowsContainer.querySelectorAll('.detail-row').length <= 1) return;
    row.remove();
    syncAutoRemainder();
    updateLiveDisplay();
  });

  inputTotal.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onTotalSubmit();
    }
  });
  inputTotal.addEventListener('blur', () => {
    applyImpliedDecimalFormatToInput(inputTotal);
  });
  if (inputDiscount) {
    inputDiscount.addEventListener('blur', () => {
      applyImpliedDecimalFormatToInput(inputDiscount);
    });
  }
  if (inputGiftCard) {
    inputGiftCard.addEventListener('blur', () => {
      applyImpliedDecimalFormatToInput(inputGiftCard);
    });
  }

  inputAccount.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputDate.focus();
    }
  });

  function adjustDateByDays(days) {
    const raw = inputDate.value.trim();
    const base = raw ? new Date(raw + 'T12:00:00') : new Date();
    if (Number.isNaN(base.getTime())) return;
    base.setDate(base.getDate() + days);
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, '0');
    const d = String(base.getDate()).padStart(2, '0');
    inputDate.value = y + '-' + m + '-' + d;
  }

  inputDate.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (state.step === 2) onDetailsNext();
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      adjustDateByDays(1);
    } else if (e.key === '-') {
      e.preventDefault();
      adjustDateByDays(-1);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (!e.metaKey && !e.ctrlKey) return;
    if (state.step !== 3) return;
    e.preventDefault();
    submitUpdate();
  });

  btnNext.addEventListener('click', onDetailsNext);
  if (btnNewTransaction) btnNewTransaction.addEventListener('click', onNewTransaction);
  btnSubmit.addEventListener('click', submitUpdate);
  btnAddRow.addEventListener('click', () => {
    addDetailRow();
    updateLiveDisplay();
  });

  if (taxLockGroceryLiquorToSalesEl) {
    taxLockGroceryLiquorToSalesEl.checked = state.lockGroceryLiquorTaxToSales;
    taxLockGroceryLiquorToSalesEl.addEventListener('change', () => {
      state.lockGroceryLiquorTaxToSales = taxLockGroceryLiquorToSalesEl.checked;
      renderTaxRows();
      updateLiveDisplay();
    });
  }

  inputDiscount.addEventListener('input', onDetailInput);
  inputGiftCard.addEventListener('input', onDetailInput);

  inputPayee.addEventListener('input', () => {
    if (state.step === 3) updateLiveDisplay();
  });
  inputAccount.addEventListener('change', () => {
    if (state.step === 3) updateLiveDisplay();
  });
  inputDate.addEventListener('change', () => {
    if (state.step === 3) updateLiveDisplay();
  });

  const appRoot = document.getElementById('app');
  if (appRoot) {
    appRoot.addEventListener('focusin', (e) => {
      const t = e.target;
      if (t && t.matches && t.matches('input[type="number"]:not(.tax-rate-input)')) {
        requestAnimationFrame(() => {
          t.select();
        });
      }
    });
  }

  console.info(
    '[ynabcli] Filter the console with: ynabcli  (reduces SymBfwCS / webview noise). Category logs: YNABCLI_DEBUG.categoryLogsOff() / categoryLogsOn()'
  );

  window.YNABCLI_DEBUG = {
    getCategoryPrefixBuffer(selectEl) {
      return categoryPrefixBySelect.get(selectEl);
    },
    categoryLogsOff() {
      try {
        localStorage.setItem('ynabcliDebugCategory', '0');
      } catch (e) {
        /* ignore */
      }
      console.info('[ynabcli] Category debug logs off (applies immediately).');
    },
    categoryLogsOn() {
      try {
        localStorage.removeItem('ynabcliDebugCategory');
      } catch (e) {
        /* ignore */
      }
      console.info('[ynabcli] Category debug logs on.');
    },
  };

  fetchCatalogs()
    .then(() => {
      if (state.step === 2) {
        inputAccount.innerHTML = '<option value="">Select account</option>';
        state.catalogs.accounts.forEach((a) => {
          const opt = document.createElement('option');
          opt.value = a.id;
          opt.textContent = a.name;
          inputAccount.appendChild(opt);
        });
      }
    })
    .catch(() => setMessage('Failed to load catalogs.', true));
})();
