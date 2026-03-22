(function () {
  const RESERVED_KEYS = new Set(['tax', 'gtax', 'tot', 'disc', 'gc', 'atax', 'gctax', 'dtax']);

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

  let detailRowIndex = 0;

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

  function formatTaxRate(rate) {
    const n = Number(rate);
    if (Number.isNaN(n)) return '0';
    return n % 1 === 0 ? String(n) : n.toFixed(1);
  }

  function roundMoney2(x) {
    return Math.round(x * 100) / 100;
  }

  let syncingRemainder = false;

  function getEffectiveLineAmount(row) {
    const amt = row.querySelector('.detail-amount');
    const qty = row.querySelector('.detail-qty');
    const a = amt && amt.value ? parseFloat(amt.value) : NaN;
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

  function syncAutoRemainder() {
    if (syncingRemainder || state.step !== 3 || state.totalDollars == null) return;
    const total = Number(state.totalDollars);
    const rows = [...detailRowsContainer.querySelectorAll('.detail-row')];
    if (rows.length === 0) return;

    const eff1 = getEffectiveLineAmount(rows[0]);
    const rem = roundMoney2(total - eff1);
    const autoRow = detailRowsContainer.querySelector('.detail-row[data-auto-remainder="true"]');

    if (Math.abs(rem) < 0.005) {
      if (autoRow) autoRow.remove();
      setMessage('');
      return;
    }

    if (rem < -0.005) {
      if (autoRow) autoRow.remove();
      setMessage('First line amount exceeds the transaction total.', true);
      return;
    }

    setMessage('');
    syncingRemainder = true;
    try {
      if (autoRow) {
        const amtEl = autoRow.querySelector('.detail-amount');
        const qEl = autoRow.querySelector('.detail-qty');
        if (qEl) qEl.value = '1';
        if (amtEl) amtEl.value = rem.toFixed(2);
        return;
      }
      if (rows.length === 1) {
        appendDetailRow({ autoRemainder: true, initialAmount: rem });
        return;
      }
      const r2 = rows[1];
      const cat = r2.querySelector('.detail-category');
      const amt = r2.querySelector('.detail-amount');
      const emptyCat = !cat || !cat.value;
      const emptyAmt = !amt || !amt.value.trim();
      if (emptyCat && emptyAmt) {
        r2.dataset.autoRemainder = 'true';
        if (amt) amt.value = rem.toFixed(2);
        const qEl = r2.querySelector('.detail-qty');
        if (qEl) qEl.value = '1';
      } else {
        appendDetailRow({ autoRemainder: true, initialAmount: rem });
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
      if (abbrev && amountStr && !Number.isNaN(parseFloat(amountStr))) {
        const line = parseFloat(amountStr) * q;
        parts.push(line.toFixed(2) + abbrev);
      }
    });
    (state.taxRates || []).forEach((t) => {
      parts.push(formatTaxRate(t.rate) + t.abbreviation);
    });
    const discRaw = inputDiscount && inputDiscount.value ? inputDiscount.value.trim() : '';
    const gcRaw = inputGiftCard && inputGiftCard.value ? inputGiftCard.value.trim() : '';
    if (discRaw && !Number.isNaN(parseFloat(discRaw)) && parseFloat(discRaw) > 0) {
      parts.push(parseFloat(discRaw).toFixed(2) + 'disc');
    }
    if (gcRaw && !Number.isNaN(parseFloat(gcRaw)) && parseFloat(gcRaw) > 0) {
      parts.push(parseFloat(gcRaw).toFixed(2) + 'gc');
    }
    if (total != null && parts.length > 0) {
      parts.push(String(Number(total).toFixed(2)) + 'tot');
    }
    return parts.join('');
  }

  function renderTaxRows() {
    if (!taxRowsContainer) return;
    taxRowsContainer.innerHTML = '';
    (state.taxRates || []).forEach((t, i) => {
      const row = document.createElement('div');
      row.className = 'tax-card';
      const rateVal = Number(t.rate);
      const rateStr = formatTaxRate(rateVal);
      row.innerHTML =
        '<span class="tax-card-label">' + escapeHtml(t.name) + '</span>' +
        '<div class="tax-card-controls">' +
        '<button type="button" class="tax-btn tax-btn-decrement" aria-label="Decrease ' + escapeHtml(t.name) + ' by 0.5%">−</button>' +
        '<span class="tax-rate-value" data-tax-index="' + i + '">' + escapeHtml(rateStr) + '</span>' +
        '<button type="button" class="tax-btn tax-btn-increment" aria-label="Increase ' + escapeHtml(t.name) + ' by 0.5%">+</button>' +
        '<span class="tax-card-suffix">%</span>' +
        '</div>';
      const decBtn = row.querySelector('.tax-btn-decrement');
      const incBtn = row.querySelector('.tax-btn-increment');
      const rateEl = row.querySelector('.tax-rate-value');
      decBtn.addEventListener('click', () => {
        const r = Math.max(0, (state.taxRates[i].rate || 0) - 0.5);
        state.taxRates[i].rate = r;
        rateEl.textContent = formatTaxRate(r);
        updateLiveDisplay();
      });
      incBtn.addEventListener('click', () => {
        const r = (state.taxRates[i].rate || 0) + 0.5;
        state.taxRates[i].rate = r;
        rateEl.textContent = formatTaxRate(r);
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
    detailRowIndex += 1;
    const i = detailRowIndex;
    const row = document.createElement('div');
    row.className = 'detail-row';
    row.dataset.rowIndex = String(i);
    if (autoRemainder) row.dataset.autoRemainder = 'true';
    const amountValue =
      initialAmount != null && !Number.isNaN(Number(initialAmount)) ? Number(initialAmount).toFixed(2) : '';
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

    detailRowsContainer.appendChild(row);
    populateCategorySelects();
    if (!autoRemainder) {
      row.querySelector('.detail-category').focus();
    }
  }

  function addDetailRow() {
    appendDetailRow({});
  }

  function onDetailAmountKeydown(e) {
    if (e.key !== 'Tab' || e.shiftKey) return;
    const row = e.target.closest('.detail-row');
    const first = detailRowsContainer.querySelector('.detail-row');
    if (row !== first) return;
    e.preventDefault();
    const rows = detailRowsContainer.querySelectorAll('.detail-row');
    if (rows.length > 1) {
      const nextCat = rows[1].querySelector('.detail-category');
      if (nextCat) {
        nextCat.focus();
        return;
      }
    }
    addDetailRow();
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
      seedFirstLineWithTransactionTotal();
      const firstCat = detailRowsContainer.querySelector('.detail-row .detail-category');
      if (firstCat) firstCat.focus();
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
    const amount = parseFloat(raw);
    if (raw === '' || Number.isNaN(amount) || amount <= 0) {
      setMessage('Enter a valid total (e.g. 238.34).', true);
      return;
    }
    state.totalDollars = amount;
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
    if (e.target.classList.contains('detail-category') || e.target.classList.contains('detail-tax-type')) {
      updateLiveDisplay();
    }
  });
  detailRowsContainer.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('detail-amount')) {
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

  btnNext.addEventListener('click', onDetailsNext);
  btnSubmit.addEventListener('click', submitUpdate);
  btnAddRow.addEventListener('click', () => {
    addDetailRow();
    updateLiveDisplay();
  });

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
