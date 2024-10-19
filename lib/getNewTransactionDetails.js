const getNewTransactionDetails = (totaledTransaction, existingTransaction, payee, account, date) => {
  const { SPLIT_TRANSACTION_CATEGORY_ID } = require('../constants');
  const splitCategoryId = SPLIT_TRANSACTION_CATEGORY_ID;

  if (existingTransaction) {
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
    return {
      payee_id: payee,
      account_id: account,
      date: date,
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
