  const dayjs = require('dayjs');

  const checkArguments = (args) => {
    console.log('Checking arguments args:\n', args);
    let detailInput;
    let payeeInputName;
    let accountInputName;
    let inputCatchAllCategoryAbbreviation;
    let dateInput;
    let needsHelp = false;
    let needsArgs = false;
    let needsDetail = false;
    if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h' || args[0] === 'h') {
      needsHelp = true;
      console.log('Asking for help');
    } else if (args[0] === 'args' || args[0] === '--args' || args[0] === '-a' || args[0] === 'a') {
      needsArgs = true;
      console.log('Asking for args');
    } else if (args.length === 1) {
      detailInput = args[0];
      console.log('Setting detailInput');
    } else if (args.length === 2) {
      detailInput = args[0];
      inputCatchAllCategoryAbbreviation = args[1];
    } else if (args.length > 4) {
      console.error('Too many arguments');
      return;
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
      console.log('Setting detailInput and accountName, payeeName, and date');
    }
    return {
      detailInput,
      payeeInputName,
      accountInputName,
      inputCatchAllCategoryAbbreviation,
      dateInput,
      needsHelp,
      needsArgs,
    };
  }

  module.exports = checkArguments;
