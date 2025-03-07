  const dayjs = require('dayjs');

  const checkArguments = (args) => {
    let detailInput;
    let payeeInputName;
    let accountInputName;
    let inputCatchAllCategoryAbbreviation;
    let dateInput;
    let amounts;
    let needsHelp = false;
    let needsUpdate = false;
    let needsArgs = false;
    let findTransactions = false;
    if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h' || args[0] === 'h') {
      needsHelp = true;
    } else if (args[0] === 'update' || args[0] === '--update' || args[0] === '-u' || args[0] === 'u') {
      needsUpdate = true;
    } else if (args[0] === 'args' || args[0] === '--args' || args[0] === '-a' || args[0] === 'a') {
      needsArgs = true;
    } else if (args[0] === 'find' || args[0] === '--find' || args[0] === '-f' || args[0] === 'f') {
      findTransactions = true;
      amounts = args.slice(1);
    } else if (args.length === 1) {
      detailInput = args[0];
    } else if (args.length === 2) {
      detailInput = args[0];
      inputCatchAllCategoryAbbreviation = args[1];
    } else if (args.length > 4) {
      console.error('Too many arguments');
      return 'error';
    } else {
      // set detailInput and accountName, payeeName, and date
      detailInput = args[0];
      payeeInputName = args[1];
      accountInputName = args[2];
      dateInput = args[3];
      if (dayjs(dateInput).isValid() === false) {
        console.error('Invalid date');
        return;
      }
    }
    return {
      detailInput,
      payeeInputName,
      accountInputName,
      inputCatchAllCategoryAbbreviation,
      dateInput,
      needsHelp,
      needsUpdate,
      needsArgs,
      findTransactions,
      amounts,
    };
  }

  module.exports = checkArguments;
