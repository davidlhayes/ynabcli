const totalTransaction = (taxedTransaction, total, discount, giftCard) => {
  if (discount) {
    // multiply each object in the taxedTransaction array by the discount
    taxedTransaction.forEach((tx) => {
      tx.amount *= discount;
      tx.amounts = tx.amounts.map((amount) => amount * discount);
    });
  }
  if (giftCard) {
    // reduce the amount of each object amount by the giftCard amount * the amount/total
    taxedTransaction.forEach((tx) => {
      tx.amount -= giftCard * tx.amount / total;
      tx.amounts = tx.amounts.map((amount) => amount - giftCard * amount / total);
    });
    // sum the amounts of each object in the taxedTransaction array
    const totalAmount = taxedTransaction.reduce((acc, cur) => acc + cur.amount, 0);
    const remainingAmount = total - totalAmount;
    // Add the remaining amount to the last transaction
    taxedTransaction[taxedTransaction.length - 1].amount += remainingAmount;
    taxedTransaction[taxedTransaction.length - 1].amounts.push(remainingAmount);
    return taxedTransaction;
  }
}

module.exports = totalTransaction;
