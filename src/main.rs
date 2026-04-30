mod input;
mod model;
mod output;

use anyhow::Result;
use clap::Parser;
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
}

fn main() -> Result<()> {
    let args = Args::parse();

    eprintln!("Reading {}", args.input.display());
    let jobs = input::load_jobs(&args.input)?;
    eprintln!("Loaded {} jobs", jobs.len());

    eprintln!("Reading {}", args.app_inventory.display());
    let app_inventory = input::load_app_inventory(&args.app_inventory)?;
    eprintln!("Loaded {} app inventory items", app_inventory.len());

    eprintln!("Reading {}", args.plan.display());
    let plan = input::load_controlm_plan(&args.plan)?;
    eprintln!("Loaded {} migration plan items", plan.len());

    output::generate_report(&jobs, &app_inventory, &plan, &args.output)?;
    eprintln!("Report written to {}", args.output.display());

    Ok(())
}
