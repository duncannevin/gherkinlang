Feature: UserManagement
  A module for managing and filtering users

  Background:
    Given import Mathematics

  # Get adult users (18+)
  Scenario: adults defines a function
    Given function adults accepts users
    When filter users where item.age >= 18
    Then return result

  # Get user emails
  Scenario: emails defines a function
    Given function emails accepts users
    When map users to get email
    Then return result

  # Get adult emails
  Scenario: adult_emails defines a function
    Given function adult_emails accepts users
    When let adultUsers = adults(users)
    And map adultUsers to get email
    Then return result

  # Sort users by age
  Scenario: sort_by_age defines a function
    Given function sort_by_age accepts users
    When sort users by age
    Then return result

  # Find user by id
  Scenario: find_by_id defines a function
    Given function find_by_id accepts users and id
    When filter users where item.id === id
    And let found = result[0]
    Then return found

  # Calculate average age
  Scenario: average_age defines a function
    Given function average_age accepts users
    When map users to get age
    And let ages = result
    When apply Mathematics.average to ages
    Then return result
