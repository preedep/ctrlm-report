# CLAUDE.md



## Project Identity

`ctrlm-report` is a Rust binary crate (edition 2024). Its purpose is to generate self-contained HTML reports for `ctrlm` (control-m) workflows.

It reads `dataset/output.json` (Control-M jobs) and `dataset/output_app_inventory.json` (full application portfolio), embeds both datasets into `src/template.html`, and writes a standalone `report.html` — no server required.



## Architecture Boundaries

- **Binary crate** — no library surface; all logic lives under `src/`.
- Keep I/O at the edges; pure logic in the middle.
- Module layout:
  - `main.rs` — CLI arg parsing via `clap`, wires `input` → `output`
  - `input.rs` — `load_jobs()` deserializes `output.json` into `Vec<Job>`; `load_app_inventory()` deserializes `output_app_inventory.json` into `Vec<AppInventory>`
  - `model.rs` — `Job` struct (Control-M job + app portfolio fields); `AppInventory` struct (app portfolio only)
  - `output.rs` — builds compact `ReportJob` and `ReportAppItem` (short serde keys to reduce size), serializes to JSON, and injects into `template.html` via `__DATA__` / `__APP_DATA__` / `__GEN_TIME__` placeholders
  - `template.html` — the full HTML/JS report template, embedded at compile time via `include_str!`

## Dependencies

```toml
serde       = { version = "1", features = ["derive"] }
serde_json  = "1"
anyhow      = "1"
thiserror   = "1"
clap        = { version = "4", features = ["derive"] }
```

## CLI Usage

```bash
cargo run                                                        # reads dataset/output.json + dataset/output_app_inventory.json, writes report.html
cargo run -- -i path/to/data.json -a path/to/inventory.json -o out.html  # custom input/output paths
```


## DataSet 

### Input `dataset/output.json`

- Array of json 
```
  // example json attribute
  {
    "app_port_app_code": "ST" //application of application portfolio,
    "app_port_app_id": "AP1160" //application id of application portfolio,
    "app_port_application_plan": "No plan" //Action plan of Application,
    "app_port_category": "App" //Category of Application,
    "app_port_criticality_level": "Mission Critical" //Application level,
    "app_port_domain": "3.Deposits & Core Banking" //under what domain name of this application , when render ignore number bullet,
    "app_port_it_division": "Deposit Products" // under what it division,
    "app_port_org_code": "5100" // under what organization code,
    "app_port_revised_to_sub_domain": "" ,
    "app_port_layer": "Product" , //under what application layer ex. channel , data provider 
    "app_port_sub_domain": "3.1 Current & Savings Accounts" // under what sub domain,
    "control_m_appl_type": "FILE_TRANS" //control-m information appl type is file transfer,
    "control_m_appl_ver": "6.1.01" //control-m agent version,
    "control_m_application": "AFT_DEPOSIT" //control-m application name,
    "control_m_command_line": "" ,
    "control_m_critical": "No",
    "control_m_cyclic": "No",
    "control_m_description": "OP20-100766",
    "control_m_folder": "AFT_DEPOSIT_DORMANT_NOTICE" //control-m folder name,
    "control_m_job_name": "AFT_DEPOSIT_DORMANT_NOTICE_01" //control-m job name,
    "control_m_owner": "",
    "control_m_priority": "AA",
    "control_m_sub_application": "AFT_DEPOSIT_DORMANT_NOTICE",
    "control_m_task_type": "Job"
  },
```

### Input `dataset/output_app_inventory.json`

Full application portfolio — one entry per application, independent of Control-M jobs. Used by the EA Landscape tab. Injected as `APP_DATA` in the report.

- Array of json 
```
  // example json attribute
  {
    "app_port_app_code": "ST" //application of application portfolio,
    "app_port_app_id": "AP1160" //application id of application portfolio,
    "app_port_application_plan": "No plan" //Action plan of Application,
    "app_port_category": "App" //Category of Application,
    "app_port_criticality_level": "Mission Critical" //Application level,
    "app_port_domain": "3.Deposits & Core Banking" //under what domain name of this application , when render ignore number bullet,
    "app_port_it_division": "Deposit Products" // under what it division,
    "app_port_org_code": "5100" // under what organization code,
    "app_port_sub_domain": "3.1 Current & Savings Accounts" , // under what sub domain,
     "app_port_layer": "Product" //under what application layer ex. channel , data provider 
  },
```

