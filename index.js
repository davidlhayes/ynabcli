// main ynab commnad line
  const checkArguments = require('./lib/checkArguments');
  const showHelp = require('./lib/showHelp');
  const showArgs = require('./lib/showArgs');
  const { DEPARTMENT_STORE_CATEGORY_ID } = require('./constants');
  const getExistingTransaction = require('./lib/getExistingTransaction');
  const initializeDictionaries = require('./lib/initializeDictionaries');
  const indexTransaction = require('./lib/indexTransaction');
  const taxTransaction = require('./lib/taxTransaction');
  const reCategorizeTransaction = require('./lib/reCategorizeTransaction');
  const totalTransaction = require('./lib/totalTransaction');
  // const getNewTransactionDetails = require('./lib/getNewTransactionDetails');
  const getSplitTransaction = require('./lib/getSplitTransaction');
  // const updateTransaction = require('./lib/updateTransaction');
  const previewResult = require('./lib/previewResult');
  // const getApiParameters = require('./lib/getApiParameters');
  // const dayjs = require('dayjs');
  // const callApi = require('./lib/callApi');

  // const rl = readline.createInterface({
  //   input: process.stdin,
  //   output: process.stdout,
  // });

  const defaultCatchAllCategoryId = DEPARTMENT_STORE_CATEGORY_ID;
  let inputCatchAllCategoryAbbreviation;
  let catchAllCategoryId;
  let payeeInput;
  let accountInput;

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
    const dictionaries = initializeDictionaries();
    if (!dictionaries) {
      console.error('Failed to initialize dictionaries');
      return;
    }
    payeeInput = payeeInputName && dictionaries.payees.find(payee => payee.name === payeeInputName);
    if (payeeInputName && !payeeInput) {
      console.error('Payee not found');
      return;
    }
    accountInput = accountInputName && dictionaries.accounts.find(account => account.name === accountInputName);
    if (accountInputName && !accountInput) {
      console.error('Account not found');
      return;
    }
    if (inputCatchAllCategoryAbbreviation) {
      catchAllCategoryId = dictionaries.categories[inputCatchAllCategoryAbbreviation];
    } else {
      catchAllCategoryId = defaultCatchAllCategoryId;
    }
    const splitTransaction = getSplitTransaction(detailInput, dictionaries.taxes);
    console.log('splitTransaction:', splitTransaction);
    const {
      total,
      discount,
      giftCard,
      taxes,
      aggregated
    } = splitTransaction;
    const existingTransaction = await getExistingTransaction(catchAllCategoryId, total);
    console.log('existingTransaction:', existingTransaction);
    const indexedTransaction = indexTransaction(splitTransaction, dictionaries.categories);
    console.log('indexedTransaction:', indexedTransaction);
    const taxedTransaction = taxTransaction(indexedTransaction, dictionaries.categories, splitTransaction.taxes);
    console.log("taxed Transactions:\n", taxedTransaction);
    const reCategorizedTransaction = reCategorizeTransaction(taxedTransaction, dictionaries.categories);
    console.log("reCategorized Transactions:\n", reCategorizedTransaction);
    const totaledTransactions = totalTransaction(reCategorizedTransaction, total, discount, giftCard);
    console.log("totaledTransactions:\n", totaledTransactions);
    previewResult(totaledTransactions, accountInputName, payeeInputName, dateInput, taxes);
    // const newTransactionDetails = await getNewTransactionDetails(totaledTransactions, existingTransaction, payeeInput, accountInput, dateInput);
    // const apiParameters = await getApiParameters(newTransactionDetails, existingTransaction, totaledTransactions);
    // const response = await callApi(apiParameters);
    // ask for user confirmation to update transaction and call apiFunction;
  })();

