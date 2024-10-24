const axios = require('axios');
const dayjs = require('dayjs');
const {YNAB_API_KEY, YNAB_BASE_URL, YNAB_BUDGET_ID} = require('../constants');
const apiKey = YNAB_API_KEY;
const baseUrl = YNAB_BASE_URL;
const budgetId = YNAB_BUDGET_ID;

const getExistingTransaction = async (category_id, total) => {
  const ninetyDaysAgo = dayjs()
    .subtract(90, 'day')
    .format('YYYY-MM-DD');
  const getTransactionsUrl = `${baseUrl}/budgets/${budgetId}/categories/${category_id}/transactions?since_date=${ninetyDaysAgo}`;

  try {
    const response = await axios.get(getTransactionsUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    const transactions = response?.data?.data?.transactions?.filter((tx) => tx.type === 'transaction');
    return transactions?.find((tx) => tx.amount === total);
  } catch (error) {
    console.log(error);
  }
}

module.exports = getExistingTransaction;
