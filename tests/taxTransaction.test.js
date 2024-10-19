  const taxTransaction = require('../lib/taxTransaction');

  describe('taxTransaction', () => {
    test('should correctly calculate sales tax for a given amount', () => {
      const indexedTransactions = [
        { abbreviation: 'c', amount: -50000, amounts: [-35000, -15000] },
        { abbreviation: 'hw', amount: -10000, amounts: [-1000] },
        { abbreviation: 'g', amount: -50250, amounts: [-10250, -20000, -20000] }
      ];
      const salesTaxRate = 8.5;
      const groceryTaxRate = 1.5;
      const result = taxTransaction(amount, salesTaxRate);

      expect(result).toBeCloseTo(1085, 2);
    });

    test('should correctly calculate grocery tax for a given amount', () => {
      const amount = 1000;
      const groceryTaxRate = 1.015;
      const result = taxTransaction(amount, groceryTaxRate);

      expect(result).toBeCloseTo(1015, 2);
    });

    test('should return the original amount if tax rate is 1', () => {
      const amount = 1000;
      const taxRate = 1;
      const result = taxTransaction(amount, taxRate);

      expect(result).toBe(amount);
    });

    test('should handle zero amount correctly', () => {
      const amount = 0;
      const taxRate = 1.085;
      const result = taxTransaction(amount, taxRate);

      expect(result).toBe(0);
    });

    test('should handle zero tax rate correctly', () => {
      const amount = 1000;
      const taxRate = 0;
      const result = taxTransaction(amount, taxRate);

      expect(result).toBe(0);
    });
  });
