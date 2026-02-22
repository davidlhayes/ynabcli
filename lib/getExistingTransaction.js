const axios = require('axios');
const dayjs = require('dayjs');
const {YNAB_API_KEY, YNAB_BASE_URL, YNAB_BUDGET_ID} = require('../constants');
const apiKey = YNAB_API_KEY;
const baseUrl = YNAB_BASE_URL;
const budgetId = YNAB_BUDGET_ID;

const getExistingTransaction = async (_category_id, total) => {
  const ninetyDaysAgo = dayjs()
    .subtract(90, 'day')
    .format('YYYY-MM-DD');
  // Use budget-wide endpoint (same as "find") so we find the transaction regardless of category
  const getTransactionsUrl = `${baseUrl}/budgets/${budgetId}/transactions?since_date=${ninetyDaysAgo}`;

  try {
    const response = await axios.get(getTransactionsUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    const transactions = response?.data?.data?.transactions;
    // Match by amount without filtering by type so we find subtransactions too (same as --find)
    const match = transactions?.find((tx) => tx.amount === total);
    if (!match) return undefined;
    // If this is a subtransaction, return the parent so the update applies to the split
    if (match.parent_transaction_id) {
      return transactions.find((tx) => tx.id === match.parent_transaction_id) ?? match;
    }
    return match;
  } catch (error) {
    console.log(error);
  }
}

module.exports = getExistingTransaction;
