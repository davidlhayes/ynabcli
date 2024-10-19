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
        console.log('............response:\n', JSON.stringify(response));
        updateYnabResponse = response;
      } catch (error) {
        const errorDetail = error?.response?.data?.error?.detail || error;
        console.log('existingTransaction.id:', existingTransaction.id);
        console.log('updatedTransaction:', JSON.stringify(updatedTransaction));
        console.error(errorDetail);
        updateYnabResponse = { status: 500, data: { error: errorDetail } };
        return updateYnabResponse;
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
        const errorDetail = error?.response?.data?.error?.detail || error;
        console.log('updatedTransaction:', JSON.stringify(updatedTransaction));
        console.error(errorDetail);
        updateYnabResponse = { status: 500, data: { error: errorDetail } };
        return updateYnabResponse;
      }
    }
    return updateYnabResponse;
  };

  module.exports = updateYnab;
