const getSplitTransaction = (detailInput, defaultTaxes) => {

  if (!detailInput) {
    console.error('No detail input');
    return;
  }
  if (!defaultTaxes) {
    console.error('No default taxes');
    return;
  }

  // Replace leading period with "0."
  detailInput = detailInput.replace(/^\./g, '0.');
  // Replace period that follows an alpha character with "0."
  detailInput = detailInput.replace(/(?<=[a-zA-Z])\./g, '0.');

  // Replace math operations with their results
  detailInput = detailInput.replace(/(\d+(\.\d+)?)([+\-*/])(\d+(\.\d+)?)/g, (match, num1, _, operator, num2) => {
    switch (operator) {
      case '+':
        return parseFloat(num1) + parseFloat(num2);
      case '-':
        return parseFloat(num1) - parseFloat(num2);
      case '*':
        return parseFloat(num1) * parseFloat(num2);
      case '/':
        return parseFloat(num1) / parseFloat(num2);
      default:
        return match;
    }
  });

  const regex = /(\d+(\.\d+)?)([a-zA-Z]+)/g;
  let match;
  const result = [];
  let total;
  let discount;
  let giftCard;
  const taxes = [...defaultTaxes];
  const aggregated = {};
  const keys = [];
  const taxKeysSpecified = new Set();

  while ((match = regex.exec(detailInput)) !== null) {
    const value = parseFloat(match[1]);
    const key = match[3];
    const obj = {};
    obj[key] = value;
    result.push(obj);
  }
  result.forEach((obj) => {
    const key = Object.keys(obj)[0];
    const value = obj[key];
    const taxIndex = taxes.findIndex((tax) => tax.abbreviation === key);
    if (taxIndex > -1) {
      taxKeysSpecified.add(taxes[taxIndex].abbreviation);
      taxes[taxIndex].rate = value.toFixed(3);
    } else if (key === 'tot') {
      total = -1000 * Number.parseFloat(value.toFixed(2));
    } else if (key === 'disc') {
      discount = -1000 * Number.parseFloat(value.toFixed(2));
    } else if (key === 'gc') {
      giftCard = -1000 * Number.parseFloat(value.toFixed(2));
    } else if (aggregated[key]) {
      aggregated[key].push(-1000 * Number.parseFloat(value.toFixed(2)));
    } else {
      aggregated[key] = [-1000 * Number.parseFloat(value.toFixed(2))];
      keys.push(key);
    }
  });
  if (!total && keys.length === 1) {
    total = aggregated[keys[0]][0];
  }

  // Grocery tax defaults to regular tax unless user specified e.g. 1.015gtax
  if (!taxKeysSpecified.has('gtax')) {
    const taxEntry = taxes.find((t) => t.abbreviation === 'tax');
    const gtaxEntry = taxes.find((t) => t.abbreviation === 'gtax');
    if (taxEntry && gtaxEntry) gtaxEntry.rate = taxEntry.rate;
  }

  return {
    total,
    discount,
    giftCard,
    taxes,
    aggregated,
  };
}

module.exports = getSplitTransaction;
