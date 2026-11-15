# Ping-Pong

A browser-based Pong arcade with a gradual tutorial, trajectory prediction challenges, local and AI matches, an AI management mode, and a small top-down world to explore.

## Run

Open `index.html` in a modern browser. The app uses plain HTML, CSS, and JavaScript; no build step or package install is required.

## Modes

- **Tutorial:** Six lessons covering paddle movement, returns, tilt, powerups, QTEs, and rally reading.
- **Pong Problems:** Read the frozen ball's direction from the on-court arrow, position your paddle, then test your prediction; practice WASD quicktime combos and drag-tracking bouncing returns.
- **Pong 1v1:** Play against an AI, share a keyboard, or watch two AIs play. Enabled powerups spawn as glowing orbs on the center line: claim fastball, double-paddle, or double-ball effects by hitting the orb; slowball is sent to your opponent to make their next shot easier to return.
- **Pong Evolution:** Watch your AI play full matches against a rival. Earn cash for its returns, points, and powerups, watch it tilt its paddle, then buy upgrades and incentives. Evolution exports use the `pong-evolution-save` v1 format.
- **Pong World:** Explore an infinite, procedurally generated world with WASD or the arrow keys. Structures may hide caches, directional puzzles, target training, timed trials, and rival matches. Dungeons share an exterior but vary inside: winding paths, guardian mazes, puzzles, treasure vaults, and rival gauntlets all lead to a boss. Boss QTEs can be stacked before the center line; each success speeds up the ball and animates your paddle teleport. The player paddle is larger, tilt lingers briefly after release, and regular QTEs trigger every other player return. Take on courier/scavenging/1v1 sparring contracts, and play one-on-one matches with powerups. Your location, crew, inventory, and progress are saved separately.

Evolution and World progress use different local-storage keys and file formats. Evolution imports accept only Evolution v1 saves; they do not accept saves from the legacy prototype.

## Ad placements

The first visit requires accepting before entering the arcade. Acceptance is saved in this browser and reveals reserved static display slots above and below the match court. This preview does not load AdSense or serve ads. Connect configured AdSense display units before deployment; no video, interstitial, or gameplay-overlay ad formats are included. This preference dialog is not a certified consent-management platform.
