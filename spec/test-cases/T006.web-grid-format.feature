Feature: Web grid format

  Background:
    Given the PonyPen web shell

  Scenario: Board uses an HTML/CSS grid with crisp external labels and DOM controls
    When opened: WEB levels/03-bees_teleport-19.txt
    Then the board is rendered with an HTML/CSS grid (no <canvas>)
    And tile glyphs render as crisp DOM text on high-DPI screens
    And row and column labels are visible outside board tiles
    And row and column labels are not rendered inside tiles
    And undo, redo, reset, and help controls are visible as DOM buttons
    And placed rock count, bonus, score/result, best, and loaded level labels are visible
    And the level dropdown options show only the level name (no size, no best)

  Scenario: Enclosed passable tiles turn yellow
    When opened: WEB levels/01-minimal-1.txt
    And clicked tile: r2c1
    And clicked tile: r2c3
    And clicked tile: r3c2
    Then the tile backgrounds are:
      | r1c1 | green  |
      | r1c2 | blue   |
      | r1c3 | blue   |
      | r2c1 | gray   |
      | r2c2 | yellow |
      | r2c3 | gray   |
      | r3c1 | green  |
      | r3c2 | gray   |
      | r3c3 | green  |
