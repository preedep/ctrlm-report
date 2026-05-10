mod input;
mod model;
mod output;

use anyhow::{bail, Result};
use clap::Parser;
use output::AuthConfig;
use std::path::PathBuf;

#[derive(Parser, Debug)]
#[command(name = "ctrlm-report", about = "Generate Control-M web report")]
struct Args {
    /// Path to the Control-M jobs JSON file
    #[arg(short, long, default_value = "dataset/output.json")]
    input: PathBuf,

    /// Path to the application inventory JSON file
    #[arg(short = 'a', long, default_value = "dataset/output_app_inventory.json")]
    app_inventory: PathBuf,

    /// Path to the Control-M migration plan JSON file
    #[arg(short = 'p', long, default_value = "dataset/output_controlm_plan.json")]
    plan: PathBuf,

    /// Path for the output HTML report
    #[arg(short, long, default_value = "report.html")]
    output: PathBuf,

    /// Enable Entra ID (MSAL.js) authentication gate in the report
    #[arg(long)]
    auth: bool,

    /// Entra ID application (client) ID — required when --auth is set
    #[arg(long, required_if_eq("auth", "true"))]
    client_id: Option<String>,

    /// Entra ID tenant ID — required when --auth is set
    #[arg(long, required_if_eq("auth", "true"))]
    tenant_id: Option<String>,
}

fn main() -> Result<()> {
    let args = Args::parse();

    let auth = if args.auth {
        let client_id = args.client_id.unwrap_or_default();
        let tenant_id = args.tenant_id.unwrap_or_default();
        if client_id.is_empty() || tenant_id.is_empty() {
            bail!("--client-id and --tenant-id are required when --auth is set");
        }
        AuthConfig { enabled: true, client_id, tenant_id }
    } else {
        AuthConfig::default()
    };

    eprintln!("Reading {}", args.input.display());
    let jobs = input::load_jobs(&args.input)?;
    eprintln!("Loaded {} jobs", jobs.len());

    eprintln!("Reading {}", args.app_inventory.display());
    let app_inventory = input::load_app_inventory(&args.app_inventory)?;
    eprintln!("Loaded {} app inventory items", app_inventory.len());

    eprintln!("Reading {}", args.plan.display());
    let plan = input::load_controlm_plan(&args.plan)?;
    eprintln!("Loaded {} migration plan items", plan.len());

    if auth.enabled {
        eprintln!("Auth: Entra ID enabled (client_id={})", auth.client_id);
    }

    output::generate_report(&jobs, &app_inventory, &plan, &args.output, &auth)?;
    eprintln!("Report written to {}", args.output.display());

    Ok(())
}
