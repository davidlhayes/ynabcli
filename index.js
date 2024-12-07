// main ynab commnad line
  const readline = require('readline');
  const checkArguments = require('./lib/checkArguments');
  const showHelp = require('./lib/showHelp');
  const updateCatalogs = require('./lib/updateCatalogs');
  const showArgs = require('./lib/showArgs');
  const { DEPARTMENT_STORE_CATEGORY_ID } = require('./constants');
  const showAllMatchingTransactions = require('./lib/showAllMatchingTransactions');
  const getExistingTransaction = require('./lib/getExistingTransaction');
  const initializeDictionaries = require('./lib/initializeDictionaries');
  const indexTransaction = require('./lib/indexTransaction');
  const taxTransaction = require('./lib/taxTransaction');
  const reCategorizeTransaction = require('./lib/reCategorizeTransaction');
  const totalTransaction = require('./lib/totalTransaction');
  const getNewTransactionDetails = require('./lib/getNewTransactionDetails');
  const getSplitTransaction = require('./lib/getSplitTransaction');
  const updateYnab = require('./lib/updateYnab');
  const previewResult = require('./lib/previewResult');
  const dayjs = require('dayjs');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const defaultCatchAllCategoryId = DEPARTMENT_STORE_CATEGORY_ID;
  let inputCatchAllCategoryAbbreviation;
  let catchAllCategoryId;
  let payeeInput;
  let accountInput;
  let payeeId;
  let accountId;
  let payeeName;
  let accountName;
  let date;

  const args = process.argv.slice(2);
  (async () => {
    const {
      detailInput,
      payeeInputName,
      accountInputName,
      dateInput,
      needsHelp,
      needsUpdate,
      needsArgs,
      findTransactions,
      amounts,
    } = checkArguments(args);

    const dictionaries = initializeDictionaries();
    if (!dictionaries) {
      console.error('Failed to initialize dictionaries');
      return;
    }
    const { accounts, categories, payees, taxRates } = dictionaries;
    if (needsHelp) {
      showHelp(categories, taxRates);
      rl.close();
      return;
    } else if (needsUpdate) {
      await updateCatalogs(categories);
      rl.close();
      return;
    } else if (needsArgs) {
      showArgs();
      rl.close();
      return;
    } else if (findTransactions) {
      const transactions = await showAllMatchingTransactions(amounts, accounts, payees, categories);
      rl.close();
      return;
    }
    payeeInput = payeeInputName && payees.find(payee => payee.name === payeeInputName);
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
    const splitTransaction = getSplitTransaction(detailInput, taxRates);
    const {
      total,
      discount,
      giftCard,
      taxes,
      aggregated,
n    } = splitTransaction;
    const existingTransaction = await getExistingTransaction(catchAllCategoryId, total);
    if (!existingTransaction && !(payeeInputName && accountInputName && dateInput)) {
      console.error('Existing transaction not found. Please provide payee and account.');
      showArgs();
      rl.close();
      return;
    }
    payeeId = payeeInput ? payeeInput.id : existingTransaction?.payee_id;
    payeeName = payeeInputName || payees.find(payee => payee.id === payeeId)?.name;
    accountId = accountInput ? accountInput.id : existingTransaction?.account_id;
    accountName = accountInputName || accounts.find(account => account.id === accountId)?.name;
    date = dateInput || existingTransaction?.date || dayjs().format('YYYY-MM-DD');
    const indexedTransaction = indexTransaction(splitTransaction, categories);
    const taxedTransaction = taxTransaction(indexedTransaction, categories, splitTransaction.taxes);
    const reCategorizedTransaction = reCategorizeTransaction(taxedTransaction, categories);
    const totaledTransactions = totalTransaction(reCategorizedTransaction, total, discount, giftCard);
    previewResult(totaledTransactions, total, accountName, payeeName, date, taxes);
    const updatedTransaction = await getNewTransactionDetails(totaledTransactions, existingTransaction, payeeInput, accountInput, dateInput);
    rl.question('Update transaction? (y/n)', async (answer) => {
      if (answer === 'y') {
        const response = await updateYnab(existingTransaction, updatedTransaction);
        if (response.status >= 200 && response.status < 300) {
          console.log('Transaction updated');
        } else {
          console.error('Transaction not updated');
        }
        rl.close();
      } else {
        console.log('Okay. Transaction not updated');
        rl.close();
      }
    });
  })();

