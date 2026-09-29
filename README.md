# Letter Duel

A word-tile board game against a computer opponent, built with React and Vite. Every word is checked against a public-domain dictionary and shown with its meaning.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # scoring, rules, move generation, reducer
npm run build      # static site in dist/
npm run preview    # serve the production build
```

Node 20 or newer is required.

## Features

- 15x15 board with the standard premium squares, 100-tile bag with two blanks, 50 point bonus for using all seven tiles.
- Drag tiles to reorder the rack, drop them on the board, move them between squares, or drag them back. Click-to-place also works. Drag uses pointer events, so it works with mouse and touch.
- Live check as you place tiles: every word formed is listed with its score and marked valid or invalid. Play is blocked until every word is in the dictionary.
- Meanings panel for your previewed word and for each word played.
- Swap, pass, shuffle, recall, end-of-game rack penalties, six-scoreless-turn ending.
- Computer opponent with Easy, Normal and Hard levels.

## The computer opponent

The opponent is a search program, not machine learning. It generates every legal move from its rack using an anchor-based trie search (Appel and Jacobson), scores each one with the same rules the player is held to, then picks by level: Hard plays the highest score, Normal picks from the top ten, Easy picks from the weaker end. Describe it as a computer opponent, not as AI.

## Project layout

```
public/
  enable1.txt            ENABLE word list (loaded once, built into a trie)
  defs/a.json ... z.json WordNet meanings, one file per first letter, loaded on demand
  wordnet-license.txt
src/
  game/logic.js          pure logic: trie, scoring, move generation (no React)
  game/gameState.js      pure reducer for the whole game
  game/defs.js           meaning loader
  hooks/useDragDrop.js   pointer-event drag and drop
  components/            Board, Rack, panels, dialogs
  App.jsx                wiring, opponent turn, dictionary loading
```

## Data sources and licenses

- **ENABLE word list** (`public/enable1.txt`): public domain. 168,551 words of 2 to 15 letters are used. It predates some newer tournament words, so QI and ZA, for example, are not accepted.
- **WordNet 3.0** (`public/defs`, `public/wordnet-license.txt`): Copyright 2006 Princeton University. Used under the WordNet license, which requires the notice to stay with copies. The app footer and `public/wordnet-license.txt` carry it. Meanings cover about two thirds of the word list. Plurals, past tenses and similar forms are matched to their base word by suffix rules and labelled as such. Words with no match show "no meaning is included".

Do not replace the word list with the official Collins or TWL lists unless you hold a license for them.

## Naming

Scrabble is a registered trademark. The game mechanics are not protected, but the name and branding are, so this project does not use them. Keep it that way if you publish.

## Deploy to GitHub Pages

1. Push this repository to GitHub.
2. In the repository, open Settings, then Pages, and set Source to **GitHub Actions**.
3. Push to `main`. The workflow in `.github/workflows/deploy.yml` runs the tests, builds the site and publishes it.

The site is built with a relative base path, so it works from a project URL such as `https://USER.github.io/letter-duel/`.

## Deploy to Google Cloud

The repository includes `Dockerfile`, `nginx.conf` and `cloudbuild.yaml`. The image builds the site with Node, then serves it with nginx as a non-root user on port 8080, which is what Cloud Run and GKE probes expect.

Try the image locally first:

```bash
docker build -t letter-duel .
docker run --rm -p 8080:8080 letter-duel
# http://localhost:8080  and  http://localhost:8080/healthz
```

Cloud Run through Cloud Build:

```bash
gcloud services enable cloudbuild.googleapis.com artifactregistry.googleapis.com run.googleapis.com
gcloud artifacts repositories create letter-duel --repository-format=docker --location=asia-southeast1
gcloud builds submit --config=cloudbuild.yaml .
```

The pipeline runs the tests, builds and pushes the image to Artifact Registry, then deploys it to Cloud Run. The Cloud Build service account needs `roles/artifactregistry.writer`, `roles/run.admin` and `roles/iam.serviceAccountUser`. Change `_REGION`, `_REPO` and `_SERVICE` at the top of `cloudbuild.yaml` if you want different names. To trigger builds from GitHub, connect the repository in Cloud Build and point a trigger at `cloudbuild.yaml`.

`--allow-unauthenticated` in the deploy step makes the site public. Remove it if the game should require sign-in.

For GKE, use the same image and add a Deployment and Service with container port 8080, and point the liveness and readiness probes at `/healthz`. The Cloud Run deploy step in `cloudbuild.yaml` would be replaced by a `kubectl set image` step.

`nginx.conf` sends a Content-Security-Policy that allows only this origin and Google Fonts. If you add a new external script, image host or API, add it to that header.

## Regenerating the meanings

The files in `public/defs` were generated from the WordNet 3.0 database (npm package `wordnet-db`), keeping the first sense of each part of speech and up to two extra senses. The generator was a one-off script and is not included..
