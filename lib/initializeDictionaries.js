const fs = require('fs');
const path = require('path');

const initializeDictionaries = () => {
  const categoryPath = path.resolve(__dirname, '../catalogs/categories.json');
  const payeePath = path.resolve(__dirname, '../catalogs/payees.json');
  const accountPath = path.resolve(__dirname, '../catalogs/accounts.json');

  const categories = JSON.parse(fs.readFileSync(categoryPath));
  const payees = JSON.parse(fs.readFileSync(payeePath));
  const accounts = JSON.parse(fs.readFileSync(accountPath));

  return {
    categories,
    payees,
    accounts,
  };
}

module.exports = initializeDictionaries;
