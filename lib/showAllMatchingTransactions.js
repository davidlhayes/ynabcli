const axios = require('axios');
const dayjs = require('dayjs');
const apiKey = 'bd8174af95b5af1e32709a09408f1bd580ba5697300f5fcf977d1a9086ce19fc';
const baseUrl = 'https://api.ynab.com/v1';

const showAllMatchingTransactions = async (amounts, accounts, payees, categories) => {
  if (!amounts) {
    console.error('No amounts provided');
    return;
  } else if (amounts.length === 0) {
    console.error('No amounts provided');
    return;
  } else if (!accounts) {
    console.error('No accounts provided');
    return;
  } else if (!payees) {
    console.error('No payees provided');
    return;
  } else if (!categories) {
    console.error('No categories provided');
    return;
  }
  let matchingTransactions = [];
  const ninetyDaysAgo = dayjs()
    .subtract(90, 'day')
    .format('YYYY-MM-DD');
  const getTransactionsUrl = `${baseUrl}/budgets/last-used/transactions?since_date=${ninetyDaysAgo}`;

  try {
    const response = await axios.get(getTransactionsUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    const transactions = response?.data?.data?.transactions;
    amounts.forEach((total) => {
      const target = total * -1000;
      const match = transactions?.filter((tx) => tx.amount === target);
      matchingTransactions = matchingTransactions.concat(match);
    });
    matchingTransactions = matchingTransactions.map((tx) => {
      const account = accounts.find((account) => account.id === tx.account_id);
      const payee = payees.find((payee) => payee.id === tx.payee_id);
      const category = categories.find((category) => category.id === tx.category_id);
      return {
        date: tx?.date,
        payee: payee?.name || 'Unknown',
        account: account?.name || 'Unknown',
        category: category?.name || 'Unknown',
        amount: -tx.amount / 1000,
      };
    });
    console.table(matchingTransactions);
  } catch (error) {
    console.log(error);
  }
  return matchingTransactions;
}

module.exports = showAllMatchingTransactions;
