const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { YNAB_API_KEY, YNAB_BASE_URL, YNAB_BUDGET_ID } = require('../constants');
const apiKey = YNAB_API_KEY;
const baseUrl = YNAB_BASE_URL;
const budgetId = YNAB_BUDGET_ID;

const updateCatalogs = async (diskCategories) => {
  const getBudgetsUrl = `${baseUrl}/budgets`;
  const getAccountsUrl = `${baseUrl}/budgets/${budgetId}/accounts`;
  const getPayeesUrl = `${baseUrl}/budgets/${budgetId}/payees`;
  const getCategoriesUrl = `${baseUrl}/budgets/${budgetId}/categories`;

  try {
    const response = await axios.get(getBudgetsUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    const budgets = response?.data?.data?.budgets;
    console.log('Hayes budget ID:', budgets.find((budget) => budget.name === 'Hayes').id);
  } catch (error) {
    console.log(error);
  }

  try {
    const response = await axios.get(getAccountsUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    const accounts = response?.data?.data?.accounts;
    const dirPath = path.join(__dirname, '../catalogs');
    const accountsFilePath = path.join(dirPath, 'accounts.json');

    // Ensure the directory exists
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(accountsFilePath, JSON.stringify(accounts, null, 2));
    console.log('Accounts written to ../catalogs/accounts.json');
  } catch (error) {
    console.log(error);
  }

  try {
    const response = await axios.get(getPayeesUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    const payees = response?.data?.data?.payees;
    const dirPath = path.join(__dirname, '../catalogs');
    const payeesFilePath = path.join(dirPath, 'payees.json');
    fs.writeFileSync(payeesFilePath, JSON.stringify(payees, null, 2));
    console.log('Payees written to ../catalogs/payees.json');
  } catch (error) {
    console.log(error);
  }

  try {
    const response = await axios.get(getCategoriesUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    const apiCategoryGroups = response?.data?.data;
    const apiCategories = apiCategoryGroups?.category_groups?.map((group) => group.categories).flat();
    if (apiCategories && Array.isArray(apiCategories)) {
      apiCategories.forEach((apiCategory) => {
        const diskCategoryIndex = diskCategories.findIndex((diskCategory) => diskCategory.id === apiCategory.id);
        if (!diskCategoryIndex) {
          diskCategories.push({
            id: apiCategory.id,
            name: apiCategory.name,
          });
        } else {
          diskCategories[diskCategoryIndex].name = apiCategory.name;
        }
      });
    }
    const dirPath = path.join(__dirname, '../catalogs');
    const categoriesFilePath = path.join(dirPath, 'categories.json');
    fs.writeFileSync(categoriesFilePath, JSON.stringify(diskCategories, null, 2));
    console.log('Categories written to ../catalogs/categories.json');
  } catch (error) {
    console.log(error);
  }
}

module.exports = updateCatalogs;
