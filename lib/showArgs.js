  const showArgs = () => {
    console.log('Params: [amount][category abbreviation][amount][category abbreviation]...[amount][category abbreviation][sales tax][tax][grocery tax][gtx][discount][disc][gift card][gc][total][tot] [single category]         | [payee][account][date]');
    console.log('                                                                                                                                                                                      (if not department store)   (if transcation not found)');
    console.log('Example: 12.99g3.99hw19.99c3.99g1.25g24.88c8.5tax34.15tot');
  }

  module.exports = showArgs;
