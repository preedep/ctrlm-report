mod input;
mod model;
mod output;

use anyhow::Result;
use clap::Parser;
use std::path::PathBuf;

#[derive(Parser, Debug)]
#[command(name = "ctrlm-report", about = "Generate Control-M web report")]
struct Args {
    /// Path to the input JSON file
    #[arg(short, long, default_value = "dataset/output.json")]
    input: PathBuf,

    /// Path for the output HTML report
    #[arg(short, long, default_value = "report.html")]
    output: PathBuf,
}

fn main() -> Result<()> {
    let args = Args::parse();

    eprintln!("Reading {}", args.input.display());
    let jobs = input::load_jobs(&args.input)?;
    eprintln!("Loaded {} jobs", jobs.len());

    output::generate_report(&jobs, &args.output)?;
    eprintln!("Report written to {}", args.output.display());

    Ok(())
}
