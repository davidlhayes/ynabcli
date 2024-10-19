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

  const regex = /(\d+(\.\d+)?)([a-zA-Z]+)/g;
  let match;
  const result = [];
  let total;
  let discount;
  let giftCard;
  const taxes = [...defaultTaxes];
  const aggregated = {};

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
    }
  });

  return {
    total,
    discount,
    giftCard,
    taxes,
    aggregated,
  };
}

module.exports = getSplitTransaction;
