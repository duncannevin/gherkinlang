Feature: ShoppingCart
  A module for shopping cart calculations

  Background:
    Given import Mathematics

  # Calculate item total (price * quantity)
  Scenario: item_total defines a function
    Given function item_total accepts item
    When apply Mathematics.multiply to item.price and item.quantity
    Then return result

  # Calculate cart subtotal
  Scenario: subtotal defines a function
    Given function subtotal accepts items
    When map items to item_total(item)
    And apply Mathematics.sum to result
    Then return result

  # Apply discount percentage
  Scenario: apply_discount defines a function
    Given function apply_discount accepts amount and discountPercent
    When apply Mathematics.divide to discountPercent and 100
    And let rate = result
    When apply Mathematics.multiply to amount and rate
    And let discount = result
    When apply Mathematics.subtract to amount and discount
    Then return result

  # Get items in stock
  Scenario: in_stock defines a function
    Given function in_stock accepts items
    When filter items where item.inStock === true
    Then return result

  # Get expensive items (over threshold)
  Scenario: expensive_items defines a function
    Given function expensive_items accepts items and threshold
    When filter items where item.price > threshold
    Then return result

  # Calculate cart total with tax
  Scenario: total_with_tax defines a function
    Given function total_with_tax accepts items and taxRate
    When let sub = subtotal(items)
    And apply Mathematics.divide to taxRate and 100
    And let rate = result
    When apply Mathematics.multiply to sub and rate
    And let tax = result
    When apply Mathematics.add to sub and tax
    Then return result

  # Count total items in cart
  Scenario: total_quantity defines a function
    Given function total_quantity accepts items
    When map items to get quantity
    And apply Mathematics.sum to result
    Then return result
