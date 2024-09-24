const taxTransaction = (indexedTransactions, tax, groceryTax) => {
  const gMultiplier = 1 + groceryTax/100;
  const multiplier = 1 + tax/100;
  console.log(`Applying tax of ${tax}% to normal transactions`);
  console.log(`Applying tax of ${groceryTax}% to grocery transactions`);
  indexedTransactions.forEach((transaction) => {
    if (transaction.abbreviation === 'g') {
      transaction.amount = transaction.amount * gMultiplier;
      transaction.amounts = transaction.amounts.map((amount) => amount * gMultiplier);
    } else {
      transaction.amount = transaction.amount * multiplier;
      transaction.amounts = transaction.amounts.map((amount) => amount * multiplier);
    }
    // round to the nearest 10 and convert to integer to simulate currency
    transaction.amount = Math.round(transaction.amount / 10) * 10;
    transaction.amounts = transaction.amounts.map((amount) => Math.round(amount / 10) * 10);
  });
  return indexedTransactions;
}

module.exports = taxTransaction;
