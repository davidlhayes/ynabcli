const taxTransaction = (indexedTransactions, categories, taxes) => {

  const salesTax = taxes.find((tax) => tax.abbreviation === 'tax') || 0;
  indexedTransactions.forEach((transaction) => {
    const category = categories.find((category) => category.id === transaction.category_id);
    const tax = taxes.find((tax) => tax.abbreviation === category.taxType) ||
     salesTax;
    transaction.amounts = transaction.amounts.map((amount) => {
      return Math.round(amount * (1 + tax.rate/100));
    });
    transaction.amount = Math.round(transaction.amounts.reduce((acc, cur) => acc + cur, 0));
  });
  return indexedTransactions;
}

module.exports = taxTransaction;
