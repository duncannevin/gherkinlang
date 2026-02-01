Feature: StringUtils
  A module for string manipulation utilities

  Background:
    Given import Mathematics

  # Uppercase all strings
  Scenario: uppercase_all defines a function
    Given function uppercase_all accepts strings
    When map strings to item.toUpperCase()
    Then return result

  # Lowercase all strings
  Scenario: lowercase_all defines a function
    Given function lowercase_all accepts strings
    When map strings to item.toLowerCase()
    Then return result

  # Filter strings by minimum length
  Scenario: longer_than defines a function
    Given function longer_than accepts strings and minLength
    When filter strings where item.length > minLength
    Then return result

  # Join strings with separator
  Scenario: join_with defines a function
    Given function join_with accepts strings and separator
    When let joined = strings.join(separator)
    Then return joined

  # Count total characters across all strings
  Scenario: total_length defines a function
    Given function total_length accepts strings
    When map strings to item.length
    And apply Mathematics.sum to result
    Then return result

  # Filter non-empty strings
  Scenario: non_empty defines a function
    Given function non_empty accepts strings
    When filter strings where item.length > 0
    Then return result

  # Trim all strings
  Scenario: trim_all defines a function
    Given function trim_all accepts strings
    When map strings to item.trim()
    Then return result
