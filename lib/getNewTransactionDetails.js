const getNewTransactionDetails = (totaledTransaction, existingTransaction, payeeInput, accountInput, dateInput) => {
  const { SPLIT_TRANSACTION_CATEGORY_ID } = require('./constants');
  const splitCategoryId = SPLIT_TRANSACTION_CATEGORY_ID;

  console.log('Setting new transaction details');
  if (existingTransaction) {
    console.log('Updating existing transaction');
    return {
      payee_name: existingTransaction.payee_name,
      payee_id: existingTransaction.payee_id,
      account_id: existingTransaction.account_id,
      category_id:splitCategoryId,
      date: existingTransaction.date,
      amount: existingTransaction.amount,
      memo: existingTransaction.memo,
      cleared: existingTransaction.cleared,
      approved: existingTransaction.approved,
      flag_color: 'green',
      subtransactions: totaledTransaction,
    };
  } else {
    console.log('Creating new transaction');
    return {
      payee_id: payeeInput,
      account_id: accountInput,
      date: dateInput,
      amount: totaledTransaction.amount,
      memo: totaledTransaction.memo,
      cleared: 'cleared',
      approved: true,
      flag_color: 'blue',
      category_id: splitCategoryId,
      subtransactions: totaledTransaction.subtransactions,
    };
  }
}

module.exports = getNewTransactionDetails;
