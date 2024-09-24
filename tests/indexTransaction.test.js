  const indexTransaction = require('../lib/indexTransaction');

  describe('indexTransaction', () => {
    test('should correctly index transactions with valid categories', () => {
      const splitTransaction = {
        aggregated: {
          groceries: [-50000, -20000],
          electronics: [-30000]
        }
      };
      const categories = [
        { id: '1', abbreviation: 'groceries', name: 'Groceries' },
        { id: '2', abbreviation: 'electronics', name: 'Electronics' }
      ];

      const result = indexTransaction(splitTransaction, categories);

      expect(result).toEqual([
        {
          abbreviation: 'groceries',
          category_id: '1',
          categoryName: 'Groceries',
          amount: -70000,
          amounts: [-50000, -20000]
        },
        {
          abbreviation: 'electronics',
          category_id: '2',
          categoryName: 'Electronics',
          amount: -30000,
          amounts: [-30000]
        }
      ]);
    });

    test('should return "Category not found" message for invalid category', () => {
      const splitTransaction = {
        aggregated: {
          groceries: [-50000],
          invalidCategory: [-30000]
        }
      };
      const categories = [
        { id: '1', abbreviation: 'groceries', name: 'Groceries' }
      ];

      const result = indexTransaction(splitTransaction, categories);

      expect(result).toEqual('Category not found for invalidCategory');
    });
  });
