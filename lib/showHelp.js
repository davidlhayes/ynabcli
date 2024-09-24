  const showHelp = (dictionary) => {
    for (const key in dictionary) {
      console.log(`${key}: ${dictionary[key]}`);
    }
    console.log('---------------------------------');
    console.log('tax: Sales Tax');
    console.log('gtx: Grocery Tax');
    console.log('disc: Discount');
    console.log('gc: Gift Card');
    console.log('tot: Total');
    console.log('---------------------------------');
  }

  module.exports = showHelp;
