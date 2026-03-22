const express = require('express');
const path = require('path');

const constants = require('./constants');
const initializeDictionaries = require('./lib/initializeDictionaries');
const getExistingTransaction = require('./lib/getExistingTransaction');
const getSplitTransaction = require('./lib/getSplitTransaction');
const indexTransaction = require('./lib/indexTransaction');
const taxTransaction = require('./lib/taxTransaction');
const reCategorizeTransaction = require('./lib/reCategorizeTransaction');
const totalTransaction = require('./lib/totalTransaction');
const getNewTransactionDetails = require('./lib/getNewTransactionDetails');
const updateYnab = require('./lib/updateYnab');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Optional: prefer env so API key isn't committed
const YNAB_API_KEY = process.env.YNAB_API_KEY || constants.YNAB_API_KEY;
const YNAB_BUDGET_ID = process.env.YNAB_BUDGET_ID || constants.YNAB_BUDGET_ID;

// Override constants for server if env set (libs read from require('constants'))
if (process.env.YNAB_API_KEY) {
  constants.YNAB_API_KEY = process.env.YNAB_API_KEY;
  constants.YNAB_BUDGET_ID = process.env.YNAB_BUDGET_ID;
}

let dictionaries;
function getDictionaries() {
  if (!dictionaries) {
    dictionaries = initializeDictionaries();
  }
  return dictionaries;
}

function parseImpliedDecimalDollars(amountStr) {
  const s = String(amountStr).trim();
  if (s === '') return NaN;
  if (/^\d+$/.test(s)) {
    return Math.round((parseInt(s, 10) / 100) * 100) / 100;
  }
  const n = parseFloat(s.replace(/,/g, ''));
  return Number.isNaN(n) ? NaN : Math.round(n * 100) / 100;
}

// GET /api/lookup?amount=238.34 (digits-only = cents, e.g. 1000 → $10.00)
app.get('/api/lookup', async (req, res) => {
  const amountStr = req.query.amount;
  if (amountStr == null || amountStr === '') {
    return res.status(400).json({ error: 'amount is required' });
  }
  const amountDollars = parseImpliedDecimalDollars(amountStr);
  if (Number.isNaN(amountDollars)) {
    return res.status(400).json({ error: 'amount must be a number' });
  }
  const totalMilli = Math.round(amountDollars * -1000);
  try {
    const transaction = await getExistingTransaction(null, totalMilli);
    if (transaction) {
      const { categories } = getDictionaries();
      const subtransactions = transaction.subtransactions || [];
      const isSplit = subtransactions.length > 0;
      const displayName = transaction._display_category_name;
      const resolveCategory = (catId, catName) => catName || (categories.find((c) => c.id === catId)?.name) || '—';
      let categoryLabel;
      if (displayName) {
        categoryLabel = displayName;
      } else if (isSplit) {
        categoryLabel = 'Split (' + subtransactions.map((s) => resolveCategory(s.category_id, s.category_name)).join(', ') + ')';
      } else {
        categoryLabel = resolveCategory(transaction.category_id, transaction.category_name);
      }
      return res.json({
        found: true,
        transaction: {
          id: transaction.id,
          payee_id: transaction.payee_id,
          payee_name: transaction.payee_name,
          account_id: transaction.account_id,
          date: transaction.date,
          amount: transaction.amount,
          category_name: transaction.category_name,
          is_split: isSplit,
          category_label: categoryLabel,
        },
      });
    }
    return res.json({ found: false });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Lookup failed' });
  }
});

// GET /api/catalogs
app.get('/api/catalogs', (req, res) => {
  try {
    const { categories, payees, accounts, taxRates } = getDictionaries();
    return res.json({
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        abbreviation: c.abbreviation,
      })).filter((c) => c.abbreviation),
      payees: payees.map((p) => ({ id: p.id, name: p.name })),
      accounts: accounts.map((a) => ({ id: a.id, name: a.name })),
      taxRates: (taxRates || []).map((t) => ({ name: t.name, abbreviation: t.abbreviation, rate: Number(t.rate) })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Catalogs failed' });
  }
});

// Map internal subtransaction to YNAB API shape (amount, category_id)
function toYnabSubtransaction(tx) {
  return {
    amount: tx.amount,
    category_id: tx.category_id,
  };
}

