---
name: natural-writing
description: |
  Write or edit prose so it reads like Christian, not a chatbot, in French or English: the site's pages, the
  interface's texts (messages/), README and docs/ guides, CHANGELOG and TODO entries. Use when drafting or reviewing
  any text a person will read: contrasts staged as "not X but Y", one-line closers, run-ups, forced triads, dashes,
  inflated or sales language, stock AI words, bold labels, chat leftovers.
license: MIT
metadata:
  version: "1.0.0"
  source: "Cherry-picked and adapted from blader/humanizer 3.1.0 (MIT, github.com/blader/humanizer, commit 8c307f3) and Wikipedia's « Signs of AI writing » (WikiProject AI Cleanup); see LICENSE.txt"
---

# Natural writing

Write so the text sounds like its author, not like a language model. Keep what it says. Never add a fact, a number,
a name or a date that is not in the source or the conversation; when a sentence needs a detail you don't have, ask or
write a simpler sentence.

## Why AI text sounds the way it does

A model picks the choice that suits the widest range of readers. A person writes for one reader and one subject, so
their choices are uneven and specific. Every pattern below is a default choice: a sentence that signals importance
instead of adding a fact, a rhythm applied by rule, an ordinary fact dressed up, formatting on every item, leftovers
from a chat. Two rules follow: **every sentence must add something the reader doesn't have yet**, and **a tell counts
in proportion to how rarely a careful writer would make it on purpose** (patterns 1–5 justify an edit on one sighting;
the ones marked *weak alone* need company).

## The voice of this project

- **French first.** The site's pages are French, informal, first person, field notes (« J'ai plongé… », « on a
  constaté »); English pages are translations in the same plain voice. Docs and code comments are plain and neutral.
- **Concrete over general.** Depths in feet with metres in parentheses, dates, zone numbers, the gear's names, what
  went wrong. Specific, even odd details are the voice: keep them.
- **Keep the site's marks**: “curly quotes” in English pages, the apostrophe the page already uses, `→` on links that
  lead on (design brief). Don't straighten quotes or remove these arrows. French typography: below.
- Short is better: Christian often asks for shorter texts. Cut before you add.

## French: typography and terms

The reference is the Office québécois de la langue française's
[Banque de dépannage linguistique](https://vitrinelinguistique.oqlf.gouv.qc.ca/banque-de-depannage-linguistique)
(the site is Canadian: numbers and dates in `fr-CA`). Look a question up there rather than guessing.

**Spaces (Christian, 2026-10-26: the standard non-breaking spaces).** In French text, never a line break between a
mark and the word it belongs to:

| Where | Space | Character | Example |
| --- | --- | --- | --- |
| before « : » | non-breaking space | U+00A0 | `Erreur : la connexion…` |
| inside « » | non-breaking spaces | U+00A0 | `« Modèle 3D »` |
| before « ; », « ? », « ! » | narrow non-breaking space | U+202F | `Et la visibilité ?` |
| between a number and its unit, in thousands | non-breaking space | U+00A0 | `60 pi`, `18,3 m`, `16 384` |
| after « : », « ; », « ? », « ! », « » » | an ordinary space | | |

Not in code, paths, addresses, times (`10:30`), ratios (`4:3`, `1:100`) or key names. In Markdown and JSON, type the
characters themselves, not `&nbsp;`. English text keeps no space before these marks.

**Numbers.** Decimal comma (`18,3 m`), thousands with a non-breaking space (`16 384`), the unit after a non-breaking
space (`35 pi/min`); feet first with metres in parentheses where the page already does so.

**Terms.** One word per thing, the same on every page and in the interface (Christian, 2026-10-26):

| Thing | Use | Notes |
| --- | --- | --- |
| the processing steps (sidebar « Workflow ») | « le traitement » (English: “Processing”) | « workflow » only for Metashape's own *Batch Process* workflows (`config/workflows/*.xml`) |
| dense cloud | « nuage de points dense » | Metashape's French interface; « dense cloud » in parentheses on first use if useful |
| chunk | *chunk*, in italics | Metashape's own term; explained on first use (« un *chunk*, un bloc de photos traité à part ») |
| rig | « rig » | the camera frame; « le rig (support de caméras) » on first use |
| frames extracted from the video | « images » | « frames » only in file names |
| zone | « zone », with its number (« la zone 12 ») | as on the zone map |
| the lock's chamber | « le canal » (« le canal de l'écluse » the first time on a page that also names the canal de Cornwall); English “the lock” (Christian: the local word, not “chamber”) | the word used locally, in French and English (Christian, 2026-10-26); « sas » not used; « canal de Cornwall » for the whole canal |
| depth | « profondeur », in feet (« 60 pi ») with metres | « pi » not « ft » in French |

## How to work

1. **Mark the tells.** Read the whole text, mark each pattern, strongest first; look at paragraph shape too (the same
   closer after every section, three parallel examples).
2. **Rewrite.** State each point plainly instead of patching flagged words one by one. Keep every supported claim;
   you may cut dull parts, merge or split paragraphs.
