  const indexTransaction = (splitTransaction, categories) => {
    const indexedTransactions = [];
    let category;
    // loop through keys of splitTransaction.aggregated
    Object.keys(splitTransaction.aggregated).forEach((key) => {
      category = categories.find((cat) => cat.abbreviation === key);
      if (!category) {
        return 'Category not found for ' + key;
      }
      indexedTransactions.push({
        abbreviation: key,
        category_id: category.id,
        categoryName: category.name,
        amount: splitTransaction.aggregated[key].reduce((acc, cur) => acc + cur, 0),
        amounts: splitTransaction.aggregated[key],
      })
    });
    return indexedTransactions;
  }

  module.exports = indexTransaction;
