  const spacer = (text, space = 30) => {
    if (text === undefined) {
      throw new Error('text is required in spacer');
    }
    const length = text.length;
    const spacer = ' ';
    const spaces = Math.max(space - length, 0);
    return spacer.repeat(spaces);
  };

  const previewResult = (newTransaction, total, accountName, payeeName, date, taxes) => {
    const { DEFAULT_SPACE, LINE_LENGTH } = require('../constants');
    const regex = /[^a-zA-Z0-9 ]/g; // Allow spaces
    const space = DEFAULT_SPACE;
    const separator = '-'.repeat(LINE_LENGTH);
    console.log(accountName);
    console.log(`${payeeName}${spacer(payeeName, space)}${date}`);
    console.log(separator);
    const output = [];
    newTransaction.forEach((transaction) => {
      transaction.amounts.forEach((item, index) => {
        const transactionObject = {};
        let cleanedName = transaction.categoryName.replace(regex, '');
        cleanedName = cleanedName.replace(/^\s+/, '');
        transactionObject['category'] = cleanedName;
        transactionObject['base'] = transaction.base[index] === 'N/A' ? 'N/A' : Number(-transaction.base[index]/1000).toFixed(2);
        const amount = Number(-item / 1000).toFixed(2);
        transactionObject['amount'] = amount;
        const amountStr = amount.toString();
        const spaces = ' '.repeat(9 - amountStr.length);
        // console.log(`${index + 1}. ${cleanedName}${spacer(cleanedName, space)}$${spaces}${amount}`);
        output.push(transactionObject);
      });
    });
    console.table(output);
    console.log(separator);
    taxes.forEach((tax) => {
      console.log(`${tax.name}${spacer(tax.name, space)}     ${tax.rate}%`);
    });
    const totalString = Number(-total/1000).toFixed(2);
    const totalSpaces = ' '.repeat(9 - totalString.length);
    console.log(`Total:${spacer('Total:', space)}$${totalSpaces}${totalString}`);
  }

  module.exports = previewResult;
