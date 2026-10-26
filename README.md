# lock21.info

The site of a project to digitize Lock 21 in 3D (Dickinson's Landing, St. Lawrence): the field notebook and the 3D
model of an underwater photogrammetry survey by Christian Rémillard. Site: <https://lock21.info>, in public beta
(1.0.0-beta.1), in French and English.

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
