Original prompt: sure lets make it a2D game with a little hitachi excivator digging up dirt going down farther into the earth finding diffrent types of ore and gaining money from the ore

## 2026-03-22
- Created progress tracking file.
- Plan:
  - Add a new standalone game page under `Excavator-Game/index.html`.
  - Build deterministic canvas game loop with `window.advanceTime(ms)` and `window.render_game_to_text()`.
  - Include mobile controls and a simple upgrades panel.
  - Run a quick local test/screenshot pass.
- Implemented `Excavator-Game/index.html`:
  - Randomized ore world by depth with value payouts.
  - Excavator movement/digging loop, fuel system, rescue, and upgrades.
  - HUD for money/fuel/depth/best ore.
  - Touch controls for mobile.
  - Added `window.advanceTime(ms)` and `window.render_game_to_text()`.
- Fixed rendering details:
  - Sky now draws once per frame.
  - Particle color alpha uses a proper hex-to-rgba conversion.
- Added integration:
  - Added `Excavator Game` entry to shared page search data.
  - Added redirect helper page `hitachi-excavator-game.html`.
- Testing note:
  - Playwright client script could not be run because `node` is not available in this environment.
