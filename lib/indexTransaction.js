  const indexTransaction = (transaction, categories) => {
    if (!transaction || !categories) {
      console.error('.........Missing transaction or categories');
      return 'Missing transaction or categories';
    }
    const indexedTransactions = [];
    let category;
    // loop through keys of transaction.aggregated
    for (const key of Object.keys(transaction.aggregated)) {
      category = categories.find((cat) => cat.abbreviation === key);
      if (!category) {
        console.error('.........Category not found for ' + key);
        return 'Category not found for ' + key;
      }
      indexedTransactions.push({
        abbreviation: key,
        category_id: category.id,
        categoryName: category.name,
        amount: transaction.aggregated[key].reduce((acc, cur) => acc + cur, 0),
        amounts: transaction.aggregated[key],
      });
    }

    return indexedTransactions;
  }

  module.exports = indexTransaction;
