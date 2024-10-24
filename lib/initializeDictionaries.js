const fs = require('fs');
const path = require('path');

const initializeDictionaries = v => {
  const categoryPath = path.resolve(__dirname, '../catalogs/categories.json');
  const payeePath = path.resolve(__dirname, '../catalogs/payees.json');
  const accountPath = path.resolve(__dirname, '../catalogs/accounts.json');
  const taxesPath = path.resolve(__dirname, '../catalogs/taxes.json');
  console.log('accountPath:', accountPath);
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
  if (Array.isArray(payeeDict)) {
    payees = payeeDict;
  } else if (Object.hasOwnProperty.call(payeeDictData, 'payees')) {
    payees = payeeDictData.payees;
  } else {
    console.log('payeeDict:', payeeDict);
    console.log('typeof payeeDict:', typeof payeeDict);
    throw new Error('Payees not found in dictionary');
  }

  const accountDict = JSON.parse(fs.readFileSync(accountPath));
  const accountDictData = accountDict?.data;
  if (Array.isArray(accountDict)) {
    accounts = accountDict;
  } else if (Object.hasOwnProperty.call(accountDictData, 'accounts')) {
    accounts = accountDictData.accounts;
  } else {
    console.log('accountDict:', accountDict);
    console.log('typeof accountDict:', typeof accountDict);
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