## Data Mapping

Application criticality level Mapping to Application Level or App level

```
 Mission Critical => App Lvl1
 Critical => App Lvl2
 Important => App Lvl3
 Other => App Lvl4
```

## Pattern Decisions

- Rust edition 2024.
- `thiserror` for domain errors, `anyhow` for application-level propagation.
- No `unwrap`/`expect` in non-test code — propagate errors explicitly.
- Derive `Debug` on all public types.
- `ReportJob` uses short serde rename keys (`jn`, `fo`, `ap`, …) to reduce embedded JSON payload size.
- `ReportAppItem` uses short serde rename keys (`ac`, `ai`, `pl`, `cat`, `cl`, `dom`, `div`, `oc`, `sd`, `la`) — same key conventions as `ReportJob` where fields overlap.
- Two template placeholders: `__DATA__` → Control-M jobs (`DATA` in JS); `__APP_DATA__` → app portfolio (`APP_DATA` in JS).

## Build / Test / Run

```bash
cargo build                    # debug build
cargo build --release          # release build
cargo run                      # run the binary
cargo run -- <args>            # pass CLI arguments
cargo test                     # run all tests
cargo test <test_name>         # run a single test by name
cargo test -- --nocapture      # show println! output during tests
```

## Verification Commands

```bash
cargo clippy -- -D warnings    # lint; treat warnings as errors
cargo fmt --check              # check formatting without writing
cargo fmt                      # auto-format
```

## Output

`report.html` — a single self-contained file. All data is embedded as a JSON constant inside the HTML; no external server or framework is required.

### Web static report
- Supports Safari and Google Chrome
- Design: modern / clean / simple
- Built as a single `report.html` (template in `src/template.html`, data injected at build time by `output.rs`)

#### Features
- Dashboard domain perspective relate with job control-m amount
- Dashboard summary what control-m application but not match with application portfolio (app_port_app_code = should is empty)
- Remove `(No Domain)` from Dashboard `Job by domain` 
- Can click on dashboard `Job by domain` to show each domain , drill down domain -> sub domain -> it division
- Can search and result display all job in table (that that can sortable ) , and display in paging (20,50,100)
- Diplay sum job amount of Unmatched Control-M Applications at table : Unmatched Control-M Applications  
- Logic for choose sub domain (compare between app_port_sub_domain and app_port_revised_to_sub_domain)
```
  if app_port_revised_to_sub_domain is not empty {
     sub domain = app_port_revised_to_sub_domain
  } 
```
- Can click on dashboard `Job by domain` goto tab job and search with current criteria ex. current doamin -> search by domain , current sub domain -> search by domain and sub domain
- Tab job
  - Clicking the Jobs tab directly calls `applyFilters()` on mount so the table is populated immediately
  - **Clear All** button (`clearAllFilters()`) resets all filter state + DOM inputs via `resetAllJobFilters()`, resets to page 1, then re-runs `applyFilters()`
  - `CL_ORDER` is an alias of `EAL_CL_ORDER` — do not remove it; it is used by the criticality level dropdown sort in the Jobs tab
  -add dropdown filter `app_port_application_plan` 
  -table result add column `sub domain` which use logic
