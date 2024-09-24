  const taxTransaction = require('../lib/taxTransaction');

  describe('taxTransaction', () => {
    test('should correctly calculate sales tax for a given amount', () => {
      const amount = 1000;
      const salesTaxRate = 1.085;
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
