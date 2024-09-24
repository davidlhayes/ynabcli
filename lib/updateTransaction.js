const updateTransaction = (existingTransaction, newTransactionDetails) => {
  console.log('Updating transaction');
  const updatedTransaction = {
    ...existingTransaction,
    ...newTransactionDetails,
  };
  return updatedTransaction;
}

module.exports = updateTransaction;