```
  if app_port_revised_to_sub_domain is not empty {
     sub domain = app_port_revised_to_sub_domain
  } 
```
- Dropdown list in tab job 
  - Domain not display `(No Domain)`
  - Sub domain should display and filterd after select domain (all domain should not display)
  - in subdomain should not display number of bullet (it's came from raw data) remove number `4 Internet Banking` to `Internet Banking`
- Dashboard can display in perspective `app_port_application_plan`
- Dashboard in `IT Division` perspective
- Dashboard `Application Plan and Job Control-M Related` stacked bar chart
  - Shows job count per `app_port_application_plan` stacked within each row
  - Toggle perspective: **By Domain** or **By IT Division**
  - Always uses full dataset (independent of plan perspective pills)
  - Color scheme: maintain=green, cloud migration=blue, decomission=red, replacement=amber, upgrade=purple, No plan=light-gray
  - Legend strip shows each plan label with its total job count
  - Drill-down behavior (same concept as Jobs by IT Division):
    - Level 0: stacked chart — click any segment → drill down to application view for that domain/IT division + plan
    - Level 1: simple bar chart of applications (`app_port_app_code`) in that segment, colored with the plan's color — click any bar → navigates to Jobs tab pre-filtered by domain/IT division + plan + app code
    - Back button and breadcrumb appear at level 1; perspective toggle is hidden while drilling
    - Switching perspective (By Domain / By IT Division) resets drill state to level 0
    - Expand modal respects current drill level
- In Dashboard if `app_port_it_division` is empty but `app_port_app_code` have value  , setup group to `Other`
- Display controlm `job amount` on Dashboard charts:
  - Bar charts (Domain, IT Division, Plan drill-down): count label at bar end (e.g. `1,234`)
  - Stacked bar chart (Application Plan): row total drawn after the full stack; tooltip shows count + % of row per segment
  - Doughnut chart (Application Type): % label on each arc segment ≥4%; legend shows type name + count
  - Stat cards: Unmatched and Critical show `% of total jobs` in sub-text, updated when plan perspective changes
  - All bar chart tooltips show: jobs count + % of total
- Dashboard in tab `EA Landscape` uses `APP_DATA` (from `dataset/output_app_inventory.json`) — the full application portfolio, not filtered by Control-M jobs.
  - Layout: Domain → Sub-Domain (responsive column grid) → IT Division (labeled rows) → App cards
  - Domain block: rounded card, 5px colored left border, tinted header, app-count badge
  - Sub-domain grid: CSS `auto-fill minmax(256px)` columns, each a white panel with a colored underline header (matches domain color)
  - IT Division: labeled rows with a thin extending rule
  - App card: left border = plan color, bold app code, colored criticality dot (hover tooltip shows App ID · Criticality · Plan)
  - Plan color stripe (left border): maintain=green, cloud migration=blue, decommission=red, replacement=amber, upgrade=purple, no plan=gray
  - Criticality dot colors: Mission Critical (App Lvl1)=red, Critical (App Lvl2)=orange, Important (App Lvl3)=amber, Other (App Lvl4)=gray
  - Criticality labels displayed as `App Lvl1`–`App Lvl4` throughout (legend, pills, tooltips) via `EAL_CL_LABEL`; internal data keys remain the raw values
  - Page header: live stat pills (apps / domains / IT divisions) + legend bar (criticality dots + plan stripes)
  - JS: `buildEALandscape()`, color helpers `EAL_CL_COLOR` / `EAL_CL_ORDER` / `EAL_CL_LABEL`, `EAL_PL_ORDER` / `EAL_PL_LABEL`, and `ealPlanColor()` function
  - `EAL_CL_LABEL` maps raw criticality values to display labels: `Mission Critical`→`App Lvl1`, `Critical`→`App Lvl2`, `Important`→`App Lvl3`, `Other`→`App Lvl4`; used in legend, summary pills, and app card tooltips
  - **Domain header summary pills**: two labeled rows per domain — `Criticality` and `App Plan`
    - Each row has a fixed-width muted uppercase label (`52px`) so both rows align
    - `Criticality` row: round-dot pills colored by `EAL_CL_COLOR`, ordered by `EAL_CL_ORDER`, labeled via `EAL_CL_LABEL` (e.g. `App Lvl1`)
    - `App Plan` row: square-dot pills colored by `PLAN_COLORS`, ordered by `EAL_PL_ORDER`, labeled by `EAL_PL_LABEL`
    - Pills show mapped label + count in parentheses (e.g. `App Lvl1(5)`); only non-zero counts rendered
    - Click a pill → dims non-matching apps in that domain to 12% opacity; outlines the active pill
    - Click same pill again → clears filter and restores all apps (toggle)
    - One filter active per domain at a time; switching type clears the previous filter
    - Implemented in `ealFilter(domId, type, val)`; app cards carry `data-cl` and `data-pl` attributes for targeting
  - **App card click → Jobs tab**: clicking any app card calls `ealAppClick(el)` → `navigateToJobs(domain, '', appCode)`
    - Pre-filters Jobs tab by domain + app code; reuses same navigation function as other dashboard drill-downs
    - `data-dom` and `data-ac` stored as HTML attributes (escaped via `escHtml`) to avoid inline JS escaping issues
    - Hover: card lifts with stronger shadow, app code label turns blue (`var(--primary)`) to signal interactivity
    - Tooltip shows full app details + CTM job count (if any) + "Click to view Control-M jobs"; criticality shown as mapped label (e.g. `App Lvl1`)
  - **CTM Jobs highlight toggle**: button in the EA Landscape page header — "CTM Jobs" — toggles `eal-highlight-mode` class on `#ea-matrix-wrap`
    - State: `let ealJobHighlight = false`; toggled by `toggleEALJobHighlight()`
    - `ctrlmJobCount` map (keyed by `app_port_app_code`) is computed once at startup from `DATA`
    - App cards with ≥1 CTM job receive class `eal-has-job` and an amber count badge (`.eal-ctm-badge`) showing the job count
    - When mode is ON: `.eal-has-job` cards glow with amber ring; cards without jobs dim to 18% opacity
    - When mode is OFF: all cards appear at full opacity with no ring (normal view)
    - Button turns amber (`.active`) while mode is on; class persists across perspective rebuilds because it is on the wrapper element, not its innerHTML
  - **Phone-book side-nav**: sticky left sidebar (`176px`, `position:sticky; top:112px`) listing all domains with colored dot + app count
    - Clicking a domain entry calls `ealNavJump(id)` → smooth scrolls to that domain block
    - Scroll spy via `window._ealScrollFn` (passive scroll listener): highlights the topmost visible domain; auto-scrolls the nav to keep active item in view
    - Each domain block has `id="eal-d{index}"` and `data-eal-dom` attribute for scroll spy targeting
    - Layout uses `.eal-body` (flex row): `.eal-sidenav` (sticky nav) + `.eal-content` (landscape, `flex:1`)
    - Section-card uses `overflow:clip` (not `overflow:hidden`) so `position:sticky` works — `clip` preserves rounded-corner clipping without creating a scroll container
  - **Perspective toggle**: toggle button group in the EA Landscape page header — "By Domain", "By IT Division", "By Layer"
    - `let ealPerspective = 'domain'`; `setEALPerspective(persp)` updates active button, updates subtitle text (`#eal-subtitle`), and calls `buildEALandscape()`
    - Subtitle text changes with perspective: "Application portfolio — Domain → Sub-Domain → IT Division" / "Application portfolio — IT Division → Domain → App" / "Application portfolio — Layer → Domain → App"
    - **By Domain** (default): Domain → Sub-Domain columns → IT Division rows → App cards (same as original view)
      - Domain block header meta line: `N sub-domains · N IT divisions · N CTM jobs` (job total summed across all apps in the domain via `ctrlmJobCount`)
    - **By IT Division**: flipped view — IT Division block → Domain columns → App cards
      - `buildEALByITDiv(appRegistry, domainColorMap)`: groups `appRegistry` by `div → dom → [apps]`
      - IT division blocks sorted by app count descending; `'Other'` (empty `app_port_it_division`) always last
      - Side nav header changes to "IT Divisions"; nav items show division label + app count
      - Each IT division block shows: division name, `N domains · N CTM jobs` meta, Criticality + App Plan summary pills
      - Domain columns inside each IT div block use the same `domainColorMap` colors as the By Domain view for visual consistency
      - App cards identical to By Domain view — same click-to-jobs, filter, dim behavior
    - **By Layer**: Layer block → Domain columns → App cards
      - `buildEALByLayer(appRegistry, domainColorMap)`: groups `appRegistry` by `la` (app_port_layer, normalised lowercase) → dom → [apps]
      - Layer order (top→down): Channel, Processing, Product, Data, Enterprise Support, Technology Foundation; unknown/empty layers follow sorted alphabetically
      - `EAL_LAYER_ORDER`, `EAL_LAYER_LABEL`, `EAL_LAYER_COLOR` constants define order, display name, and fixed accent color per layer
      - Layer colors: Channel=blue, Processing=purple, Product=green, Data=amber, Enterprise Support=pink, Technology Foundation=slate
      - Side nav header changes to "Layers"; nav items show layer label + app count
      - Each layer block shows: layer name, `N domains · N CTM jobs` meta, Criticality + App Plan summary pills
      - Domain columns use the same `domainColorMap` colors for visual consistency across all perspectives
    - `domainColorMap` is built in `buildEALandscape()` (sorted by domain app count) and passed to `buildEALByITDiv()` / `buildEALByLayer()` to ensure consistent domain colors across all perspectives
    - `setupEALScrollSpy()` is called at the end of `buildEALandscape()`, `buildEALByITDiv()`, and `buildEALByLayer()` to wire up the scroll spy after any rebuild