// Build preview output (same structure as CLI preview) for live display
function buildPreviewLines(totaledTransaction) {
  const regex = /[^a-zA-Z0-9 ]/g;
  const lines = [];
  totaledTransaction.forEach((tx) => {
    tx.amounts.forEach((item, index) => {
      let cleanedName = (tx.categoryName || '').replace(regex, '').replace(/^\s+/, '');
      const base = tx.base && tx.base[index] !== undefined
        ? (tx.base[index] === 'N/A' ? 'N/A' : Number(-tx.base[index] / 1000).toFixed(2))
        : 'N/A';
      const amount = Number(-item / 1000).toFixed(2);
      lines.push({ category: cleanedName || '—', base, amount });
    });
  });
  return lines;
}

// POST /api/preview — run full parse pipeline, return table + taxes + total for live display
app.post('/api/preview', (req, res) => {
  const { totalDollars, detailString } = req.body || {};
  if (totalDollars == null || detailString == null || detailString === '') {
    return res.json({ error: 'totalDollars and detailString are required' });
  }
  try {
    const { categories, taxRates } = getDictionaries();
    const splitTransaction = getSplitTransaction(detailString, taxRates);
    if (!splitTransaction) {
      return res.json({ error: 'Invalid detail string' });
    }
    const totalMilli = Math.round(totalDollars * -1000);
    if (!splitTransaction.total) {
      splitTransaction.total = totalMilli;
    }
    const { total, discount, giftCard, taxes } = splitTransaction;
    let indexed = indexTransaction(splitTransaction, categories);
    if (typeof indexed === 'string') {
      return res.json({ error: indexed });
    }
    const taxed = taxTransaction(indexed, categories, taxes);
    const reCategorized = reCategorizeTransaction(taxed, categories);
    const totaled = totalTransaction(reCategorized, total, discount, giftCard);
    const lines = buildPreviewLines(totaled);
    return res.json({
      lines,
      taxes: taxes.map((t) => ({ name: t.name, rate: t.rate })),
      totalDollars: Number(-total / 1000).toFixed(2),
    });
  } catch (err) {
    console.error(err);
    return res.json({ error: err.message || 'Preview failed' });
  }
});

// POST /api/update
app.post('/api/update', async (req, res) => {
  const {
    existingTransaction,
    payeeId,
    payeeName,
    accountId,
    date: dateInput,
    totalDollars,
    detailString,
  } = req.body;

  if (totalDollars == null || detailString == null || detailString === '') {
    return res.status(400).json({ error: 'totalDollars and detailString are required' });
  }

  const hasExisting = existingTransaction && existingTransaction.id;
  if (!hasExisting && (!accountId || !dateInput)) {
    return res.status(400).json({ error: 'accountId and date are required when no existing transaction' });
  }

  try {
    const { categories, payees, accounts, taxRates } = getDictionaries();
    const splitTransaction = getSplitTransaction(detailString, taxRates);
    if (!splitTransaction) {
      return res.status(400).json({ error: 'Invalid detail string' });
    }
    const totalMilli = Math.round(totalDollars * -1000);
    if (!splitTransaction.total) {
      splitTransaction.total = totalMilli;
    }

    const { total, discount, giftCard, taxes } = splitTransaction;
    let indexed = indexTransaction(splitTransaction, categories);
    if (typeof indexed === 'string') {
      return res.status(400).json({ error: indexed });
    }
    const taxed = taxTransaction(indexed, categories, taxes);
    const reCategorized = reCategorizeTransaction(taxed, categories);
    const totaled = totalTransaction(reCategorized, total, discount, giftCard);

    let payee = payeeId ? payees.find((p) => p.id === payeeId) : null;
    const account = accountId ? accounts.find((a) => a.id === accountId) : null;
    const date = dateInput || (existingTransaction && existingTransaction.date);

    const payload = getNewTransactionDetails(
      totaled,
      hasExisting ? existingTransaction : null,
      payee || (payeeName ? { id: null, name: payeeName } : null),
      account,
      date
    );

    if (!hasExisting && payeeName && !payee) {
      payload.payee_name = payeeName;
      delete payload.payee_id;
    }

    payload.subtransactions = (payload.subtransactions || []).map(toYnabSubtransaction);

    const response = await updateYnab(hasExisting ? existingTransaction : null, payload);
    const status = response.status >= 200 && response.status < 300 ? 200 : 500;
    const body = status === 200
      ? { success: true }
      : { success: false, error: response.data?.error?.detail || response.data?.error || 'Update failed' };
    return res.status(status).json(body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Update failed' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/catalogs', express.static(path.join(__dirname, 'catalogs')));

app.listen(PORT, () => {
  console.log(`Web UI at http://localhost:${PORT}`);
});
