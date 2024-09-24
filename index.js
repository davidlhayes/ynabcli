// main ynab commnad line
  const checkArguments = require('./lib/checkArguments');
  const showHelp = require('./lib/showHelp');
  const showArgs = require('./lib/showArgs');
  // const getExistingTransaction = require('./lib/getExistingTransaction');
  // const initializeDictionaries = require('./lib/initializeDictionaries');
  // const indexTransaction = require('./lib/indexTransaction');
  // const taxTransaction = require('./lib/taxTransaction');
  // const reCategorizeTransaction = require('./lib/reCategorizeTransaction');
  // const totalTransaction = require('./lib/totalTransaction');
  // const getNewTransactionDetails = require('./lib/getNewTransactionDetails');
  // const getSplitTransaction = require('./lib/getSplitTransaction');
  // const updateTransaction = require('./lib/updateTransaction');
  // const previewResult = require('./lib/previewResult');
  // const getApiParameters = require('./lib/getApiParameters');
  // const dayjs = require('dayjs');
  // const callApi = require('./lib/callApi');

  // const rl = readline.createInterface({
  //   input: process.stdin,
  //   output: process.stdout,
  // });

  const defaultCatchAllCategoryId = '804bce02-fd43-4c33-a10a-0d602471e804'; // Department Store
  let inputCatchAllCategoryAbbreviation;
  let catchAllCategoryId;
  let salesTax;
  let groceryTax;
  let payeeInput;
  let accountInput;
  const defaultSalesTax = 8.5;
  const defaultGroceryTax = 1.5;

  const args = process.argv.slice(2);
  console.log('args:', args);
  (async () => {
    const {
      detailInput,
      payeeInputName,
      accountInputName,
      dateInput,
      needsHelp,
      needsArgs,
    } = checkArguments(args);
    console.log('detailInput:', detailInput);
    console.log('payeeInputName:', payeeInputName);
    console.log('accountInputName:', accountInputName);
    console.log('dateInput:', dateInput);
    console.log('needsHelp:', needsHelp);
    console.log('needsArgs:', needsArgs);
    if (needsHelp) {
      showHelp();
      return;
    } else if (needsArgs) {
      showArgs();
      return;
    }
    // const dictionaries = initializeDictionaries();
    // if (!dictionaries) {
    //   console.error('Failed to initialize dictionaries');
    //   return;
    // }
    // payeeInput = dictionaries.payees.find((payee) => payee.name === payeeInputName);
    // if (!payeeInput) {
    //   console.error('Payee not found');
    //   return;
    // }
    // accountInput = dictionaries.accounts.find((account) => account.name === accountInputName);
    // if (!accountInput) {
    //   console.error('Account not found');
    //   return;
    // }
    // if (inputCatchAllCategoryAbbreviation) {
    //   catchAllCategoryId = dictionaries.categories[inputCatchAllCategoryAbbreviation];
    // } else {
    //   catchAllCategoryId = defaultCatchAllCategoryId;
    // }
    // const splitTransaction = getSplitTransaction(detailInput);
    // const {
    //   total,
    //   discount,
    //   giftCard,
    //   salesTaxInput,
    //   groceryTaxInput,
    //   aggregated
    // } = splitTransaction;
    // salesTax = salesTaxInput || defaultSalesTax;
    // groceryTax = groceryTaxInput || defaultGroceryTax;
    // const existingTransaction = await getExistingTransaction(catchAllCategoryId, total);
    // const indexedTransaction = indexTransaction(splitTransaction, dictionaries.categories);
    // const taxedTransaction = taxTransaction(indexedTransaction, salesTax, groceryTax);
    // const reCategorizedTransaction = reCategorizeTransaction(taxedTransaction);
    // console.log("taxed Transactions:\n", taxedTransaction);
    // const totaledTransactions = totalTransaction(taxedTransaction, total, discount, giftCard);
    // console.log("totaledTransactions:\n", totaledTransactions);
    // previewResult(totaledTransactions, accountInputName, payeeInputName, dateInput, salesTax, groceryTax);
    // const newTransactionDetails = await getNewTransactionDetails(totaledTransactions, existingTransaction, payeeInput, accountInput, dateInput);
    // const apiParameters = await getApiParameters(newTransactionDetails, existingTransaction, totaledTransactions);
    // const response = await callApi(apiParameters);
    // ask for user confirmation to update transaction and call apiFunction;
  })();

