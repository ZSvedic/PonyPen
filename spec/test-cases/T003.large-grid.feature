Feature: Large grid display

  Background:
    Given the PonyPen CLI

  Scenario: Large level row and column numbers are aligned
    When executed: CLI levels/04-large-253.txt
    Then display contains:
      """
                           1 1 1 1 1 1 1 1 1 1 2
       \ 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0
      """
    And display row labels exactly:
      """
       1
       2
       3
       4
       5
       6
       7
       8
       9
      10
      11
      12
      13
      14
      15
      16
      """
    And exit with: 0
