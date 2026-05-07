Feature: CLI use

  Background:
    Given the PonyPen CLI

  Scenario Outline: Help
    When executed: CLI <option>
    Then display:
      """
      USAGE: ./ponypen-cli.js levelFile ["rock1 rock2 ..."]
      Rock placements are set in R1C1 format. After all rocks are set the solution is scored.
      If no rocks, game starts in the interactive mode.
      """
    And exit with: <exit>

    Examples:
      | option | exit |
      |        | 2    |
      | --help | 0    |
      | -h     | 0    |
