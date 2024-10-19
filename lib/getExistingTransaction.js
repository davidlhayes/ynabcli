const axios = require('axios');
const dayjs = require('dayjs');
const apiKey = 'bd8174af95b5af1e32709a09408f1bd580ba5697300f5fcf977d1a9086ce19fc';
const baseUrl = 'https://api.ynab.com/v1';

const getExistingTransaction = async (category_id, total) => {
  const ninetyDaysAgo = dayjs()
    .subtract(90, 'day')
    .format('YYYY-MM-DD');
  const getTransactionsUrl = `${baseUrl}/budgets/last-used/categories/${category_id}/transactions?since_date=${ninetyDaysAgo}`;

  try {
    const response = await axios.get(getTransactionsUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    const transactions = response?.data?.data?.transactions?.filter((tx) => tx.type === 'transaction');
    console.log('total:', total);
    console.log('transactions:', transactions);
    return transactions?.find((tx) => tx.amount === total);
  } catch (error) {
    console.log(error);
  }
}

module.exports = getExistingTransaction;
