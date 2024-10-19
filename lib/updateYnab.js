  const {YNAB_BASE_URL, YNAB_API_KEY, YNAB_BUDGET_ID} = require('../constants');
  const axios = require('axios');

  const updateYnab = async (existingTransaction, updatedTransaction) => {
    const baseUrl = YNAB_BASE_URL;
    const apiKey = YNAB_API_KEY;
    const budgetId = YNAB_BUDGET_ID;
    let updateYnabResponse = {}

    const axios = require('axios');
    if (existingTransaction?.id) {
      const updateTransactionsUrl = `${baseUrl}/budgets/${budgetId}/transactions/${existingTransaction.id}`;
      try {
        const response = await axios.put(updateTransactionsUrl, {
          transaction: updatedTransaction,
        }, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });
        console.log('response:\n', response.status, response.statusText);
        updateYnabResponse = response;
      } catch (error) {
        console.log(error);
      }

    } else {
      const createTransactionsUrl = `${baseUrl}/budgets/${budgetId}/transactions`;
      console.log('==== createTransaction ===');
      try {
        const response = await axios.post(createTransactionsUrl, {
          transaction: updatedTransaction,
        }, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });
        updateYnabResponse = response;
      } catch (error) {
        console.log(error);
      }
    }
    return updateYnabResponse;
  };

  module.exports = updateYnab;
