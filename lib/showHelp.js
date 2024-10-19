  const showHelp = (categories, taxes) => {
    const separator = ('-').repeat(40);
    const regex = /[^a-zA-Z0-9 ]/g; // Allow spaces
    const categoryList = [];

    if (!categories) {
      console.error('No categories for help');
      return;
    }
    if (!taxes) {
      console.error('No taxes for help');
      return
    }
    categories.forEach((category) => {
      if (category?.abbreviation) {
        let cleanedName = category.name.replace(regex, '');
        cleanedName = cleanedName.replace(/^\s+/, '');
        const totalLength = cleanedName.length + (category.abbreviation ? category.abbreviation.length : 0);
        const spacerLength = 40 - totalLength;
        const spacer = '.'.repeat(spacerLength);
        categoryList.push(`${cleanedName}${spacer}${category.abbreviation}`);
      }
    });
    const sortedCategories = categoryList.sort();
    categoryList.forEach((category) => {
      console.log(category);
    });
    console.log(separator);
    taxes.forEach((tax) => {
      const totalLength = tax.name.length + (tax.abbreviation ? tax.abbreviation.length : 0);
      const spacerLength = 40 - totalLength;
      const spacer = '.'.repeat(spacerLength);
      console.log(`${tax.name}${spacer}${tax.abbreviation}`);
    });
    console.log(separator);
    console.log('Discount............................disc');
    console.log('Gift Card.............................gc');
    console.log('Total................................tot');
    console.log(separator);
  }

  module.exports = showHelp;
