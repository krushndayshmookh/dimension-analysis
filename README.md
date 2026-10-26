# Dimension Analysis

Exam analytics for a single instructor, running offline. Upload an exam's questions and scores and see how
students and the cohort perform across the cognitive dimensions **Recall, Comprehend, Solve, Build, Evaluate**.

```bash
npm install
npm run dev        # storage server (port 3001) + Vite (port 5173)
npm test           # unit tests
```

Data is stored as JSON files in `data/` (git-ignored). `npm run build` followed by `npm run server` serves the built
app from the storage server alone.

## Accounts

Everything behind `/api` needs a signed-in user, and each user's data is kept apart in `data/users/<username>/`.
Accounts are managed on the server:

```bash
npm run users -- add <username>             # asks for a password (10+ characters)
npm run users -- passwd <username>          # also signs that user out everywhere
npm run users -- remove <username>          # removes the login, keeps the data folder
npm run users -- list
npm run users -- import-legacy <username>   # move data from the old single-user layout into an account
```

Environment: `DATA_DIR` (where data lives, default `./data`), `PORT`, `TRUST_PROXY=1` when running behind nginx/Caddy
(so the session cookie gets the `Secure` flag; serve it over HTTPS), `SESSION_SECRET` (optional; otherwise one is
generated in `data/auth/secret`), `HOST` (default `127.0.0.1`, so the app is reachable only through the tunnel/proxy).

