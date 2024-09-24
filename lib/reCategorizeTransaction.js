const recategorizeTransaction = (taxedTransaction, categories) => {
  return taxedTransaction.map((tx) => {
    tx.amounts = tx.amounts.map((amount) => amount - 300 * amount / 3000);
    return tx;
  });
}

module.exports = recategorizeTransaction();
