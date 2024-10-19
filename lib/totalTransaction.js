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
      tx.amount -= giftCard * tx.amount / total;
      tx.amounts = tx.amounts.map((amount) => amount - giftCard * amount / total);
    });
  }
  // sum the amounts of each object in the transaction array
  const totalAmount = transaction.reduce((acc, cur) => acc + cur.amount, 0);
  const remainingAmount = total - totalAmount;
  // Add the remaining amount to the last transaction
  if (remainingAmount <= 0) {
    return transaction;
  }
  transaction[transaction.length - 1].amount += remainingAmount;
  transaction[transaction.length - 1].amounts.push(remainingAmount);
  return transaction;
}

module.exports = totalTransaction;
