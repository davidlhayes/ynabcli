const taxTransaction = (transactions, categories, taxes) => {
  const salesTax = taxes.find((tax) => tax.abbreviation === 'tax') || { abbreviation: 'tax', rate: 0 };
  transactions.forEach((transaction) => {
    const category = categories.find((category) => category.id === transaction.category_id);
    const tax = taxes.find((tax) => tax.abbreviation === category.taxType) || salesTax;
    transaction.amounts = transaction.amounts.map((amount) => {
      return Math.round((1 + tax.rate / 100) * amount);
    });
    console.log('transaction amounts', transaction.amounts);
    transaction.amount = Math.round(transaction.amounts.reduce((acc, cur) => acc + cur, 0));
  });
  return transactions;
}

module.exports = taxTransaction;
