const getSplitTransaction = (detailInput) => {
  console.log('Splitting transaction');
  const regex = /(\d+(\.\d+)?)([a-zA-Z]+)/g;
  let match;
  const result = [];
  let total;
  let discount;
  let giftCard;
  let salesTax = 8.5;
  let groceryTax = 1.5;
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
    if (key === 'tot') {
      total = -1000 * Number.parseFloat(value.toFixed(2));
    } else if (key === 'disc') {
      discount = -1000 * Number.parseFloat(value.toFixed(2));
    } else if (key === 'gc') {
      giftCard = -1000 * Number.parseFloat(value.toFixed(2));
    } else if (key === 'tax') {
      salesTax = 1 +  -1000 * Number.parseFloat(value.toFixed(2)) / 100;
    } else if (key === 'gtx') {
      groceryTax = 1 +  -1000 * Number.parseFloat(value.toFixed(2)) / 100;
    } else if (aggregated[key]) {
      aggregated[key].push( -1000 * Number.parseFloat(value.toFixed(2)));
    } else {
      aggregated[key] = [ -1000 * Number.parseFloat(value.toFixed(2))];
    }
  });

  const splitTransaction = {
    total,
    discount,
    giftCard,
    salesTax,
    groceryTax,
    aggregated,
  };
  console.log(splitTransaction);
  return splitTransaction;
}

module.exports = getSplitTransaction;
