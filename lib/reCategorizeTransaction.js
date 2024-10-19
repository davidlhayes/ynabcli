const reCategorizeTransaction = (transactions, categories) => {
  for (let i = 0; i < transactions.length; i++) {
    const category = categories.find((category) => category.id === transactions[i].category_id);
    if (category.mergeCategory) {
      const hostIndex = transactions.findIndex((t) => t.abbreviation === category.mergeCategory);
      if (hostIndex > -1) {
        transactions[hostIndex].amount += transactions[i].amount;
        transactions[hostIndex].amounts.push(transactions[i].amount);
        transactions.splice(i, 1);
      } else {
        const hostCategory = categories.find((cat) => cat.abbreviation === category.mergeCategory);
        transactions[i].abbreviation = hostCategory.abbreviation;
        transactions[i].category_id = hostCategory.id;
        transactions[i].categoryName = hostCategory.name;
      }
    }
  }
  return transactions;
}

module.exports = reCategorizeTransaction;
