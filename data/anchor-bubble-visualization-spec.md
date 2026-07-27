# Anchor–Bubble Thread Network — Build Spec

## 1. Concept summary

A network visualization with two anchor rails and a set of woven "cell" bubbles between them:

- **Left rail**: a vertical list of **Anchor Nodes** (skills/topics/tags — small dots with text labels).
- **Right field**: a cluster of **Bubble Nodes** (categories) rendered as large circles of varying radius, positioned so they touch/overlap slightly like packed cells.
- **Threads**: many thin curved lines run from each Anchor to every Bubble it's connected to. Threads bend to hug the bubble's edge rather than cutting straight through the center, so density of threads reads as the "wall" of the cell.
- **Interaction**: hovering or clicking a Bubble (or an Anchor) highlights only the threads touching it, dims everything else, and grows the radius of the connected Anchor dot(s) and the selected Bubble with a smooth eased animation.
- **Aesthetic**: near-black background, warm amber/orange glow (`#ff8c32`-ish), additive/glow blending so overlapping threads brighten, thin monospace HUD-style labels, faint percentage + coordinate readouts near nodes.

This spec is written so it can be implemented as a **single self-contained HTML file using Three.js**, matching the style of the reference build (image 2) but keeping the denser, more organic woven-thread look of the original inspiration (image 1).

## 2. File structure

Deliver as one file: `anchor-bubble-network.html`

- No build step. Load Three.js from a CDN (`three@0.128`-ish or latest r1xx, same major version pinned).
- Use an `<svg>` overlay OR Three.js `Line2`/`CatmullRomCurve3` meshes for the threads — prefer Three.js so glow/additive blending is GPU-driven and can scale to hundreds of threads at 60fps.
- Render bubbles as circle meshes (`RingGeometry` for outline + soft `CircleGeometry` fill with low opacity), anchors as small filled circles + HTML/Canvas labels (use CSS-positioned `<div>` labels synced to projected 3D coordinates, or `troika-three-text` / canvas sprites if avoiding DOM sync).

## 3. Data model

Define this as a plain JS object at the top of the file so content is trivial to edit later:

```js
const data = {
  person: { name: "LAKSHMI NARAYANAN", role: "AI-APPLIED ARCHITECT" },

  anchors: [
    { id: "python",        label: "PYTHON" },
    { id: "rhino",         label: "RHINO / GRASSHOPPER" },
    { id: "qgis",          label: "QGIS / ARCGIS" },
    { id: "gee",           label: "GOOGLE EARTH ENGINE" },
    { id: "n8n",           label: "N8N / RAG AGENTS" },
    { id: "threejs_d3",    label: "THREE.JS / D3.JS" },
    { id: "pandas",        label: "PANDAS / SCIKIT-LEARN" }
  ],

  bubbles: [
    { id: "data",        label: "DATA",        pct: 82, coord: "339,198" },
    { id: "gis",         label: "GIS",         pct: 83, coord: "167,137" },
    { id: "aiml",        label: "AI/ML",       pct: 78, coord: "322,-24" },
    { id: "cloud",       label: "CLOUD",       pct: 55, coord: "11,87" },
    { id: "programming", label: "PROGRAMMING", pct: 40, coord: "111,-24" },
    { id: "design",      label: "DESIGN",      pct: 94, coord: "160,-217" },
    { id: "web",         label: "WEB",         pct: 53, coord: "368,-241" }
  ],

  // many-to-many: which anchors feed which bubbles, with an optional weight
  // (weight controls how many sub-threads are drawn + how thick the bundle looks)
  links: [
    { anchor: "python",     bubble: "aiml",        weight: 3 },
    { anchor: "python",     bubble: "programming", weight: 3 },
    { anchor: "python",     bubble: "data",        weight: 2 },
    { anchor: "rhino",      bubble: "design",      weight: 3 },
    { anchor: "qgis",       bubble: "gis",         weight: 3 },
    { anchor: "gee",        bubble: "gis",         weight: 2 },
    { anchor: "gee",        bubble: "cloud",       weight: 1 },
    { anchor: "n8n",        bubble: "aiml",        weight: 2 },
    { anchor: "n8n",        bubble: "cloud",       weight: 1 },
    { anchor: "threejs_d3", bubble: "web",         weight: 3 },
    { anchor: "threejs_d3", bubble: "design",      weight: 1 },
    { anchor: "pandas",     bubble: "data",        weight: 3 },
    { anchor: "pandas",     bubble: "aiml",        weight: 2 }
  ]
};
```

`weight` = number of parallel sub-threads drawn per link (see §5).

## 4. Layout

1. **Anchors**: distribute evenly down the left ~15% of the viewport, vertically centered. Store `{x, y}` per anchor.
2. **Bubbles**: use a simple **force-directed / circle-packing pass** run once on load (not every frame) to place bubbles in the right ~55–75% of the viewport so they nestle together without overlapping their fill (slight edge-touching is fine, matches reference):
   - Give each bubble a `radius` driven by `pct` (bigger % → bigger bubble), e.g. `radius = 40 + pct * 0.9`.
   - Run a small number of relaxation iterations (push apart any pair of bubbles whose centers are closer than `r1 + r2 + padding`) to settle positions — this is the same idea as D3's `d3.forceSimulation` with `forceCollide`, but you can hand-roll it in ~20 lines with no dependency.
3. Keep both layouts in normalized space, then scale to actual canvas size on resize.

## 5. Thread rendering ("woven" look)

For each `link`:

