  const axios = require('axios');
  const { YNAB_API_KEY, YNAB_BASE_URL } = require('../constants');
  const apiKey = YNAB_API_KEY;
  const baseUrl = YNAB_BASE_URL;
  let response;

  const callApi = async (newTransactionDetails, existingTransaction, totaledTransactions) => {
    const parameters = newTransactionDetails;
    if (!!existingTransaction) {
      parameters.transactionId = existingTransaction.id;
    }
    totaledTransactions.forEach((transaction) => {
      parameters.subtransactions.push({
        amount: Math.round(transaction.amounts.reduce((acc, amount) => acc + Number(amount), 0)),
        payee_id: newTransactionDetails.payee_id,
        payee_name: newTransactionDetails.payee_name,
        category_id: transaction.category_id,
        memo: '',
      });
    });

    if (existingTransaction) {
      const updateTransactionsUrl = `${baseUrl}/budgets/last-used/transactions/${existingTransaction.id}`;
      console.log('==== updateTransaction ===');
      try {
        response = await axios.put(updateTransactionsUrl, {
          transaction: updatedTransaction,
        }, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });
        console.log('response:\n', response.status, response.statusText);
        return response;
      } catch (error) {
        console.log(error);
      }
    } else {
      const createTransactionsUrl = `${baseUrl}/budgets/last-used/transactions`;
      console.log('==== createTransaction ===');
      try {
        response = await axios.post(createTransactionsUrl, {
          transaction: updatedTransaction,
        }, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });
        console.log('response:\n', response.status, response.statusText);
        return response;
      } catch (error) {
        console.log(error);
      }
    }
    return response;
  }

  module.exports = callApi;
