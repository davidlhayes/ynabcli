const taxTransaction = (transactions, categories, taxes) => {
  const salesTax = taxes.find((tax) => tax.abbreviation === 'tax') || { abbreviation: 'tax', rate: 0 };
  transactions.forEach((transaction) => {
    const category = categories.find((category) => category.id === transaction.category_id);
    const tax = taxes.find((tax) => tax.abbreviation === category.taxType) || salesTax;
    transaction.amounts = transaction.amounts.map((amount) => {
      return 10 * Math.round( (1 + tax.rate / 100) * amount / 10);
    });
    const tot = transaction.amounts.reduce((acc, cur) => acc + cur, 0);
    transaction.amount = 10 * Math.round(tot / 10);
  });
  return transactions;
}

module.exports = taxTransaction;
