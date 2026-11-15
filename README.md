# Ping-Pong

A browser-based Pong arcade with a gradual tutorial, trajectory prediction challenges, local and AI matches, an AI management mode, and a small top-down world to explore.

## Run

Open `index.html` in a modern browser. The app uses plain HTML, CSS, and JavaScript; no build step or package install is required.

Use the top-bar menu button to hide or show the Arcade sidebar and free up screen space.

## Modes

- **Tutorial:** Six lessons covering paddle movement, returns, tilt, powerups, QTEs, and rally reading.
- **Pong Problems:** Read the frozen ball's direction from the on-court arrow, position your paddle, then test your prediction; practice WASD quicktime combos and drag-tracking bouncing returns.
- **Pong 1v1:** Play against an AI, share a keyboard, or watch two AIs play. In player matches, every second return pauses the rally for a four-key QTE; Player 1 uses W/A/S/D, and Player 2 in Local 1v1 uses the arrow keys. A successful combo gives that player's paddle a short boost. Enabled powerups spawn as glowing orbs on the center line: claim fastball, double-paddle, or double-ball effects by hitting the orb; slowball is sent to your opponent to make their next shot easier to return.
- **Pong Evolution:** Watch your AI play full matches against a rival. Earn cash for its returns, points, and powerups, watch it tilt its paddle, then buy upgrades and incentives. Evolution exports use the `pong-evolution-save` v1 format.
- **Pong World:** Explore an infinite, procedurally generated world with WASD or the arrow keys. Choose Easy (70% saves), Medium (80%), Hard (90%), or Impossible (99%) rival difficulty; your choice is saved with the World. Structures may hide caches, directional puzzles, target training, timed trials, and rival matches. Dungeons share an exterior but vary inside: winding paths, guardian mazes, puzzles, treasure vaults, and rival gauntlets all lead to a boss. Boss QTEs can be stacked before the center line; each success speeds up the ball. The hideable quest log includes the un-cancelable Pong God quest, whose description is “Defeat the Pong Devil,” plus active contracts that can be canceled. Use the **CHALLENGE THE PONG DEVIL** button or enter ↑, ↑, ↓, ↓, ←, →, ←, → to challenge the 3D Pong Devil. It saves 99.99% of ordinary shots (a 0.01% miss chance); three successful QTE combos launch a cross-court paddle strike that raises that shot's miss chance to 0.1%. The Pong Devil teleports through decoy positions before snapping to its target and can slightly warp incoming shots. The match is first to 3 points. The player paddle is larger, tilt lingers briefly after release, and regular QTEs trigger every other player return. Take on courier/scavenging/1v1 sparring contracts, and play one-on-one matches with powerups. Your location, crew, inventory, and progress are saved separately.

Evolution and World progress use different local-storage keys and file formats. Evolution imports accept only Evolution v1 saves; they do not accept saves from the legacy prototype.

## Ad placements

The first visit requires accepting before entering the arcade. Acceptance is saved in this browser and reveals reserved static display slots above and below the match court. The AdSense loader is installed, but these placeholders are not configured AdSense display units, so ads will not render until display units are added. No video, interstitial, or gameplay-overlay ad formats are included. This preference dialog is not a certified consent-management platform.
