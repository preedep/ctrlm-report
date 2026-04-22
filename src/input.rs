use crate::model::Job;
use anyhow::Result;
use std::fs;
use std::path::Path;

pub fn load_jobs(path: &Path) -> Result<Vec<Job>> {
    let content = fs::read_to_string(path)?;
    let jobs: Vec<Job> = serde_json::from_str(&content)?;
    Ok(jobs)
}
