const totalTransaction = (transaction, total, discount, giftCard) => {

  if (discount) {
    // multiply each object in the transaction array by the discount
    transaction.forEach((tx) => {
      tx.amount *= discount;
      tx.amounts = tx.amounts.map((amount) => amount * discount);
    });
  }
  if (giftCard) {
    // reduce the amount of each object amount by the giftCard amount * the amount/total
    transaction.forEach((tx) => {
      tx.amount = Math.round((tx.amount - giftCard * tx.amount / total) / 10) * 10;
      if (Array.isArray(tx.amounts)) {
        tx.amounts = tx.amounts.map((amount) => Math.round((amount - giftCard * amount / total) / 10) * 10);
      }
    });
  }
  // sum the amounts of each object in the transaction array
  const totalAmount = transaction.reduce((acc, cur) => acc + cur.amount, 0);
  const remainingAmount = total - totalAmount;
  // Add the remaining amount to the last transaction
  if (remainingAmount === 0) {
    return transaction;
  }
  transaction[transaction.length - 1].amount += remainingAmount;
  transaction[transaction.length - 1].amounts.push(remainingAmount);
  return transaction;
}

module.exports = totalTransaction;
