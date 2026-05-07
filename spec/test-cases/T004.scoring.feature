Feature: Scoring

  Background:
    Given the PonyPen CLI

  Scenario: Score a non-peak enclosed pen with item bonuses
    When executed: CLI levels/02-cherry_apple-19.txt "r1c2 r3c2 r4c3 r2c4"
    Then display contains:
      """
      = # = = .
      = P . # .
      . # C A =
      . = # = .
      Score: 17
      Enclosed? Yes. Optimal? Neigh.
      """
    And exit with: 0

  Scenario: Score a non-peak enclosed pen with teleport
    When executed: CLI levels/03-bees_teleport-19.txt "r2c3 r3c2 r5c1 r5c6"
    Then display contains:
      """
      . = = = = = = .
      = B # = . = . .
      = # @ . . = . .
      = = = = P = . .
      # @ A = . # . .
      . = = = = = = .
      Score: 18
      Enclosed? Yes. Optimal? Neigh.
      """
    And exit with: 0
