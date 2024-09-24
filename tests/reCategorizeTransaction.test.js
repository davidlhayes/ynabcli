  const reCategorizeTransaction = require('../lib/reCategorizeTransaction');

  describe('reCategorizeTransaction', () => {
    test('should correctly re-categorize transaction amounts', () => {
      const taxedTransaction = [
        { amount: 1000, amounts: [500, 500] },
        { amount: 2000, amounts: [1000, 1000] }
      ];

      const result = reCategorizeTransaction(taxedTransaction);

      expect(result).toEqual([
        { amount: 1000, amounts: [450, 450] },
        { amount: 2000, amounts: [900, 900] }
      ]);
    });

    test('should handle zero amounts correctly', () => {
      const taxedTransaction = [
        { amount: 0, amounts: [0, 0] }
      ];

      const result = reCategorizeTransaction(taxedTransaction);

      expect(result).toEqual([
        { amount: 0, amounts: [0, 0] }
      ]);
    });

    test('should handle mixed amounts correctly', () => {
      const taxedTransaction = [
        { amount: 1000, amounts: [500, 500] },
        { amount: 0, amounts: [0, 0] }
      ];

      const result = reCategorizeTransaction(taxedTransaction);

      expect(result).toEqual([
        { amount: 1000, amounts: [450, 450] },
        { amount: 0, amounts: [0, 0] }
      ]);
    });
  });