Behind a proxy that does not pass `X-Forwarded-Proto` (Traefik does not trust it from the tunnel by default), set
`COOKIE_SECURE=true` so the session cookie is always `Secure`, and `CLIENT_IP_HEADER=CF-Connecting-IP` so the login
throttle counts each visitor separately instead of the proxy's address. Only use the latter when every request comes
through Cloudflare. See [Deploying to Kubernetes](#deploying-to-kubernetes).

## Input files

Students are added once to a named cohort, and exams are uploaded for a cohort. Strict CSV formats, documented in [templates/README.md](templates/README.md) with header-plus-example files in
`templates/` and valid sample uploads in `samples/` (`small` and `large`; the large one has multiple-choice questions).

| file | required | notes |
| --- | --- | --- |
| `exam_config.csv` | yes | question type (`assignment` / `assessment`), difficulty, dimensions, topics, marks; optional `expected_solve_rate`, `question_subtype` (`mcq`) with its `correct_option` |
| `student_scores.csv` | yes | wide form: one column per question (marks, or the chosen option for `mcq` questions); long form is also accepted as `student_id,question_id,marks`; blank = unattempted |
| `students.csv` | for a cohort | the cohort's students: id, name, optional `section`; uploaded once on the Cohorts page |
| `attendance.csv` | no | per exam: `present` / `absent`; a cohort student with no row in the scores file counts as absent |

Files that do not follow the format are rejected with the rows that need fixing. In long-form scores, commas and spaces in numeric question IDs are ignored, extra columns are ignored, and each `student_id`/`question_id` pair may occur only once. The config and scores files must contain the same set of question IDs.

## Pages

- **Students:** Cohort, Student profile, Sections, Grade bands, Correlations, Feedback sheets (print or download per
  student).
- **Paper:** Paper analysis, Question review (review queue, reuse across exams, attempt behaviour), Distractors.
- **Scenarios:** Simulation (expected vs actual, with tunable parameters and a 90% range over repeated runs), What-if
  (rescoring).
- **Over time:** History, Compare exams.
- **Data:** Dashboard (shown when no exam is open), Cohorts, Upload exam, Sheet converter, Saved exams.
- **Settings** (its own top-level tab): every threshold behind a tag, with a description of what it affects, plus backup
  and restore.

An open exam can be closed from the header; the app then returns to the dashboard.

Colored verdict tags (Weak / Strong, Low / Medium / High deviation, ...) come from the thresholds in Settings and can
be switched off. Every table has search, per-column filters, sorting and CSV export.

## Code layout

The UI is Vue 3 with [shadcn-vue](https://www.shadcn-vue.com/) (Tailwind CSS v4, reka-ui) and Pinia.

- `src/lib/` pure analysis code, all unit tested: input validation, profiles, paper analysis, items, simulation,
  verdicts, settings, and one module per tool.
- `src/stores/` Pinia stores: `session` (open exam, saved exams, current page), `settings`, `notice`, `simulation`.
- `src/pages/` one component per page (`CohortPage`, `PaperPage`, `SimulationPage`, ...), with sub-components in
  `pages/paper/`, `pages/simulation/` and `pages/settings/`; `pages/index.js` is the page registry used by the navigation.
- `src/tools/` the larger page components (question review, sections, correlations, ...); `pages/registry.js` lists
  every page and its navigation group, and `pages/index.js` attaches the components.
- `src/components/`
  - `ui/` shadcn-vue components as generated (default styles);
  - `common/` page header, section and stat cards, field, alert, select, confirm dialog, badges;
  - `display/` data table, verdict tag, bars, student sidebar, band editor;
  - `charts/` Chart.js and SVG charts; `feedback/` the printable feedback sheet; `layout/` header and navigation.
- Colors for verdict tones and the five dimensions are theme tokens in `src/style.css`; everything else uses the
  default shadcn theme.
- `server/` file storage (exams, student histories, settings, backup).
- `tests/` node:test specs; `scripts/generate_large_sample.js` regenerates `samples/large`.

## Deploying to Kubernetes

The app runs as one container: the Express server serves the built app and the API, and keeps all data as files on a
volume. Manifests are in [k8s/](k8s/) (namespace, volume claim, deployment, service, Traefik ingress for
`dimension.dayshmookh.work`) and tie together with Kustomize. Traffic path: Cloudflare Tunnel → Traefik → service → pod.

1. **Build and push the image** to a registry your cluster can pull from:
   ```bash
   docker build -t <registry>/dimension-analysis:1 .
   docker push <registry>/dimension-analysis:1
   ```
   On Apple silicon, build for the cluster's architecture, e.g. `docker buildx build --platform linux/amd64 ...`.
2. **Set the image** under `images:` in [k8s/kustomization.yaml](k8s/kustomization.yaml) (`newName`, `newTag`). Add an
   image pull secret to the deployment if the registry is private. Set `storageClassName` in
   [k8s/pvc.yaml](k8s/pvc.yaml) if the cluster has no default, and change the host in
   [k8s/ingress.yaml](k8s/ingress.yaml) if needed.
3. **Apply:**
   ```bash
   kubectl apply -k k8s
   kubectl -n dimension-analysis rollout status deploy/dimension-analysis
   ```
4. **Create the accounts.** Nobody can sign in until you do; run once per person (it asks for the password):
   ```bash
   kubectl -n dimension-analysis exec -it deploy/dimension-analysis -- node scripts/users.js add <username>
   ```
   `passwd`, `remove` and `list` work the same way. New accounts take effect immediately; no restart.
5. **Open** `https://dimension.dayshmookh.work` and sign in.

Notes:
- **One replica, `Recreate` strategy.** Storage is plain files without locking, so never scale beyond 1.
- **Data lives on the volume** at `/data` (`/data/users/<username>/` per account, `/data/auth/` for logins and the
  session key). Back it up: snapshot the PVC, or have each user download a backup from Settings.
- **Moving existing local data in:** with the pod running, copy a local `data/users/<username>` folder to the same
  path (`kubectl -n dimension-analysis cp data/users/<username> <pod>:/data/users/<username>`; the folder must belong to
  uid 1000, so `exec` a `chown -R 1000:1000 /data/users` afterwards if needed), or restore a backup from Settings.
- **Cloudflare/Traefik:** the tunnel must pass the original `Host` header (the default) because state-changing requests
  from another origin are refused by comparing `Origin` to `Host`.
- **Upgrading:** on the server, `git pull && npm run deploy` ([scripts/deploy.sh](scripts/deploy.sh)) rebuilds the image,
  pushes it to `localhost:30500`, applies the manifests and restarts the pod. Data is untouched. Override the image
  with `IMAGE=...` if the registry changes.
- **Request size:** uploads go up to 100 MB in the app; Cloudflare's own request limit (100 MB on free plans) applies first.
