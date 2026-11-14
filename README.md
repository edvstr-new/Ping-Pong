# Ping-Pong

A browser-based Pong arcade with a gradual tutorial, trajectory prediction challenges, local and AI matches, an AI management mode, and a small top-down world to explore.

## Run

Open `index.html` in a modern browser. The app uses plain HTML, CSS, and JavaScript; no build step or package install is required.

## Modes

- **Tutorial:** Six lessons covering paddle movement, returns, tilt, powerups, QTEs, and rally reading.
- **Pong Problems:** Predict the ball's landing point and track your accuracy.
- **Pong 1v1:** Play against an AI, share a keyboard, or watch two AIs play.
- **Pong Evolution:** Watch your AI play full matches against a rival, then use its earnings to buy upgrades and incentives. Evolution exports use the `pong-evolution-save` v1 format.
- **Pong World:** Explore an infinite, procedurally generated world with WASD or the arrow keys. Find structures, job boards, randomized loot, recruitable AI teammates, and open doubles courts. Interact with nearby sites using E, take on courier/scavenging/sparring contracts, and play 2v2 matches. Your location, crew, inventory, and progress are saved separately.

Evolution and World progress use different local-storage keys and file formats. Evolution imports accept only Evolution v1 saves; they do not accept saves from the legacy prototype.

## Ad placements

The first visit requires accepting before entering the arcade. Acceptance is saved in this browser and reveals reserved static display slots above and below the match court. This preview does not load AdSense or serve ads. Connect configured AdSense display units before deployment; no video, interstitial, or gameplay-overlay ad formats are included. This preference dialog is not a certified consent-management platform.
