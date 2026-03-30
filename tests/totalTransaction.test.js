  const totalTransactionTest = require('../lib/totalTransaction');

  describe('totalTransactionTest', () => {
    test('should apply discount correctly', () => {
      const taxedTransaction = [
        { amount: 1000, amounts: [500, 500] },
        { amount: 2000, amounts: [1000, 1000] }
      ];
      const total = 3000;
      const discount = 0.9;
      const giftCard = null;

      const result = totalTransactionTest(taxedTransaction, total, discount, giftCard);

      expect(result).toEqual([
        { amount: 900, amounts: [450, 450] },
        { amount: 2100, amounts: [900, 900, 300] }
      ]);
      expect(result.reduce((a, tx) => a + tx.amount, 0)).toBe(total);
    });

    test('should apply gift card correctly', () => {
      const taxedTransaction = [
        { amount: 1000, amounts: [500, 500] },
        { amount: 2000, amounts: [1000, 1000] }
      ];
      const total = 3000;
      const discount = null;
      const giftCard = 300;

      const result = totalTransactionTest(taxedTransaction, total, discount, giftCard);

      expect(result).toEqual([
        { amount: 900, amounts: [450, 450] },
        { amount: 2100, amounts: [900, 900, 300] }
      ]);
      expect(result.reduce((a, tx) => a + tx.amount, 0)).toBe(total);
    });

    test('should apply both discount and gift card correctly', () => {
      const taxedTransaction = [
        { amount: 1000, amounts: [500, 500] },
        { amount: 2000, amounts: [1000, 1000] }
      ];
      const total = 3000;
      const discount = 0.9;
      const giftCard = 300;

      const result = totalTransactionTest(taxedTransaction, total, discount, giftCard);

      expect(result).toEqual([
        { amount: 820, amounts: [410, 410] },
        { amount: 2180, amounts: [810, 810, 560] }
      ]);
      expect(result.reduce((a, tx) => a + tx.amount, 0)).toBe(total);
    });

    test('should handle zero discount and gift card correctly', () => {
      const taxedTransaction = [
        { amount: 1000, amounts: [500, 500] },
        { amount: 2000, amounts: [1000, 1000] }
      ];
      const total = 3000;
      const discount = 1;
      const giftCard = 0;

      const result = totalTransactionTest(taxedTransaction, total, discount, giftCard);

      expect(result).toEqual([
        { amount: 1000, amounts: [500, 500] },
        { amount: 2000, amounts: [1000, 1000] }
      ]);
      expect(result.reduce((a, tx) => a + tx.amount, 0)).toBe(total);
    });
  });
