  const spacer = (text, space) => {
    const length = text.length;
    const spacer = ' ';
    const spaces = Math.min(space - length, 0);
    return spacer.repeat(spaces);
  };

  const previewResult = (newTransaction, accountName, payeeName, date, salesTax, groceryTax) => {
    const { DEFAULT_SPACE } = require('./constants');
    const space = DEFAULT_SPACE;
    console.log(accountName);
    console.log(`${spacer(payeeName)}    ${date}`);
    console.log('---------------------------------');
    newTransaction.forEach((transaction) => {
      transaction.amounts.forEach((item) => {
        const amount = Number(item)
          .toFixed(2);
        if (amount.toString().length === 4) {
          console.log(`${transaction.category}${spacer(transaction.category, space)}$    ${amount}`);
        } else if (amount.toString().length === 5) {
          console.log(`${transaction.category}${spacer(transaction.category, space)}$   ${amount}`);
        } else if (amount.toString().length === 6) {
          console.log(`${transaction.category}${spacer(transaction.category, space)}$  ${amount}`);
        } else if (amount.toString().length === 7) {
          console.log(`${transaction.category}${spacer(transaction.category, space)}$ ${amount}`);
        }
      });
    });
    console.log('---------------------------------');
    console.log(`Sales Tax: ${((salesTax - 1) * 100).toFixed(3)}%`);
    console.log(`Grocery Tax: ${((groceryTax - 1) * 100).toFixed(3)}%`);
    console.log(`Total: ${spacer('Total', 18)}$   ${total}`);
  }

  module.exports = previewResult;
