# Trend Banlist

**Last updated:** 2026-05-29
**Authority:** [`docs/TERMS_OF_SERVICE.md`](./TERMS_OF_SERVICE.md) §4 (style references + takedown protocol).
**Enforcement:** Manual pre-approval gate at trend creation. Automated CI check is TODO (see "Enforcement" below).

This file is the canonical list of franchise names, studio names, character names, and identifiable personalities that **must not** appear in `trends.prompt_template`, `trends.title`, `trends.share_caption_template`, or any user-facing trend copy. The list grows in response to takedown requests, legal counsel guidance, and operator judgment.

The list is not exhaustive — a name's absence does not mean it is safe. When in doubt, default to generic phrasing. The acceptable-phrasing rules below cover the common patterns.

---

## Studios and production companies

These names are off-limits in any prompt template — even as "in the style of" qualifiers. They appear here either because (a) they have a documented history of pursuing AI-art derivative claims, (b) they hold registered trademarks on their name in entertainment / consumer goods, or (c) general operator caution given the size of their legal teams.

| Name                       | Added      | Notes                                                                                                    |
| -------------------------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| Disney                     | 2026-05-29 | Pre-emptive (operator caution). Disney's IP enforcement is the industry baseline; assume zero tolerance. |
| Pixar                      | 2026-05-29 | Subsidiary of Disney. Distinct visual style is heavily trademarked.                                      |
| Studio Ghibli              | 2026-05-29 | Public anti-AI stance by Hayao Miyazaki; high public sensitivity.                                        |
| DreamWorks Animation       | 2026-05-29 | Subsidiary of NBCUniversal.                                                                              |
| Marvel                     | 2026-05-29 | Disney subsidiary. Character likenesses and trade dress aggressively defended.                           |
| Lucasfilm                  | 2026-05-29 | Disney subsidiary. Star Wars trade dress.                                                                |
| Warner Bros.               | 2026-05-29 | DC characters + LOTR + Harry Potter under same parent.                                                   |
| Nintendo                   | 2026-05-29 | Most aggressive IP enforcer in gaming. Mario / Zelda / Pokemon (with TPC).                               |
| Bandai Namco               | 2026-05-29 | Tekken, Pac-Man, Gundam.                                                                                 |
| Sega                       | 2026-05-29 | Sonic, Yakuza.                                                                                           |
| Sony Pictures Animation    | 2026-05-29 | Spider-Verse aesthetic claims.                                                                           |
| Illumination Entertainment | 2026-05-29 | Minions / Despicable Me.                                                                                 |
| HBO                        | 2026-05-29 | Game of Thrones, etc. Trade dress.                                                                       |
| Netflix Animation          | 2026-05-29 | Originals are aggressively defended.                                                                     |
| Aardman Animations         | 2026-05-29 | Wallace & Gromit. Distinctive claymation style.                                                          |

---

## Specific franchise titles

Title-level bans. Some overlap with the studio bans above; this list catches the case where a prompt avoids the studio name but uses the franchise name.

| Title                                     | Studio                | Added      |
| ----------------------------------------- | --------------------- | ---------- |
| Frozen                                    | Disney                | 2026-05-29 |
| Toy Story                                 | Disney/Pixar          | 2026-05-29 |
| The Incredibles                           | Disney/Pixar          | 2026-05-29 |
| Star Wars                                 | Lucasfilm             | 2026-05-29 |
| Indiana Jones                             | Lucasfilm             | 2026-05-29 |
| Avengers                                  | Marvel                | 2026-05-29 |
| Spider-Man                                | Marvel/Sony           | 2026-05-29 |
| X-Men                                     | Marvel                | 2026-05-29 |
| Harry Potter                              | Warner Bros.          | 2026-05-29 |
| The Lord of the Rings                     | Warner Bros.          | 2026-05-29 |
| DC (Batman, Superman, Wonder Woman, etc.) | Warner Bros.          | 2026-05-29 |
| Pokémon                                   | Nintendo/TPC          | 2026-05-29 |
| Mario                                     | Nintendo              | 2026-05-29 |
| Zelda                                     | Nintendo              | 2026-05-29 |
| Sonic                                     | Sega                  | 2026-05-29 |
| Mickey Mouse                              | Disney                | 2026-05-29 |
| Naruto                                    | Shueisha / Pierrot    | 2026-05-29 |
| Dragon Ball                               | Shueisha / Toei       | 2026-05-29 |
| One Piece                                 | Shueisha / Toei       | 2026-05-29 |
| Demon Slayer                              | Shueisha / Ufotable   | 2026-05-29 |
| Attack on Titan                           | Kodansha / MAPPA      | 2026-05-29 |
| My Hero Academia                          | Shueisha / Bones      | 2026-05-29 |
| Spirited Away                             | Studio Ghibli         | 2026-05-29 |
| My Neighbor Totoro                        | Studio Ghibli         | 2026-05-29 |
| Stranger Things                           | Netflix               | 2026-05-29 |
| The Simpsons                              | Disney (20th TV)      | 2026-05-29 |
| Family Guy                                | Disney (20th TV)      | 2026-05-29 |
| SpongeBob SquarePants                     | Paramount/Nickelodeon | 2026-05-29 |

