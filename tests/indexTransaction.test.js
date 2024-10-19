  const indexTransaction = require('../lib/indexTransaction');

  describe('indexTransaction', () => {
    test('should correctly index transactions with valid categories', () => {
      const splitTransaction = {
        total: -109220,
        salesTax: 8.5,
        groceryTax: 1.5,
        aggregated: {
          a: [-25500, -30000],
          hf: [-32100],
          hw: [-2400, -2000, -8000],
          l: [-24010],
          pf: [-5990]
        }
      };
      const categories = [
        { id: '1', abbreviation: 'a', name: 'Appliances' },
        { id: '2', abbreviation: 'hf', name: 'Home Furnishings' },
        { id: '3', abbreviation: 'hw', name: 'Housewares' },
        { id: '4', abbreviation: 'l', name: 'Laundry' },
        { id: '5', abbreviation: 'pf', name: 'Pet Food' }
      ];

      const result = indexTransaction(splitTransaction, categories);

      expect(result).toEqual([
        {
          abbreviation: 'a',
          category_id: '1',
          categoryName: 'Appliances',
          amount: -55500,
          amounts: [-25500, -30000],
        },
        {
          abbreviation: 'hf',
          category_id: '2',
          categoryName: 'Home Furnishings',
          amount: -32100,
          amounts: [-32100],
        },
        {
          abbreviation: 'hw',
          category_id: '3',
          categoryName: 'Housewares',
          amount: -12400,
          amounts: [-2400, -2000, -8000],
        },
        {
          abbreviation: 'l',
          category_id: '4',
          categoryName: 'Laundry',
          amount: -24010,
          amounts: [-24010],
        },
        {
          abbreviation: 'pf',
          category_id: '5',
          categoryName: 'Pet Food',
          amount: -5990,
          amounts: [-5990],
        }
      ]);
    });

    test('should return "Category not found" message for invalid category', () => {
      const splitTransaction = {
        total: -200000,
        aggregated: {
          g: [-10000, -20000, -20000],
          hw: [-1000],
          xxx: [-30000]
        }
      };
      const categories = [
        { id: '1', abbreviation: 'g', name: 'Groceries' },
        { id: '2', abbreviation: 'hw', name: 'Housewares' }
      ];

      const result = indexTransaction(splitTransaction, categories);
      console.log('zzzz result:', result);
      expect(result).toEqual('Category not found for xxx');
    });
  });
