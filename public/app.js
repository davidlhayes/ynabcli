(function () {
  const RESERVED_KEYS = new Set(['tax', 'gtax', 'tot', 'disc', 'gc', 'atax', 'gctax', 'dtax']);

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
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
  const stepDetails = document.getElementById('step-details');
  const stepDetailLine = document.getElementById('step-detail-line');
  const inputTotal = document.getElementById('input-total');
  const inputPayee = document.getElementById('input-payee');
  const inputAccount = document.getElementById('input-account');
  const inputDate = document.getElementById('input-date');
  const detailRowsContainer = document.getElementById('detail-rows');
  const taxRowsContainer = document.getElementById('tax-rows');
  const payeeList = document.getElementById('payee-list');
  const confirmation = document.getElementById('confirmation');
  const confirmationCategory = document.getElementById('confirmation-category');
  const liveDisplay = document.getElementById('live-display');
  const messageEl = document.getElementById('message');
  const btnNext = document.getElementById('btn-next');
  const btnSubmit = document.getElementById('btn-submit');
  const successSummary = document.getElementById('success-summary');

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

  function populateCategoryDatalist() {
    const datalist = document.getElementById('category-list');
    if (!datalist) return;
    datalist.innerHTML = '';
    getCategoriesWithAbbrev().forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.name;
      datalist.appendChild(opt);
    });
  }

  function formatTaxRate(rate) {
    const n = Number(rate);
    if (Number.isNaN(n)) return '0';
    return n % 1 === 0 ? String(n) : n.toFixed(1);
  }

  function buildDetailString() {
    const total = state.totalDollars;
    const parts = [];
    detailRowsContainer.querySelectorAll('.detail-row').forEach((row) => {
      const catInput = row.querySelector('.detail-category');
      const amt = row.querySelector('.detail-amount');
      const abbrev = catInput && catInput.value ? getAbbrevFromCategoryInput(catInput.value) : '';
      const amountStr = amt && amt.value ? amt.value.trim() : '';
      if (abbrev && amountStr && !Number.isNaN(parseFloat(amountStr))) {
        parts.push(amountStr + abbrev);
      }
    });
    (state.taxRates || []).forEach((t) => {
      parts.push(formatTaxRate(t.rate) + t.abbreviation);
    });
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
      row.className = 'tax-row';
      const rateVal = Number(t.rate);
      const rateStr = formatTaxRate(rateVal);
      row.innerHTML =
        '<span class="tax-name">' + escapeHtml(t.name) + '</span>' +
        '<span class="tax-rate-value" data-tax-index="' + i + '">' + escapeHtml(rateStr) + '%</span>' +
        '<button type="button" class="tax-btn tax-btn-decrement" aria-label="Decrease ' + escapeHtml(t.name) + ' by 0.5%">−</button>' +
        '<button type="button" class="tax-btn tax-btn-increment" aria-label="Increase ' + escapeHtml(t.name) + ' by 0.5%">+</button>';
      const decBtn = row.querySelector('.tax-btn-decrement');
      const incBtn = row.querySelector('.tax-btn-increment');
      const rateEl = row.querySelector('.tax-rate-value');
      decBtn.addEventListener('click', () => {
        const r = Math.max(0, (state.taxRates[i].rate || 0) - 0.5);
        state.taxRates[i].rate = r;
        rateEl.textContent = formatTaxRate(r) + '%';
        onDetailInput();
      });
      incBtn.addEventListener('click', () => {
        const r = (state.taxRates[i].rate || 0) + 0.5;
        state.taxRates[i].rate = r;
        rateEl.textContent = formatTaxRate(r) + '%';
        onDetailInput();
      });
      taxRowsContainer.appendChild(row);
    });
  }

  function addDetailRow() {
    detailRowIndex += 1;
    const row = document.createElement('div');
    row.className = 'detail-row';
    const idCat = 'detail-category-' + detailRowIndex;
    const idAmt = 'detail-amount-' + detailRowIndex;
    row.innerHTML =
      '<label class="detail-row-label" for="' + idCat + '">Category</label>' +
      '<input type="text" id="' + idCat + '" class="detail-category" list="category-list" placeholder="Type to narrow choices" autocomplete="off" aria-label="Category" />' +
      '<label class="detail-row-label" for="' + idAmt + '">Amount ($)</label>' +
      '<input type="text" id="' + idAmt + '" class="detail-amount" inputmode="decimal" placeholder="e.g. 10.00" aria-label="Amount" />';
    const categoryInput = row.querySelector('.detail-category');
    const amountEl = row.querySelector('.detail-amount');
    amountEl.addEventListener('keydown', onDetailAmountKeydown);
    amountEl.addEventListener('input', onDetailInput);
    categoryInput.addEventListener('input', onDetailInput);
    detailRowsContainer.appendChild(row);
    categoryInput.focus();
  }

  function onDetailAmountKeydown(e) {
    if (e.key !== 'Tab' || e.shiftKey) return;
    e.preventDefault();
    addDetailRow();
  }

  function showStep(n) {
    state.step = n;
    stepTotal.classList.toggle('hidden', n !== 1);
    stepDetails.classList.toggle('hidden', n !== 2);
    stepDetailLine.classList.toggle('hidden', n !== 3);
    if (n === 1) inputTotal.focus();
    if (n === 2) inputPayee.focus();
    if (n === 3) {
      const firstCat = detailRowsContainer.querySelector('.detail-row .detail-category');
      if (firstCat) firstCat.focus();
    }
  }

  function setMessage(text, isError) {
    messageEl.textContent = text || '';
    messageEl.className = 'message' + (isError ? ' error' : '');
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
    populateCategoryDatalist();
    const firstRow = detailRowsContainer.querySelector('.detail-row');
    if (firstRow) {
      const firstAmount = firstRow.querySelector('.detail-amount');
      const firstCategory = firstRow.querySelector('.detail-category');
      if (firstAmount) {
        firstAmount.addEventListener('keydown', onDetailAmountKeydown);
        firstAmount.addEventListener('input', onDetailInput);
      }
      if (firstCategory) firstCategory.addEventListener('input', onDetailInput);
    }
    renderTaxRows();
  }

  async function lookupByAmount(amountDollars) {
    const res = await fetch(`/api/lookup?amount=${encodeURIComponent(amountDollars)}`);
    if (!res.ok) throw new Error('Lookup failed');
    return res.json();
  }

  function parseDetailSegments(detailString) {
    const normalized = detailString
      .replace(/^\./g, '0.')
      .replace(/(?<=[a-zA-Z])\./g, '0.');
    const regex = /(\d+(?:\.\d+)?)([a-zA-Z]+)/g;
    const segments = [];
    let m;
    while ((m = regex.exec(normalized)) !== null) {
      segments.push({ amount: parseFloat(m[1]), key: m[2].toLowerCase() });
    }
    return segments;
  }

  function getCategorySegments(detailString) {
    const segments = parseDetailSegments(detailString);
    return segments.filter((s) => !RESERVED_KEYS.has(s.key));
  }

  function resolveCategoryName(abbrev) {
    const cat = state.catalogs.categories.find(
      (c) => c.abbreviation && c.abbreviation.toLowerCase() === abbrev.toLowerCase()
    );
    return cat ? cat.name : abbrev;
  }

  let previewDebounceTimer = null;
  async function fetchPreview() {
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
    const account = state.catalogs.accounts.find((a) => a.id === state.accountId);
    const accountName = account ? account.name : (state.accountId ? '—' : '');
    const payeeName = state.payeeName || '—';
    const dateStr = state.date || '—';

    if (!data) {
      liveDisplay.innerHTML = '<p class="preview-placeholder">Choose categories and amounts above to see preview.</p>';
      return;
    }
    if (data.error) {
      liveDisplay.innerHTML = '<p class="preview-error">' + escapeHtml(data.error) + '</p>';
      return;
    }

    let html = '<div class="preview-output"><table class="preview-table preview-table-full">';
    (data.lines || []).forEach((row, i) => {
      html += '<tr><td>' + i + '</td><td>' + escapeHtml(row.category) + '</td><td>' + escapeHtml(row.base) + '</td><td>' + escapeHtml(row.amount) + '</td></tr>';
    });
    html += '<tr class="preview-row-border"><td colspan="4"></td></tr>';
    (data.taxes || []).forEach((t) => {
      html += '<tr><td colspan="3" class="preview-cell">' + escapeHtml(t.name) + '</td><td class="preview-value">' + escapeHtml(String(t.rate)) + '%</td></tr>';
    });
    html += '<tr class="preview-row-border"><td colspan="3" class="preview-cell preview-total">Total</td><td class="preview-value preview-total">$  ' + escapeHtml(String(data.totalDollars || '')) + '</td></tr>';
    html += '</table></div>';
    liveDisplay.innerHTML = html;
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

  async function submitUpdate() {
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
        successSummary.innerHTML = '<p class="success-confirmation">' + escapeHtml(confirmation.textContent) + '</p>' + (state.foundCategoryLabel ? '<p class="success-category">Category: ' + escapeHtml(state.foundCategoryLabel) + '</p>' : '') + '<p class="success-message">Transaction updated.</p>';
        successSummary.classList.remove('hidden');
        setMessage('');
        resetDetailRows();
        inputTotal.value = '';
        liveDisplay.innerHTML = '';
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

  function onDetailInput() {
    updateLiveDisplay();
  }

  function resetDetailRows() {
    const rows = detailRowsContainer.querySelectorAll('.detail-row');
    for (let i = 1; i < rows.length; i++) rows[i].remove();
    const first = detailRowsContainer.querySelector('.detail-row');
    if (first) {
      const catInput = first.querySelector('.detail-category');
      const amt = first.querySelector('.detail-amount');
      if (catInput) catInput.value = '';
      if (amt) amt.value = '';
    }
    detailRowIndex = 0;
  }

  inputTotal.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onTotalSubmit();
    }
  });

  /* Do not capture Enter on payee: let the browser accept the datalist suggestion with Enter. Then Tab to Account. */

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
      onDetailsNext();
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      adjustDateByDays(1);
    } else if (e.key === '-') {
      e.preventDefault();
      adjustDateByDays(-1);
    }
  });

  detailRowsContainer.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('detail-amount')) {
      e.preventDefault();
      submitUpdate();
    }
  });

  btnNext.addEventListener('click', onDetailsNext);
  btnSubmit.addEventListener('click', submitUpdate);

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
