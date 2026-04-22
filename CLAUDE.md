# CLAUDE.md



## Project Identity

`ctrlm-report` is a Rust binary crate (edition 2024). Its purpose is to generate reports for `ctrlm` (control-m) workflows. Currently in early scaffolding — entry point is `src/main.rs`.
`ctrlm-report` is cli application for generate web report static (for stand alone without serverside) and built-in json file `dataset/output.json`



## Architecture Boundaries

- **Binary crate** — no library surface; all logic lives under `src/`.
- Keep I/O (reading config, writing output) at the edges; pure logic in the middle.
- If modules are added, separate concerns by: `input` (parsing/loading), `model` (domain types), `output` (formatting/rendering), `cli` (argument handling).


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
- Prefer `thiserror` for domain errors and `anyhow` for application-level error propagation when dependencies are added.
- No `unwrap`/`expect` in non-test code — propagate errors explicitly.
- Derive `Debug` on all public types.

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
- Modern web static report and embded data (refer to `dataset/output.json`) 

### Web static report
- Support both safari , google chrome 
- Design modern/clean/simple
- use `Astro` Framework

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
- Dropdown list in tab job 
  - Domain not display `(No Domain)`
  - Sub domain should display and filterd after select domain (all domain should not display)
  - in subdomain should not display number of bullet (it's came from raw data) remove number `4 Internet Banking` to `Internet Banking`
- Dashboard can display in perspective `app_port_application_plan`
- Dasboard in `IT Division` perspective
