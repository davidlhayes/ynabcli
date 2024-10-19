const fs = require('fs');
const path = require('path');

const initializeDictionaries = v => {
  const categoryPath = path.resolve(__dirname, '../catalogs/categories.json');
  const payeePath = path.resolve(__dirname, '../catalogs/payees.json');
  const accountPath = path.resolve(__dirname, '../catalogs/accounts.json');
  const taxesPath = path.resolve(__dirname, '../catalogs/taxes.json');
  let categories = [];
  let payees = [];
  let accounts = [];
  let taxes = [];

  const categoryDict = JSON.parse(fs.readFileSync(categoryPath));
  if (Array.isArray(categoryDict)) {
    categories = categoryDict;
  } else {
    console.log('categoryDict:', categoryDict);
    console.log('typeof categoryDict:', typeof categoryDict);
    throw new Error('Categories not found in dictionary');
  }
  const payeeDict = JSON.parse(fs.readFileSync(payeePath));
  const payeeDictData = payeeDict?.data;
  if (Object.hasOwnProperty.call(payeeDictData, 'payees')) {
    payees = payeeDictData.payees;
  } else {
    throw new Error('Payees not found in dictionary');
  }
  const accountDict = JSON.parse(fs.readFileSync(accountPath));
  const accountDictData = accountDict?.data;
  if (Object.hasOwnProperty.call(accountDictData, 'accounts')) {
    accounts = accountDictData.accounts;
  } else {
    throw new Error('Accounts not found in dictionary');
  }
  const taxesDict = JSON.parse(fs.readFileSync(taxesPath));
  const taxesDictData = taxesDict?.data;
  if(Object.hasOwnProperty.call(taxesDictData, 'taxes')) {
    taxes = taxesDictData.taxes;
  } else {
    throw new Error('Taxes not found in dictionary');
  }

  return {
    categories,
    payees,
    accounts,
    taxRates: taxes,
  };
}

module.exports = initializeDictionaries;