3. **Check.** Read it aloud. Did the rewrite add or drop a fact, a number, a name? Search again for the tells that
   survive a rewrite most: not-X-but-Y, closers, triads, dashes, bold labels.
4. When editing a file, change prose only: code, paths, commands, link targets, frontmatter and data stay as they are.

## A. Staging instead of stating (act on one sighting)

**1. Not X but Y.** "It's not just X, it's Y", "not only… but", "X rather than Y", the contrast split over two
sentences, a clipped tail (", no guessing"). French: « Il ne s'agit pas de X, mais de Y », « Ce n'est pas X, c'est
Y », « non pas X, mais Y », « plus qu'un X, un Y ». The negative half names something no one claimed. State the point;
keep a contrast only when it corrects a belief the reader really holds.
> Avant: Ce n'est pas qu'un modèle 3D, c'est une mémoire du site.
> Après: Le modèle garde la forme de l'écluse telle qu'elle est aujourd'hui, mur par mur.

**2. One-line closers and dramatic fragments.** A last sentence that repeats the paragraph (« Et c'est là tout
l'intérêt. », "That's the real win."), a sentence naming what an example showed, a row of fragments (« Pas de
lumière. Pas de visibilité. Pas de repère. »). Cut the closer; merge fragments into one sentence with a claim.

**3. Sayings that sound deep.** « au fond », « en réalité », « la vraie question est », « le cœur du sujet », "at its
core", "X is the language of Y". Replace with the specific claim.

**4. Run-ups.** « Plongeons dans… », « Voyons maintenant… », « Voici ce qu'il faut savoir », « Petite note: »,
"Let's dive in", "Here's the thing", "Honestly?". Remove the run-up and make the point.

**5. Arguing with no one.** « Soyons clairs », « Je ne dis pas que… », « On pourrait être tenté de… », "To be clear",
"You might think…": an objection or an option nobody raised. Remove it; keep an option a reader would really weigh.

## B. Rhythm by rule

**6. Forced triads.** Things in threes to sound complete (« précision, patience et persévérance »). Keep three only
when there are three; otherwise merge or develop one.

**7. Repeated openings.** Several sentences in a row starting the same way (« J'ai… J'ai… J'ai… »). Merge or vary,
unless the repetition is deliberate.

**8. Dashes everywhere.** No em dashes (—) or en dashes (–) as connectors in prose: use a period, a comma, a colon or
parentheses. Ranges (zones 1–25, 2024–2026) and code keep theirs. One dash is *weak alone*; a text full of them is
not.

**9. Stacked qualifiers.** « il se pourrait éventuellement que », "could potentially". Keep one hedge where the doubt
is real. *Weak alone.*

## C. Inflation

**10. Stock AI words**, tells wherever they appear, especially in groups. English: additionally, crucial, delve,
enhance, foster, garner, highlight (verb), intricate, key (adjective), landscape (abstract), meticulous, pivotal,
robust (figurative), seamless, showcase, testament, underscore, vibrant. French: crucial, essentiel, incontournable,
véritable, fascinant, passionnant, riche (figuré), « met en lumière », « souligne », « témoigne de », « s'inscrit
dans », « au cœur de », « un véritable voyage », « plonger au cœur de » (unless it's literally a dive).

**11. Inflated significance.** « marque un tournant », « joue un rôle clé », « un héritage durable », « l'avenir
s'annonce prometteur », "a pivotal moment", "the future looks bright". Keep the fact, drop the significance; end on
the last concrete fact.

**12. Sales language.** « niché au cœur de », « à couper le souffle », « incontournable », « une richesse
exceptionnelle », "nestled", "breathtaking", "must-see". Say what the thing is.

**13. Vague links and -ing riders.** « lié à », « en lien avec », "associated with": name the relationship.
"…, highlighting / reflecting / ensuring…", « …, témoignant de… », « …, soulignant… » bolted onto a fact: cut it
unless the source supports it.

**14. Avoiding « est » and « a ».** « sert de », « constitue », « se présente comme », « offre », « dispose de »,
"serves as", "boasts", "features": use est / a, is / has.

## D. Formatting by rule

**15. Bold as decoration.** Bold on every item, lists where each item has a bold label and a colon: remove the bold;
turn the list into a sentence when the labels add nothing. Keep bold that marks the one thing to notice.

**16. Decorative headings.** Title Case In English Headings (use sentence case), emojis, a heading written for effect
instead of naming its content, a heading repeated by the first sentence.

## E. Leftovers

**17. Chat residue.** « J'espère que cela vous aide », « N'hésitez pas à… », « Bien sûr ! », "Great question!",
"Let me know if…": remove the wrapper, keep the content.

**18. Writing about the text instead of its subject.** « Le tableau ci-dessous présente… », « Cette section explique… »,
"This page was generated from…": cut what the reader can already see. (Change logs and TODO entries may say what
changed: that is their subject.)

## When not to act

A person can make any of these choices on purpose. Leave a phrase alone in a quotation, a title, a proper name, or a
passage about the phrase itself. Keep the details that carry the author's voice: an unusual specific detail, mixed
feelings, a genuine aside in parentheses, a first-person choice he can explain. Several tells together, not one, are
the signal.
