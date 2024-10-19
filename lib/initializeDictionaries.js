const fs = require('fs');
const path = require('path');

const initializeDictionaries = () => {
  const categoryPath = path.resolve(__dirname, '../catalogs/categories.json');
  const payeePath = path.resolve(__dirname, '../catalogs/payees.json');
  const accountPath = path.resolve(__dirname, '../catalogs/accounts.json');
  const taxesPath = path.resolve(__dirname, '../catalogs/taxes.json');

  const categories = JSON.parse(fs.readFileSync(categoryPath));
  const payees = JSON.parse(fs.readFileSync(payeePath));
  const accounts = JSON.parse(fs.readFileSync(accountPath));
  const taxes = JSON.parse(fs.readFileSync((taxesPath)));

  return {
    categories,
    payees,
    accounts,
    taxes
  };
}

module.exports = initializeDictionaries;
