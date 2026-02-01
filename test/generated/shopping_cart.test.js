/**
 * Auto-generated tests for shopping_cart
 * Source: dist/shopping_cart.js
 * Generated: 2026-02-01T01:01:25.164Z
 */

const { item_total, subtotal, apply_discount, in_stock, expensive_items, total_with_tax, total_quantity } = require('../../dist/shopping_cart');

describe('shopping_cart', () => {
  describe('item_total', () => {
    describe('type validation', () => {
      it('should handle string for parameter \'item\'', () => {
        expect(() => item_total("string")).toThrow();
      });

      it('should handle number for parameter \'item\'', () => {
        expect(() => item_total(42)).toThrow();
      });

      it('should handle boolean for parameter \'item\'', () => {
        expect(() => item_total(true)).toThrow();
      });

    });

    describe('edge cases', () => {
      it('should handle empty object for \'item\'', () => {
        expect(() => item_total({})).not.toThrow();
      });

      it('should handle null for \'item\'', () => {
        expect(() => item_total(null)).not.toThrow();
      });

    });

  });

  describe('subtotal', () => {
    describe('type validation', () => {
      it('should handle string for parameter \'items\'', () => {
        expect(() => subtotal("string")).toThrow();
      });

      it('should handle number for parameter \'items\'', () => {
        expect(() => subtotal(42)).toThrow();
      });

      it('should handle boolean for parameter \'items\'', () => {
        expect(() => subtotal(true)).toThrow();
      });

    });

    describe('edge cases', () => {
      it('should handle empty array for \'items\'', () => {
        expect(() => subtotal([])).not.toThrow();
      });

      it('should handle single element array for \'items\'', () => {
        expect(() => subtotal([1])).not.toThrow();
      });

      it('should handle large array for \'items\'', () => {
        expect(() => subtotal([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0])).not.toThrow();
      });

    });

  });

  describe('apply_discount', () => {
    describe('type validation', () => {
      it('should handle string for parameter \'amount\'', () => {
        expect(() => apply_discount("string", null)).toThrow();
      });

      it('should handle boolean for parameter \'amount\'', () => {
        expect(() => apply_discount(true, null)).toThrow();
      });

      it('should handle array for parameter \'amount\'', () => {
        expect(() => apply_discount([], null)).toThrow();
      });

    });

    describe('edge cases', () => {
      it('should handle zero for \'amount\'', () => {
        expect(() => apply_discount(0, null)).not.toThrow();
      });

      it('should handle negative number for \'amount\'', () => {
        expect(() => apply_discount(-1, null)).not.toThrow();
      });

      it('should handle decimal number for \'amount\'', () => {
        expect(() => apply_discount(1.5, null)).not.toThrow();
      });

    });

    describe('boundary values', () => {
      it('should handle zero for \'amount\'', () => {
        expect(() => apply_discount(0, null)).not.toThrow();
      });

      it('should handle negative one for \'amount\'', () => {
        expect(() => apply_discount(-1, null)).not.toThrow();
      });

      it('should handle positive one for \'amount\'', () => {
        expect(() => apply_discount(1, null)).not.toThrow();
      });

      it('should handle negative infinity for \'amount\'', () => {
        expect(() => apply_discount(-Infinity, null)).not.toThrow();
      });

    });
  });

  describe('in_stock', () => {
    describe('type validation', () => {
      it('should handle string for parameter \'items\'', () => {
        expect(() => in_stock("string")).toThrow();
      });

      it('should handle number for parameter \'items\'', () => {
        expect(() => in_stock(42)).toThrow();
      });

      it('should handle boolean for parameter \'items\'', () => {
        expect(() => in_stock(true)).toThrow();
      });

    });

    describe('edge cases', () => {
      it('should handle empty array for \'items\'', () => {
        expect(() => in_stock([])).not.toThrow();
      });

      it('should handle single element array for \'items\'', () => {
        expect(() => in_stock([1])).not.toThrow();
      });

      it('should handle large array for \'items\'', () => {
        expect(() => in_stock([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0])).not.toThrow();
      });

    });

  });

  describe('expensive_items', () => {
    describe('type validation', () => {
      it('should handle string for parameter \'items\'', () => {
        expect(() => expensive_items("string", null)).toThrow();
      });

      it('should handle number for parameter \'items\'', () => {
        expect(() => expensive_items(42, null)).toThrow();
      });

      it('should handle boolean for parameter \'items\'', () => {
        expect(() => expensive_items(true, null)).toThrow();
      });

    });

    describe('edge cases', () => {
      it('should handle empty array for \'items\'', () => {
        expect(() => expensive_items([], null)).not.toThrow();
      });

      it('should handle single element array for \'items\'', () => {
        expect(() => expensive_items([1], null)).not.toThrow();
      });

      it('should handle large array for \'items\'', () => {
        expect(() => expensive_items([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], null)).not.toThrow();
      });

    });

  });

  describe('total_with_tax', () => {
    describe('type validation', () => {
      it('should handle string for parameter \'items\'', () => {
        expect(() => total_with_tax("string", null)).toThrow();
      });

      it('should handle number for parameter \'items\'', () => {
        expect(() => total_with_tax(42, null)).toThrow();
      });

      it('should handle boolean for parameter \'items\'', () => {
        expect(() => total_with_tax(true, null)).toThrow();
      });

    });

    describe('edge cases', () => {
      it('should handle empty array for \'items\'', () => {
        expect(() => total_with_tax([], null)).not.toThrow();
      });

      it('should handle single element array for \'items\'', () => {
        expect(() => total_with_tax([1], null)).not.toThrow();
      });

      it('should handle large array for \'items\'', () => {
        expect(() => total_with_tax([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], null)).not.toThrow();
      });

    });

  });

  describe('total_quantity', () => {
    describe('type validation', () => {
      it('should handle string for parameter \'items\'', () => {
        expect(() => total_quantity("string")).toThrow();
      });

      it('should handle number for parameter \'items\'', () => {
        expect(() => total_quantity(42)).toThrow();
      });

      it('should handle boolean for parameter \'items\'', () => {
        expect(() => total_quantity(true)).toThrow();
      });

    });

    describe('edge cases', () => {
      it('should handle empty array for \'items\'', () => {
        expect(() => total_quantity([])).not.toThrow();
      });

      it('should handle single element array for \'items\'', () => {
        expect(() => total_quantity([1])).not.toThrow();
      });

      it('should handle large array for \'items\'', () => {
        expect(() => total_quantity([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0])).not.toThrow();
      });

    });

  });

});