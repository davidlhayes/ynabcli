  const totalTransaction = require('../lib/totalTransaction');

  describe('totalTransaction', () => {
    test('should apply discount correctly', () => {
      const taxedTransaction = [
        { amount: 1000, amounts: [500, 500] },
        { amount: 2000, amounts: [1000, 1000] }
      ];
      const total = 3000;
      const discount = 0.9;
      const giftCard = null;

      const result = totalTransaction(taxedTransaction, total, discount, giftCard);

      expect(result).toEqual([
        { amount: 900, amounts: [450, 450] },
        { amount: 1800, amounts: [900, 900] }
      ]);
    });

    test('should apply gift card correctly', () => {
      const taxedTransaction = [
        { amount: 1000, amounts: [500, 500] },
        { amount: 2000, amounts: [1000, 1000] }
      ];
      const total = 3000;
      const discount = null;
      const giftCard = 300;

      const result = totalTransaction(taxedTransaction, total, discount, giftCard);

      expect(result).toEqual([
        { amount: 900, amounts: [450, 450] },
        { amount: 1800, amounts: [900, 900, 300] }
      ]);
    });

    test('should apply both discount and gift card correctly', () => {
      const taxedTransaction = [
        { amount: 1000, amounts: [500, 500] },
        { amount: 2000, amounts: [1000, 1000] }
      ];
      const total = 3000;
      const discount = 0.9;
      const giftCard = 300;

      const result = totalTransaction(taxedTransaction, total, discount, giftCard);

      expect(result).toEqual([
        { amount: 810, amounts: [405, 405] },
        { amount: 1620, amounts: [810, 810, 270] }
      ]);
    });

    test('should handle zero discount and gift card correctly', () => {
      const taxedTransaction = [
        { amount: 1000, amounts: [500, 500] },
        { amount: 2000, amounts: [1000, 1000] }
      ];
      const total = 3000;
      const discount = 1;
      const giftCard = 0;

      const result = totalTransaction(taxedTransaction, total, discount, giftCard);

      expect(result).toEqual([
        { amount: 1000, amounts: [500, 500] },
        { amount: 2000, amounts: [1000, 1000] }
      ]);
    });
  });
