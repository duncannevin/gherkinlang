Feature: Application
  Main application demonstrating all modules working together

  Background:
    Given import Mathematics
    Given import UserManagement
    Given import StringUtils
    Given import ShoppingCart

  # Demo: Calculate order summary for adult users
  Scenario: order_summary defines a function
    Given function order_summary accepts users and cart and taxRate
    # Get only adult users
    When apply UserManagement.adults to users
    And let adultUsers = result
    # Get count of adult users
    And let userCount = adultUsers.length
    # Calculate cart total with tax
    When apply ShoppingCart.total_with_tax to cart and taxRate
    And let total = result
    # Calculate per-person split
    When apply Mathematics.divide to total and userCount
    Then return result

  # Demo: Format user names for display
  Scenario: format_user_names defines a function
    Given function format_user_names accepts users
    When map users to get name
    And apply StringUtils.uppercase_all to result
    And let names = result
    When apply StringUtils.join_with to names and ", "
    Then return result

  # Demo: Get valuable cart items for adults
  Scenario: premium_items_for_adults defines a function
    Given function premium_items_for_adults accepts users and cart and minPrice
    When apply UserManagement.adults to users
    And let adultUsers = result
    When apply ShoppingCart.expensive_items to cart and minPrice
    And let premiumItems = result
    When apply ShoppingCart.subtotal to premiumItems
    Then return result

  # Demo: Calculate average spending per item
  Scenario: average_item_price defines a function
    Given function average_item_price accepts cart
    When map cart to get price
    And apply Mathematics.average to result
    Then return result

  # Demo: Get summary stats
  Scenario: cart_stats defines a function
    Given function cart_stats accepts cart
    When apply ShoppingCart.subtotal to cart
    And let total = result
    When apply ShoppingCart.total_quantity to cart
    And let quantity = result
    When apply ShoppingCart.in_stock to cart
    And let available = result
    And let availableCount = available.length
    Then return { total, quantity, availableCount }
