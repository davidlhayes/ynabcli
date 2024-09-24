  const checkArguments = require('../lib/checkArguments');

  describe('checkArguments', () => {
    test('should return needsHelp as true when help argument is passed', () => {
      const args = ['help'];
      const result = checkArguments(args);
      console.log('result:', result);
      expect(result.needsHelp).toBe(true);
    });

    test('should return needsArgs as true when args argument is passed', () => {
      const args = ['args'];
      const result = checkArguments(args);
      expect(result.needsArgs).toBe(true);
    });

    test('should set detailInput when one argument is passed', () => {
      const args = ['12.99g3.99hw19.99c3.99g1.25g24.88c8.5tax34.15tot'];
      const result = checkArguments(args);
      expect(result.detailInput).toBe('12.99g3.99hw19.99c3.99g1.25g24.88c8.5tax34.15tot');
    });

    test('should set detailInput and inputCatchAllCategoryAbbreviation when two arguments are passed', () => {
      const args = ['12.99g3.99hw19.99c3.99g1.25g24.88c8.5tax34.15tot', 'g'];
      const result = checkArguments(args);
      expect(result.detailInput).toBe('12.99g3.99hw19.99c3.99g1.25g24.88c8.5tax34.15tot');
      expect(result.inputCatchAllCategoryAbbreviation).toBe('g');
    });

    test('should set detailInput, payeeInputName, accountInputName, and dateInput when four arguments are passed', () => {
      const args = ['12.99g3.99hw19.99c3.99g1.25g24.88c8.5tax34.15tot', 'Jewel', 'Visa Altitude Go', '2023-10-10'];
      const result = checkArguments(args);
      expect(result.detailInput).toBe('12.99g3.99hw19.99c3.99g1.25g24.88c8.5tax34.15tot');
      expect(result.payeeInputName).toBe('Jewel');
      expect(result.accountInputName).toBe('Visa Altitude Go');
      expect(result.dateInput).toBe('2023-10-10');
    });

    test('should return an error for too many arguments', () => {
      const args = ['12.99g3.99hw19.99c3.99g1.25g24.88c8.5tax34.15tot', 'Jewel', 'Visa Altitude Go', '2023-10-10', 'extra'];
      console.error = jest.fn();
      checkArguments(args);
      expect(console.error).toHaveBeenCalledWith('Too many arguments');
    });

    test('should return an error for invalid date', () => {
      const args = ['12.99g3.99hw19.99c3.99g1.25g24.88c8.5tax34.15tot', 'Jewel', '2024-07-01', 'Trust Checking'];
      console.error = jest.fn();
      checkArguments(args);
      expect(console.error).toHaveBeenCalledWith('Invalid date');
    });
  });