---

## Celebrity likenesses (Right of Publicity)

Right of Publicity is a state-law right in the US (California is the most aggressive jurisdiction; see Cal. Civ. Code §3344) and a personality right in much of the EU and UK. It is **separate from copyright** and applies to a person's name, image, likeness, signature, and voice. AI image generation that produces a recognizable likeness of a specific person without consent is high-risk regardless of whether any copyrighted material is involved.

**Policy:** style-of allowed, identity-of forbidden.

- "in the style of a courtroom sketch artist" — fine.
- "in the style of Taylor Swift's Eras Tour aesthetic" — not fine (uses a name).
- "draw <user> as a famous pop star" — borderline; if the prompt anchors on a specific artist's stage design, it's identity-of.
- "draw <user> as Taylor Swift" — explicitly forbidden.

A non-exhaustive starter list of names that must never appear in prompts. The list is selective — these are the public figures with active enforcement records or representation by aggressive PR/legal teams. Other celebrities are not implicitly safe; they're just less likely to discover the use early.

| Name                                                                          | Category             | Added      |
| ----------------------------------------------------------------------------- | -------------------- | ---------- |
| Taylor Swift                                                                  | Music                | 2026-05-29 |
| Beyoncé                                                                       | Music                | 2026-05-29 |
| Drake                                                                         | Music                | 2026-05-29 |
| Kanye West / Ye                                                               | Music                | 2026-05-29 |
| Rihanna                                                                       | Music                | 2026-05-29 |
| Elon Musk                                                                     | Tech / public figure | 2026-05-29 |
| Mark Zuckerberg                                                               | Tech / public figure | 2026-05-29 |
| Donald Trump                                                                  | Politics             | 2026-05-29 |
| Barack Obama                                                                  | Politics             | 2026-05-29 |
| Kamala Harris                                                                 | Politics             | 2026-05-29 |
| Joe Biden                                                                     | Politics             | 2026-05-29 |
| The British royal family (Kate Middleton, Prince William, King Charles, etc.) | Public figures       | 2026-05-29 |
| LeBron James                                                                  | Sports               | 2026-05-29 |
| Cristiano Ronaldo                                                             | Sports               | 2026-05-29 |
| Lionel Messi                                                                  | Sports               | 2026-05-29 |
| Tom Cruise                                                                    | Film                 | 2026-05-29 |
| Scarlett Johansson                                                            | Film                 | 2026-05-29 |
| Keanu Reeves                                                                  | Film                 | 2026-05-29 |
| Ariana Grande                                                                 | Music                | 2026-05-29 |
| Billie Eilish                                                                 | Music                | 2026-05-29 |

**Deceased celebrities** also retain Right of Publicity in many jurisdictions (California: 70 years post-mortem). Marilyn Monroe, Elvis Presley, Michael Jackson, etc. are owned by estates that license aggressively. Treat them as identity-of forbidden.

---

## Logos, character names, and trade dress to never embed

These appear in prompts as the literal noun being drawn. Always rewrite as a generic descriptor.

| Forbidden             | Replacement                                                                  |
| --------------------- | ---------------------------------------------------------------------------- |
| "draw Spider-Man"     | "a generic masked superhero in a red-and-blue suit with web-pattern accents" |
| "draw Batman"         | "a generic caped vigilante in a dark cowl with a utility belt"               |
| "draw Mickey Mouse"   | "a generic anthropomorphic cartoon mouse with circular black ears"           |
| "draw Mario"          | "a generic mustached plumber in a red cap and blue overalls"                 |
| "draw a Pokémon"      | "a generic cartoon creature with large expressive eyes"                      |
| "Coca-Cola can"       | "a generic red soda can"                                                     |
| "Apple logo / iPhone" | "a generic modern smartphone"                                                |
| "Nike swoosh"         | "a generic athletic apparel mark"                                            |
| "Lego brick"          | "a generic plastic interlocking brick"                                       |

The replacement should evoke without identifying. If a user submits a photo wearing branded clothing, that's the user's choice — but the prompt template must not direct the model to render the brand.

---

## Acceptable phrasing rules

The most common operator mistake is "style-of" phrasing that still names the source. The rule of thumb: **describe the aesthetic, not the source.**

### Disallowed — names the source

