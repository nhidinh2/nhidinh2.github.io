# Nhi's Portfolio

A recruiter-friendly profile paired with an optional, colorful Three.js portfolio town inspired by classic Roblox.

## Routes

- `/` - concise player profile with a universe preview, resume, research, project, and contact links
- `/universe/` - a connected low-poly town with Nhi's House, Library, Project Garage, Research Lab, quests, NhiCoins, XP, badges, and mobile controls

## Files

- `index.html` - default player-profile homepage
- `css/profile.css` - responsive classic Roblox-inspired homepage design
- `js/profile.js` - renders the profile and four-location preview from shared content
- `js/content.js` - shared portfolio content used by both experiences
- `assets/Nhi-Dinh-Resume.pdf` - downloadable resume
- `universe/index.html` - 3D universe page and HUD
- `universe/css/style.css` - universe visuals and controls
- `universe/js/game.js` - procedural town, interiors, proximity interactions, physics, quests, badges, XP, coins, and the hypergraph puzzle

## Run locally

Serve the project root so both routes and relative assets behave like production:

```sh
python3 -m http.server 8000
```

Then open:

- Profile: http://localhost:8000/
- Universe: http://localhost:8000/universe/

The 3D universe loads Three.js and fonts from CDNs, so it needs an internet connection. The profile itself is framework-free and uses no external JavaScript.

## Updating content

Edit `js/content.js` to update both experiences in one place. The professional entries reflect the included resume and linked publication records. Library shelves use the `library` array; leave a shelf's `notes` empty until a real note or file is available. Personal fields that were placeholders remain clearly marked in the data and are never presented as facts.
