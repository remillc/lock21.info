# lock21.info

Field notebook and 3D model of the submerged Lock 21 (Dickinson Landing, St. Lawrence): an underwater photogrammetry
project by Christian Rémillard. Site: <https://lock21.info> (not indexed yet).

- Site: [Astro](https://astro.build/) + [Starlight](https://starlight.astro.build/), French content in `src/content/docs/`
- 3D viewer: `viewer/` (three.js, 3D Tiles), served at `/modele`
- 3D publishing pipeline: `tools/publish-model/` (see its README, in French)

```sh
npm install
npm run dev            # http://localhost:4321/
npm run build:viewer   # viewer into public/modele
npm run build          # site into dist/
```

Agents and contributors: read `AGENTS.md` and `docs/guidelines.md` first.
