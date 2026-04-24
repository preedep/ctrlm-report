# ctrlm-report

A Rust CLI that generates a self-contained HTML report for Control-M workflows, enriched with an application portfolio.

## Overview

Reads two JSON datasets and produces a single `report.html` — no server, no dependencies, works offline in Safari and Chrome.

| Input | Description |
|---|---|
| `dataset/output.json` | Control-M job definitions + app portfolio cross-reference |
| `dataset/output_app_inventory.json` | Full application portfolio (all apps, independent of jobs) |

## Quick Start

```bash
# Build
cargo build --release

# Generate report (uses default dataset paths)
cargo run

# Custom paths
cargo run -- -i path/to/jobs.json -a path/to/inventory.json -o out.html
```

## CLI Options

| Flag | Default | Description |
|---|---|---|
| `-i, --input` | `dataset/output.json` | Control-M jobs JSON |
| `-a, --app-inventory` | `dataset/output_app_inventory.json` | App inventory JSON |
| `-o, --output` | `report.html` | Output HTML path |

## Report Features

### Dashboard
- **Jobs by Domain** — bar chart drill-down: Domain → Sub-Domain → IT Division → Jobs tab
- **Jobs by IT Division** — bar chart with same drill-down behavior
- **Application Type** — doughnut chart with % labels
- **Application Plan & Jobs** — stacked bar chart (By Domain / By IT Division toggle)
  - Drill to application level per plan segment, then to Jobs tab
  - Color scheme: Maintain=green, Cloud Migration=blue, Decommission=red, Replacement=amber, Upgrade=purple, No Plan=gray
- **Unmatched Control-M Applications** — jobs with no matching app portfolio entry
- **Stat cards** — Unmatched and Critical counts with % of total
- All charts show job counts; bar chart tooltips show count + % of total

### Jobs Tab
- Full searchable, sortable, paginated table (20 / 50 / 100 per page)
- Filter by Domain, Sub-Domain, IT Division, Application Plan, Criticality Level
- Sub-Domain dropdown strips numeric prefixes (e.g. `4. Internet Banking` → `Internet Banking`)
- **Clear All** button resets all filters and reloads the full table
- Clicking any dashboard chart navigates here pre-filtered

### EA Landscape Tab
- Uses the **full app inventory** (`APP_DATA`), not filtered by Control-M jobs
- **Perspective toggle**: By Domain / By IT Division
  - **By Domain**: Domain → Sub-Domain columns → IT Division rows → App cards
    - Subtitle: `Application portfolio — Domain → Sub-Domain → IT Division`
  - **By IT Division**: IT Division → Domain columns → App cards
    - Subtitle: `Application portfolio — IT Division → Domain → App`
- **Phone-book side nav** — sticky sidebar listing all domains/IT divisions; click to scroll, scroll spy highlights current section
- **Domain/IT Division header pills** — Criticality and App Plan summary counts; click a pill to dim non-matching apps (toggle)
- **App cards** — left border = plan color, criticality dot, hover tooltip; click to navigate to Jobs tab filtered by domain + app code
- **Live stat pills** in header: total apps / domains / IT divisions
- Plan color stripe: Maintain=green, Cloud Migration=blue, Decommission=red, Replacement=amber, Upgrade=purple, No Plan=gray
- Criticality dot: Mission Critical=red, Critical=orange, Important=amber, Other=gray

## Architecture

```
src/
├── main.rs        # CLI (clap), wires input → output
├── input.rs       # load_jobs() / load_app_inventory()
├── model.rs       # Job + AppInventory structs
├── output.rs      # ReportJob / ReportAppItem (short serde keys), HTML injection
└── template.html  # Full HTML/JS report (embedded via include_str!)
```

Data is injected into the template via two placeholders:
- `__DATA__` → Control-M jobs array (`DATA` constant in JS)
- `__APP_DATA__` → App inventory array (`APP_DATA` constant in JS)
- `__GEN_TIME__` → Unix timestamp of report generation

## Development

```bash
cargo build             # debug
cargo run               # run with default paths
cargo test              # run tests
cargo clippy -- -D warnings   # lint
cargo fmt               # format
```

## Dependencies

```toml
serde       = { version = "1", features = ["derive"] }
serde_json  = "1"
anyhow      = "1"
thiserror   = "1"
clap        = { version = "4", features = ["derive"] }
```
