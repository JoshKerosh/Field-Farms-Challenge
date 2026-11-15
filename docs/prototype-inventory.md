# v10 prototype inventory

Reference: `references/prototype-v10.html`. SHA-256: `87f1d943348b9e8f9c5874d0efb170551f02e3578e1a6bb1ec21b5ca3ba9b92a`.

| Original screen | Owner and split                                  | First delivery                                |
| --------------- | ------------------------------------------------ | --------------------------------------------- |
| Location        | Farms and Watersheds context                     | Preloaded example farm.                       |
| Watershed       | Watersheds, Water, Restoration and Organizations | Local diagram and fictional sources.          |
| Satellite       | Environment                                      | Sources to integrate.                         |
| Farm            | Farms                                            | Example profile, editing pending.             |
| ABC             | Guide page                                       | Working entry point and navigation.           |
| Actions         | Restoration; pastures in Farms                   | Example actions; recommendations pending.     |
| Records         | Water, Restoration, Alerts and Organizations     | Example series and views, no saving.          |
| Alerts          | Alerts                                           | Scenario without real alerts.                 |
| Assistant       | Assistant; voice in Platform                     | Predefined questions and optional read-aloud. |
| Plan            | Future planting plan                             | Out of this stage.                            |
| Weather         | Environment                                      | Grouped with Satellite, no current data.      |
| Neighbors       | Organizations and future scenarios               | Out of this stage.                            |
| Sources         | Composition page                                 | Available.                                    |

Benefits is added by team decision: demonstrable savings and support opportunities. Navigation keeps the six v10 sections. No folder per role is created, nor a "record" entity that duplicates every domain.

## Findings

- `Component` mixes bundled data, navigation, calculations, maps and presentation.
- `localStorage` stores farm, actions and records; it does not demonstrate remote collaboration.
- Sharing with the network and the institutional dashboards have simulated elements. The WhatsApp links prepare text; they are not an integrated institutional channel.
- The assistant picks answers by questions and keywords; it does not use AI. The voice uses `speechSynthesis`.
- There is data declared as real, estimates, examples and illustrative layers. This migration does not validate their methodologies.
- Income scores are not proven monetary savings.
- The link to a separate English page is not included in the exported HTML. The base keeps text centralized and avoids a broken link.

The HTML is kept outside the public resources, without changing its runtime, data or licenses. Full features will be added with contracts, permissions and technical validation.