1. Compute the anchor's `(x,y)` and the bubble's center `(cx,cy)` + `radius`.
2. Pick a point on the bubble's circumference as the thread's **target/end point**, biased toward the side facing the anchor, with the exact angle jittered per sub-thread so multiple threads land at slightly different points around the edge (this is what creates the "wrapping the cell wall" density).
3. For each of `weight` sub-threads:
   - Build a **cubic Bézier** (or `THREE.CatmullRomCurve3` through 4 control points) from anchor → two control points pulled toward/along the bubble's tangent → end point on the circumference.
   - Randomize control-point offsets slightly (±5–15px) per sub-thread and per bubble so the bundle looks organic rather than a fan of identical curves.
   - Sample ~40–60 points along the curve and feed to a `THREE.Line` (or `Line2` for thickness control) with:
     - color: warm amber, e.g. `0xff7a2e`
     - opacity: low, `0.08–0.18`
     - blending: `THREE.AdditiveBlending`
     - `depthWrite: false`
4. Store each thread mesh with references to its `anchorId` and `bubbleId` so it can be looked up during interaction.

This additive low-opacity stacking is what makes crossing threads brighten where they overlap — do not skip the additive blending step, it's the core of the visual.

## 6. Bubble + anchor rendering

- **Bubble**: a filled `CircleGeometry` at ~4–6% opacity of the same amber, plus a `RingGeometry` stroke outline at ~25–35% opacity. Label (`NAME`, small caps) centered, with `pct%` and `coord` in a smaller monospace line beneath, matching the reference HUD style.
- **Anchor**: a small filled circle (`CircleGeometry`, radius ~4–6px) in solid amber/orange, with the label text to its right in a light, wide-letter-spaced sans or monospace font.

## 7. Interaction & state

```js
state = {
  hoveredBubbleId: null,
  hoveredAnchorId: null,
  selectedBubbleId: null,   // click "locks" selection; hover previews
}
```

Behavior:

1. **Raycast** on pointer move against bubble hit-areas (invisible slightly-larger circle meshes for easier hovering) and anchor hit-areas.
2. On hover/select of a **Bubble**:
   - Find all `links` where `bubble === id` → collect connected `anchorIds`.
   - Animate (lerp/eased, ~250–400ms) each connected anchor's render radius from `baseRadius` → `baseRadius * 1.6`.
   - Animate the selected bubble's radius up slightly (`* 1.08`) and its outline opacity up.
   - Set connected threads' opacity → `0.6–0.9` and unconnected threads' opacity → `0.02–0.04` (dim, don't hide, to preserve context).
3. On hover/select of an **Anchor**: same logic mirrored — highlight its bubbles and grow their outline, and grow the anchor dot itself.
4. On pointer leave / deselect: lerp everything back to base state.
5. Use `requestAnimationFrame` with a simple `lerp(current, target, 0.15)` per animated property (radius, opacity) — do not snap instantly; this easing is what was called out explicitly in the concept notes.
6. Optional: click toggles a "locked" selection (stays highlighted without hover) vs. hover which previews — mirror the reference's "hover/click a bubble to trace its connections" hint text in a bottom-right HUD label.

## 8. Visual/style tokens

```
background:      #0a0704 (near-black, faint warm tint)
thread color:     #ff7a2e  (additive, low opacity per-thread)
bubble fill:      #ff7a2e  @ ~5% opacity
bubble stroke:    #ff7a2e  @ ~30% opacity (idle) → ~60% (active)
anchor dot:       #ffb066  solid
text (primary):   #f5ece2, uppercase, wide letter-spacing, sans (e.g. "Space Mono" / "IBM Plex Mono")
text (secondary):  same hue at 40–50% opacity, smaller size, for pct/coord/HUD readouts
```

Include a top-left name/role label block and a bottom-right hint label ("HOVER / CLICK A BUBBLE TO TRACE ITS CONNECTIONS") as static HTML/CSS overlays, not part of the WebGL canvas — simpler to style and keeps text crisp at any zoom.

## 9. Performance notes

- Total thread count = `sum(weight)` across links (~20–40 in the sample data). Each thread is a static line geometry; only opacity/color uniforms change per frame during interaction, not geometry — keep it cheap.
- Precompute all curve point arrays once at load (after bubble layout settles), not per frame.
- Use a single `BufferGeometry` per thread (or merge into a few `LineSegments` batches grouped by anchor/bubble pair if you need to scale past a few hundred threads) and drive highlight state via a per-thread attribute (e.g. vertex color alpha) rather than toggling material objects, if you want to push into the thousands-of-threads territory later.

## 10. Deliverable checklist for Claude Code

- [ ] Single `anchor-bubble-network.html`, Three.js via CDN, no build tooling required.
- [ ] Data object at top of file, easy to swap anchors/bubbles/links.
- [ ] One-time layout pass: anchors in a left column, bubbles packed via simple collision-relaxation on the right.
- [ ] Threads as additive-blended Bézier/Catmull-Rom curves, multiple jittered sub-threads per link, ends landing on bubble circumference (not center).
- [ ] Hover + click interaction on both bubbles and anchors: connected anchor radius grows, connected threads brighten, unconnected threads dim (not hidden), all transitions eased over ~300ms.
- [ ] HUD-style overlay text (name/role top-left, hint bottom-right, pct/coord under each bubble label) as DOM/CSS, not canvas-drawn.
- [ ] Responsive to window resize.
- [ ] Dark amber-on-near-black color palette per §8.
