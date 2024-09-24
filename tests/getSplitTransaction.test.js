  const getSplitTransaction = require('../lib/getSplitTransaction');

  describe('getSplitTransaction', () => {
    test('should correctly parse and split the transaction details', () => {
      const detailInput = '55.50a32.10hf12.40hw24.01l5.99pf109.22tot';
      const result = getSplitTransaction(detailInput);

      expect(result.total).toBe(-109220);
      expect(result.discount).toBeUndefined();
      expect(result.giftCard).toBeUndefined();
      expect(result.salesTax).toBe(8.5);
      expect(result.groceryTax).toBe(1.5);
      expect(result.aggregated).toEqual({
        a: [-55500],
        hf: [-32100],
        hw: [-12400],
        l: [-24010],
        pf: [-5990]
      });
    });
  });
