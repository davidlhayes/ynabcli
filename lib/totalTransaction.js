/**
 * YNAB requires sum(subtransaction.amount) === parent amount. taxTransaction rounds each
 * group's amount to 10 milli, which can drift from the flattened line sum; remainder lines
 * must also set tx.amount from sum(amounts), not += remainder on a rounded tx.amount.
 */
function reconcileSubAmountsToParentTotal(transaction, total) {
  if (!transaction || transaction.length === 0) return;
  transaction.forEach((tx) => {
    const tot = (tx.amounts || []).reduce((a, b) => a + b, 0);
    tx.amount = 10 * Math.round(tot / 10);
  });
  const sumSubs = transaction.reduce((acc, tx) => acc + tx.amount, 0);
  const drift = total - sumSubs;
  if (drift !== 0) {
    transaction[transaction.length - 1].amount += drift;
  }
}

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
  // Sum taxed line amounts (flatten) so per-tx rounding matches totalTransaction remainder logic.
  let totalAmount = 0;
  transaction.forEach((tx) => {
    (tx.amounts || []).forEach((a) => {
      totalAmount += a;
    });
  });
  const remainingAmount = total - totalAmount;
  const TOLERANCE_MILLI = 10; // 1¢ — skip phantom remainder rows from rounding drift
  if (Math.abs(remainingAmount) > TOLERANCE_MILLI && transaction.length > 0) {
    const last = transaction[transaction.length - 1];
    last.amounts.push(remainingAmount);
    if (Array.isArray(last.base)) last.base.push('N/A');
  }
  reconcileSubAmountsToParentTotal(transaction, total);
  return transaction;
}

module.exports = totalTransaction;
