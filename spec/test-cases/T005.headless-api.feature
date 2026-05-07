Feature: Headless game API

  Background:
    Given the PonyPen headless core

  Scenario: Model state and scoring without a shell
    Given level text from "levels/01-minimal-1.txt"
    When a game is created from the level text
    And action toggleRock with row 2, col 1
    And action toggleRock with row 2, col 3
    And action toggleRock with row 3, col 2
    And action score is called
    Then the game state has width 3 and height 3
    And the current board is:
      """
      .==
      #P#
      .#.
      """
    And the score result is:
      """
      Score: 1
      Peak Pony Score!
      """
    And emitted events are:
      """
      rock-added r2c1
      rock-added r2c3
      rock-added r3c2
      scored
      """

  Scenario: enclosedMap reflects enclosed region after rock toggles
    Given level text from "levels/02-cherry_apple-19.txt"
    When a game is created from the level text
    Then the enclosedMap is all false
    When action toggleRock with row 1, col 2
    And action toggleRock with row 3, col 2
    And action toggleRock with row 4, col 3
    And action toggleRock with row 2, col 4
    Then the enclosedMap is:
      """
      . . . . .
      . T T . .
      . . T T .
      . . . . .
      """
    When action reset is called
    Then the enclosedMap is all false
