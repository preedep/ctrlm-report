# CLAUDE.md



## Project Identity

`ctrlm-report` is a Rust binary crate (edition 2024). Its purpose is to generate self-contained HTML reports for `ctrlm` (control-m) workflows.
It reads `dataset/output.json`, embeds the data into `src/template.html`, and writes a standalone `report.html` — no server required.



## Architecture Boundaries

- **Binary crate** — no library surface; all logic lives under `src/`.
- Keep I/O at the edges; pure logic in the middle.
- Module layout:
  - `main.rs` — CLI arg parsing via `clap`, wires `input` → `output`
  - `input.rs` — loads and deserializes `output.json` into `Vec<Job>`
  - `model.rs` — `Job` struct (all fields `#[serde(default)]`)
  - `output.rs` — builds compact `ReportJob` (short serde keys to reduce size), serializes to JSON, and injects into `template.html` via `__DATA__` / `__GEN_TIME__` placeholders
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
cargo run                                      # reads dataset/output.json, writes report.html
cargo run -- -i path/to/data.json -o out.html  # custom input/output paths
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


## Pattern Decisions

- Rust edition 2024.
- `thiserror` for domain errors, `anyhow` for application-level propagation.
- No `unwrap`/`expect` in non-test code — propagate errors explicitly.
- Derive `Debug` on all public types.
- `ReportJob` uses short serde rename keys (`jn`, `fo`, `ap`, …) to reduce embedded JSON payload size.

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
- Dashboard `Jobs by Application Plan` stacked bar chart
  - Shows job count per `app_port_application_plan` stacked within each row
  - Toggle perspective: **By Domain** or **By IT Division**
  - Always uses full dataset (independent of plan perspective pills)
  - Color scheme: maintain=green, cloud migration=blue, decomission=red, replacement=amber, upgrade=purple, No plan=light-gray
  - Legend strip shows each plan label with its total job count
  - Click any bar segment → navigates to Jobs tab pre-filtered by that domain/IT division AND that plan
