Feature: Mathematics
  A module for basic mathematical operations

  # Addition
  Scenario: add defines a function
    Given function add accepts a and b
    When add a and b
    Then return result

  # Subtraction  
  Scenario: subtract defines a function
    Given function subtract accepts a and b
    When subtract b from a
    Then return result

  # Multiply
  Scenario: multiply defines a function
    Given function multiply accepts a and b
    When multiply a by b
    Then return result

  # Divide
  Scenario: divide defines a function
    Given function divide accepts a and b
    When divide a by b
    Then return result

  # Sum of array
  Scenario: sum defines a function
    Given function sum accepts numbers
    When reduce numbers with 0 and add accumulator to item
    Then return result

  # Average
  Scenario: average defines a function
    Given function average accepts numbers
    When let total = sum(numbers)
    And let count = numbers.length
    When divide total by count
    Then return result
