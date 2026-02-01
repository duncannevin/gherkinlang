/**
 * Auto-generated tests for mathematics
 * Source: dist/mathematics.js
 * Generated: 2026-02-01T01:49:03.864Z
 */

const { add, subtract, multiply, divide, sum, average, factorial, isPrime, checkDivisors, getPrimes } = require('../../dist/mathematics');

describe('mathematics', () => {
  describe('add', () => {
    describe('type validation', () => {
      it('should handle string for parameter \'a\'', () => {
        expect(() => add("string", 1)).toThrow();
      });

      it('should handle boolean for parameter \'a\'', () => {
        expect(() => add(true, 1)).toThrow();
      });

      it('should handle array for parameter \'a\'', () => {
        expect(() => add([], 1)).toThrow();
      });

      it('should handle string for parameter \'b\'', () => {
        expect(() => add(1, "string")).toThrow();
      });

      it('should handle boolean for parameter \'b\'', () => {
        expect(() => add(1, true)).toThrow();
      });

      it('should handle array for parameter \'b\'', () => {
        expect(() => add(1, [])).toThrow();
      });

    });

    describe('edge cases', () => {
      it('should handle zero for \'a\'', () => {
        expect(() => add(0, 1)).not.toThrow();
      });

      it('should handle negative number for \'a\'', () => {
        expect(() => add(-1, 1)).not.toThrow();
      });

      it('should handle decimal number for \'a\'', () => {
        expect(() => add(1.5, 1)).not.toThrow();
      });

      it('should handle zero for \'b\'', () => {
        expect(() => add(1, 0)).not.toThrow();
      });

      it('should handle negative number for \'b\'', () => {
        expect(() => add(1, -1)).not.toThrow();
      });

      it('should handle decimal number for \'b\'', () => {
        expect(() => add(1, 1.5)).not.toThrow();
      });

    });

    describe('boundary values', () => {
      it('should handle zero for \'a\'', () => {
        expect(() => add(0, 1)).not.toThrow();
      });

      it('should handle negative one for \'a\'', () => {
        expect(() => add(-1, 1)).not.toThrow();
      });

      it('should handle positive one for \'a\'', () => {
        expect(() => add(1, 1)).not.toThrow();
      });

      it('should handle negative infinity for \'a\'', () => {
        expect(() => add(-Infinity, 1)).not.toThrow();
      });

      it('should handle zero for \'b\'', () => {
        expect(() => add(1, 0)).not.toThrow();
      });

      it('should handle negative one for \'b\'', () => {
        expect(() => add(1, -1)).not.toThrow();
      });

      it('should handle positive one for \'b\'', () => {
        expect(() => add(1, 1)).not.toThrow();
      });

      it('should handle negative infinity for \'b\'', () => {
        expect(() => add(1, -Infinity)).not.toThrow();
      });

    });
  });

  describe('subtract', () => {
    describe('type validation', () => {
      it('should handle string for parameter \'a\'', () => {
        expect(() => subtract("string", 1)).toThrow();
      });

      it('should handle boolean for parameter \'a\'', () => {
        expect(() => subtract(true, 1)).toThrow();
      });

      it('should handle array for parameter \'a\'', () => {
        expect(() => subtract([], 1)).toThrow();
      });

      it('should handle string for parameter \'b\'', () => {
        expect(() => subtract(1, "string")).toThrow();
      });

      it('should handle boolean for parameter \'b\'', () => {
        expect(() => subtract(1, true)).toThrow();
      });

      it('should handle array for parameter \'b\'', () => {
        expect(() => subtract(1, [])).toThrow();
      });

    });

    describe('edge cases', () => {
      it('should handle zero for \'a\'', () => {
        expect(() => subtract(0, 1)).not.toThrow();
      });

      it('should handle negative number for \'a\'', () => {
        expect(() => subtract(-1, 1)).not.toThrow();
      });

      it('should handle decimal number for \'a\'', () => {
        expect(() => subtract(1.5, 1)).not.toThrow();
      });

      it('should handle zero for \'b\'', () => {
        expect(() => subtract(1, 0)).not.toThrow();
      });

      it('should handle negative number for \'b\'', () => {
        expect(() => subtract(1, -1)).not.toThrow();
      });

      it('should handle decimal number for \'b\'', () => {
        expect(() => subtract(1, 1.5)).not.toThrow();
      });

    });

    describe('boundary values', () => {
      it('should handle zero for \'a\'', () => {
        expect(() => subtract(0, 1)).not.toThrow();
      });

      it('should handle negative one for \'a\'', () => {
        expect(() => subtract(-1, 1)).not.toThrow();
      });

      it('should handle positive one for \'a\'', () => {
        expect(() => subtract(1, 1)).not.toThrow();
      });

      it('should handle negative infinity for \'a\'', () => {
        expect(() => subtract(-Infinity, 1)).not.toThrow();
      });

      it('should handle zero for \'b\'', () => {
        expect(() => subtract(1, 0)).not.toThrow();
      });

      it('should handle negative one for \'b\'', () => {
        expect(() => subtract(1, -1)).not.toThrow();
      });

      it('should handle positive one for \'b\'', () => {
        expect(() => subtract(1, 1)).not.toThrow();
      });

      it('should handle negative infinity for \'b\'', () => {
        expect(() => subtract(1, -Infinity)).not.toThrow();
      });

    });
  });

  describe('multiply', () => {
    describe('type validation', () => {
      it('should handle string for parameter \'a\'', () => {
        expect(() => multiply("string", 1)).toThrow();
      });

      it('should handle boolean for parameter \'a\'', () => {
        expect(() => multiply(true, 1)).toThrow();
      });

      it('should handle array for parameter \'a\'', () => {
        expect(() => multiply([], 1)).toThrow();
      });

      it('should handle string for parameter \'b\'', () => {
        expect(() => multiply(1, "string")).toThrow();
      });

      it('should handle boolean for parameter \'b\'', () => {
        expect(() => multiply(1, true)).toThrow();
      });

      it('should handle array for parameter \'b\'', () => {
        expect(() => multiply(1, [])).toThrow();
      });

    });

    describe('edge cases', () => {
      it('should handle zero for \'a\'', () => {
        expect(() => multiply(0, 1)).not.toThrow();
      });

      it('should handle negative number for \'a\'', () => {
        expect(() => multiply(-1, 1)).not.toThrow();
      });

      it('should handle decimal number for \'a\'', () => {
        expect(() => multiply(1.5, 1)).not.toThrow();
      });

      it('should handle zero for \'b\'', () => {
        expect(() => multiply(1, 0)).not.toThrow();
      });

      it('should handle negative number for \'b\'', () => {
        expect(() => multiply(1, -1)).not.toThrow();
      });

      it('should handle decimal number for \'b\'', () => {
        expect(() => multiply(1, 1.5)).not.toThrow();
      });

    });

    describe('boundary values', () => {
      it('should handle zero for \'a\'', () => {
        expect(() => multiply(0, 1)).not.toThrow();
      });

      it('should handle negative one for \'a\'', () => {
        expect(() => multiply(-1, 1)).not.toThrow();
      });

      it('should handle positive one for \'a\'', () => {
        expect(() => multiply(1, 1)).not.toThrow();
      });

      it('should handle negative infinity for \'a\'', () => {
        expect(() => multiply(-Infinity, 1)).not.toThrow();
      });

      it('should handle zero for \'b\'', () => {
        expect(() => multiply(1, 0)).not.toThrow();
      });

      it('should handle negative one for \'b\'', () => {
        expect(() => multiply(1, -1)).not.toThrow();
      });

      it('should handle positive one for \'b\'', () => {
        expect(() => multiply(1, 1)).not.toThrow();
      });

      it('should handle negative infinity for \'b\'', () => {
        expect(() => multiply(1, -Infinity)).not.toThrow();
      });

    });
  });

  describe('divide', () => {
    describe('type validation', () => {
      it('should handle string for parameter \'a\'', () => {
        expect(() => divide("string", 1)).toThrow();
      });

      it('should handle boolean for parameter \'a\'', () => {
        expect(() => divide(true, 1)).toThrow();
      });

      it('should handle array for parameter \'a\'', () => {
        expect(() => divide([], 1)).toThrow();
      });

      it('should handle string for parameter \'b\'', () => {
        expect(() => divide(1, "string")).toThrow();
      });

      it('should handle boolean for parameter \'b\'', () => {
        expect(() => divide(1, true)).toThrow();
      });

      it('should handle array for parameter \'b\'', () => {
        expect(() => divide(1, [])).toThrow();
      });

    });

    describe('edge cases', () => {
      it('should handle zero for \'a\'', () => {
        expect(() => divide(0, 1)).not.toThrow();
      });

      it('should handle negative number for \'a\'', () => {
        expect(() => divide(-1, 1)).not.toThrow();
      });

      it('should handle decimal number for \'a\'', () => {
        expect(() => divide(1.5, 1)).not.toThrow();
      });

      it('should handle zero for \'b\'', () => {
        expect(() => divide(1, 0)).not.toThrow();
      });

      it('should handle negative number for \'b\'', () => {
        expect(() => divide(1, -1)).not.toThrow();
      });

      it('should handle decimal number for \'b\'', () => {
        expect(() => divide(1, 1.5)).not.toThrow();
      });

    });

    describe('boundary values', () => {
      it('should handle zero for \'a\'', () => {
        expect(() => divide(0, 1)).not.toThrow();
      });

      it('should handle negative one for \'a\'', () => {
        expect(() => divide(-1, 1)).not.toThrow();
      });

      it('should handle positive one for \'a\'', () => {
        expect(() => divide(1, 1)).not.toThrow();
      });

      it('should handle negative infinity for \'a\'', () => {
        expect(() => divide(-Infinity, 1)).not.toThrow();
      });

      it('should handle zero for \'b\'', () => {
        expect(() => divide(1, 0)).not.toThrow();
      });

      it('should handle negative one for \'b\'', () => {
        expect(() => divide(1, -1)).not.toThrow();
      });

      it('should handle positive one for \'b\'', () => {
        expect(() => divide(1, 1)).not.toThrow();
      });

      it('should handle negative infinity for \'b\'', () => {
        expect(() => divide(1, -Infinity)).not.toThrow();
      });

    });
  });

  describe('sum', () => {
    describe('type validation', () => {
      it('should handle string for parameter \'numbers\'', () => {
        expect(() => sum("string")).toThrow();
      });

      it('should handle boolean for parameter \'numbers\'', () => {
        expect(() => sum(true)).toThrow();
      });

      it('should handle array for parameter \'numbers\'', () => {
        expect(() => sum([])).toThrow();
      });

    });

    describe('edge cases', () => {
      it('should handle zero for \'numbers\'', () => {
        expect(() => sum(0)).not.toThrow();
      });

      it('should handle negative number for \'numbers\'', () => {
        expect(() => sum(-1)).not.toThrow();
      });

      it('should handle decimal number for \'numbers\'', () => {
        expect(() => sum(1.5)).not.toThrow();
      });

    });

  });

  describe('average', () => {
    describe('type validation', () => {
      it('should handle string for parameter \'numbers\'', () => {
        expect(() => average("string")).toThrow();
      });

      it('should handle boolean for parameter \'numbers\'', () => {
        expect(() => average(true)).toThrow();
      });

      it('should handle array for parameter \'numbers\'', () => {
        expect(() => average([])).toThrow();
      });

    });

    describe('edge cases', () => {
      it('should handle zero for \'numbers\'', () => {
        expect(() => average(0)).not.toThrow();
      });

      it('should handle negative number for \'numbers\'', () => {
        expect(() => average(-1)).not.toThrow();
      });

      it('should handle decimal number for \'numbers\'', () => {
        expect(() => average(1.5)).not.toThrow();
      });

    });

  });

  describe('factorial', () => {
    describe('type validation', () => {
      it('should handle string for parameter \'n\'', () => {
        expect(() => factorial("string")).toThrow();
      });

      it('should handle boolean for parameter \'n\'', () => {
        expect(() => factorial(true)).toThrow();
      });

      it('should handle array for parameter \'n\'', () => {
        expect(() => factorial([])).toThrow();
      });

    });

    describe('edge cases', () => {
      it('should handle zero for \'n\'', () => {
        expect(() => factorial(0)).not.toThrow();
      });

      it('should handle negative number for \'n\'', () => {
        expect(() => factorial(-1)).not.toThrow();
      });

      it('should handle decimal number for \'n\'', () => {
        expect(() => factorial(1.5)).not.toThrow();
      });

    });

    describe('boundary values', () => {
      it('should handle zero for \'n\'', () => {
        expect(() => factorial(0)).not.toThrow();
      });

      it('should handle negative one for \'n\'', () => {
        expect(() => factorial(-1)).not.toThrow();
      });

      it('should handle positive one for \'n\'', () => {
        expect(() => factorial(1)).not.toThrow();
      });

      it('should handle negative infinity for \'n\'', () => {
        expect(() => factorial(-Infinity)).not.toThrow();
      });

    });
  });

  describe('isPrime', () => {
    describe('type validation', () => {
      it('should handle string for parameter \'n\'', () => {
        expect(() => isPrime("string")).toThrow();
      });

      it('should handle boolean for parameter \'n\'', () => {
        expect(() => isPrime(true)).toThrow();
      });

      it('should handle array for parameter \'n\'', () => {
        expect(() => isPrime([])).toThrow();
      });

    });

    describe('edge cases', () => {
      it('should handle zero for \'n\'', () => {
        expect(() => isPrime(0)).not.toThrow();
      });

      it('should handle negative number for \'n\'', () => {
        expect(() => isPrime(-1)).not.toThrow();
      });

      it('should handle decimal number for \'n\'', () => {
        expect(() => isPrime(1.5)).not.toThrow();
      });

    });

    describe('boundary values', () => {
      it('should handle zero for \'n\'', () => {
        expect(() => isPrime(0)).not.toThrow();
      });

      it('should handle negative one for \'n\'', () => {
        expect(() => isPrime(-1)).not.toThrow();
      });

      it('should handle positive one for \'n\'', () => {
        expect(() => isPrime(1)).not.toThrow();
      });

      it('should handle negative infinity for \'n\'', () => {
        expect(() => isPrime(-Infinity)).not.toThrow();
      });

    });
  });

  describe('checkDivisors', () => {
    describe('type validation', () => {
      it('should handle string for parameter \'n\'', () => {
        expect(() => checkDivisors("string")).toThrow();
      });

      it('should handle boolean for parameter \'n\'', () => {
        expect(() => checkDivisors(true)).toThrow();
      });

      it('should handle array for parameter \'n\'', () => {
        expect(() => checkDivisors([])).toThrow();
      });

    });

    describe('edge cases', () => {
      it('should handle zero for \'n\'', () => {
        expect(() => checkDivisors(0)).not.toThrow();
      });

      it('should handle negative number for \'n\'', () => {
        expect(() => checkDivisors(-1)).not.toThrow();
      });

      it('should handle decimal number for \'n\'', () => {
        expect(() => checkDivisors(1.5)).not.toThrow();
      });

    });

    describe('boundary values', () => {
      it('should handle zero for \'n\'', () => {
        expect(() => checkDivisors(0)).not.toThrow();
      });

      it('should handle negative one for \'n\'', () => {
        expect(() => checkDivisors(-1)).not.toThrow();
      });

      it('should handle positive one for \'n\'', () => {
        expect(() => checkDivisors(1)).not.toThrow();
      });

      it('should handle negative infinity for \'n\'', () => {
        expect(() => checkDivisors(-Infinity)).not.toThrow();
      });

    });
  });

  describe('getPrimes', () => {
    describe('type validation', () => {
      it('should handle string for parameter \'max\'', () => {
        expect(() => getPrimes("string")).toThrow();
      });

      it('should handle boolean for parameter \'max\'', () => {
        expect(() => getPrimes(true)).toThrow();
      });

      it('should handle array for parameter \'max\'', () => {
        expect(() => getPrimes([])).toThrow();
      });

    });

    describe('edge cases', () => {
      it('should handle zero for \'max\'', () => {
        expect(() => getPrimes(0)).not.toThrow();
      });

      it('should handle negative number for \'max\'', () => {
        expect(() => getPrimes(-1)).not.toThrow();
      });

      it('should handle decimal number for \'max\'', () => {
        expect(() => getPrimes(1.5)).not.toThrow();
      });

    });

    describe('boundary values', () => {
      it('should handle zero for \'max\'', () => {
        expect(() => getPrimes(0)).not.toThrow();
      });

      it('should handle negative one for \'max\'', () => {
        expect(() => getPrimes(-1)).not.toThrow();
      });

      it('should handle positive one for \'max\'', () => {
        expect(() => getPrimes(1)).not.toThrow();
      });

      it('should handle negative infinity for \'max\'', () => {
        expect(() => getPrimes(-Infinity)).not.toThrow();
      });

    });
  });

});