- "Ghibli-style" / "in the style of Studio Ghibli"
- "Pixar-style 3D character"
- "Tim Burton aesthetic" (named director)
- "Wes Anderson palette" (named director)
- "Banksy-style stencil" (named living artist)
- "Stranger Things poster" (named franchise)

### Acceptable — describes the aesthetic

- "soft hand-drawn 1990s animation aesthetic with pastel skies and dreamy lighting" (instead of "Ghibli")
- "modern 3D-rendered character with large expressive eyes, soft lighting, and a Saturday-morning-cartoon palette" (instead of "Pixar")
- "gothic stop-motion aesthetic with elongated proportions and a muted Halloween palette" (instead of "Tim Burton")
- "symmetrical wide-angle composition with a pastel mid-century color palette" (instead of "Wes Anderson")
- "1980s synthwave horror poster — neon grid, fog, oversized title typography" (instead of "Stranger Things")
- "generic action figure in retail blister-pack packaging on a peg-hook display" (the "action figure in the box" trend — acceptable because no franchise is named)
- "anime-style portrait" (acceptable — "anime" is a medium, not a brand)
- "watercolor children's-book illustration in the tradition of mid-20th-century European storybook art" (acceptable — describes a tradition, not a creator)

### Edge cases

- **"Anime" / "manga" / "comic-book style"** — acceptable. These are media, not brands. Avoid pairing with a specific franchise name.
- **"Photorealistic"** / "oil painting" / "watercolor" — acceptable. Media descriptors.
- **"Renaissance painting"** / "ukiyo-e woodblock" / "Art Deco" — acceptable. Period / movement descriptors.
- **"In the style of Van Gogh / Monet / Hokusai"** — acceptable if the artist is public domain (deceased > 70 years and pre-1928 works generally). Living artists or recent estates: not acceptable.
- **"Saturday-morning cartoon"** / "1990s direct-to-VHS animation" — acceptable. Era / medium descriptors.

When the right substitution is not obvious, default to (a) era, (b) medium, (c) palette, (d) composition. Stacking these descriptors usually gets you 80% of the aesthetic without invoking a name.

---

## Enforcement

### Manual pre-approval (active)

Every trend created via `/admin/trends/new` (or edited via `/admin/trends/[id]/edit`) must be reviewed against this banlist before flipping `is_active = true`. The eval gate constraint in migration `supabase/migrations/20260527000002_trends.sql`:

```sql
alter table public.trends
  add constraint trends_eval_gate
  check (is_active = false or eval_status = 'passed');
```

…enforces that you actually run the eval at `/admin/trends/[id]/eval`. The eval workflow is the human checkpoint where banlist review happens — when you run the eval grid and visually inspect outputs, you should also check the prompt text for banlisted names.

The `bump_trend_version` trigger (same migration) flips `eval_status` back to `'untested'` and `is_active` to `false` on any prompt edit. So even if a trend is live, an edit that introduces a banlisted name forces it back through the eval gate before going live again.

### Automated (TODO — W7+)

A CI-time check that greps `trends.prompt_template`, `trends.title`, and `trends.share_caption_template` against this banlist. Failure aborts the deploy.

```ts
// TODO: automate in W7+
// scripts/check-trend-banlist.ts
// - Read banlist names from this markdown file (parse the tables)
// - Query Supabase: select id, slug, title, prompt_template, share_caption_template from trends where is_active = true
// - For each trend: fail CI if any banlist token appears case-insensitively
// - Exception list: nothing (banlist is exhaustive — to allow a name, remove it from the banlist with PR rationale)
```

The automation is a defense-in-depth layer. The primary enforcement is the human eval at trend creation time. If you find yourself adding many trends, automation becomes load-bearing.

---

## Process for adding to this list

1. Open a PR that edits this file.
2. PR description must include:
   - The incident or rights-holder request that prompted the addition (link to the takedown case file in `docs/takedowns/` if applicable).
   - The category the name belongs to (studio / franchise / celebrity / logo).
3. Add the row to the appropriate table with the current date.
4. If any active trend uses the now-banlisted name, follow the [`docs/sops/takedown.md`](./sops/takedown.md) Step 3b workflow (deactivate + re-prompt) **before** merging the banlist update — so the catalog is clean when the policy goes live.
5. Merge.

Removing a name from this list is also a PR — generally only justified by a written license from the rights holder, or by reclassification (e.g., a celebrity who has explicitly opted in to AI likeness use).

---

## Cross-references

- [`docs/TERMS_OF_SERVICE.md`](./TERMS_OF_SERVICE.md) §4 — the public commitment this list operationalizes.
- [`docs/sops/takedown.md`](./sops/takedown.md) — the workflow that adds to this list.
- Migration `supabase/migrations/20260527000002_trends.sql` — the eval gate constraint that enforces re-review on prompt edits.
- `app/admin/trends/[id]/eval/page.tsx` — the eval UI where banlist review happens manually.
