/**
 * One indexed subtransaction per detail-string token (same order as UI rows).
 * Unlike indexTransaction (grouped by category abbreviation), this preserves line order.
 */
const indexTransactionOrdered = (result, categories, taxAbbreviations) => {
  if (!result || !Array.isArray(result) || !categories) {
    return [];
  }
  const taxSet = new Set(taxAbbreviations || []);
  const indexedTransactions = [];

  result.forEach((obj) => {
    const key = Object.keys(obj)[0];
    const value = obj[key];
    if (taxSet.has(key)) return;
    if (key === 'tot' || key === 'disc' || key === 'gc') return;
    const category = categories.find((cat) => cat.abbreviation === key);
    if (!category) return;
    const milli = -1000 * Number.parseFloat(value.toFixed(2));
    indexedTransactions.push({
      abbreviation: key,
      category_id: category.id,
      categoryName: category.name,
      amount: milli,
      amounts: [milli],
    });
  });

  return indexedTransactions;
};

module.exports = indexTransactionOrdered;
