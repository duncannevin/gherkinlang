Feature: Mathematics
  A module for basic mathematical operations

Background:
  Given import lodash as _

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

  # Factorial
  Scenario: factorial defines a recursive function
    Given function factorial accepts n  
    When n matches
      |0|1                  |
      |1|1                  |
      |_| n * factorial(n-1)|
    Then return result

  Scenario: isPrime defines a function
    Given function isPrime accepts n
    When n matches
      | n < 2        | false                                    |
      | n === 2      | true                                     |
      | n % 2 === 0  | false                                    |
      | _            | checkDivisors(n)                         |
    Then return result

  Scenario: checkDivisors defines a function
    Given function checkDivisors accepts n
    When let limit = Math.floor(Math.sqrt(n))
    And let divisors = _.range(3, limit + 1, 2)
    And let noDivisors = _.every(divisors, d => n % d !== 0)
    Then return noDivisors

  Scenario: getPrimes defines a function
    Given function getPrimes accepts max
    When let numbers = _.range(2, max + 1)
    And filter numbers where isPrime(number)
    Then return result
  
  Scenario: sum defines a function
    Given function sum accepts list
    When list matches
    | []          | 0                | 
    | [head|tail] | head + sum(tail) |