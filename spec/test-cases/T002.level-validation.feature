Feature: Level validation

  Background:
    Given the PonyPen CLI

  Scenario Outline: CLI output is consistent with level files
    Given a <level> file
    And string {Solution} is R1C1 rock positions extracted via "rocks2moves.py <level>"
    When executed: CLI <level> {Solution}
    Then string {DisplayLevel} is extracted from <level> file with spaces and row/col numbers 
    And display:
      """
      {DisplayLevel}
      {msg}
      """
    And exit with: <exit>

    Examples:
      | level                           | exit | msg                                          |
      | levels/01-minimal-1.txt         | 0    | Score: 1\nPeak Pony Score!                   |
      | levels/02-cherry_apple-19.txt   | 0    | Score: 19\nPeak Pony Score!                  |
      | levels/03-bees_teleport-19.txt  | 0    | Score: 19\nPeak Pony Score!                  |
      | levels/04-large-253.txt         | 0    | Score: 253\nPeak Pony Score!                 |
      | levels/51-bad_no_rocks-0.txt    | 1    | ERROR: Level has no solution.                |
      | levels/52-bad_leak-1.txt        | 1    | ERROR: Pony is not enclosed by the solution. |
      | levels/53-bad_extra_rocks-4.txt | 1    | ERROR: Level has a suboptimal solution.      |
