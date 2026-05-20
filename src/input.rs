use crate::model::{AppInventory, CtrlmPlan, DagData, Job};
use anyhow::Result;
use std::fs;
use std::path::Path;

pub fn load_jobs(path: &Path) -> Result<Vec<Job>> {
    let content = fs::read_to_string(path)?;
    let jobs: Vec<Job> = serde_json::from_str(&content)?;
    Ok(jobs)
}

pub fn load_app_inventory(path: &Path) -> Result<Vec<AppInventory>> {
    let content = fs::read_to_string(path)?;
    let items: Vec<AppInventory> = serde_json::from_str(&content)?;
    Ok(items)
}

pub fn load_controlm_plan(path: &Path) -> Result<Vec<CtrlmPlan>> {
    let content = fs::read_to_string(path)?;
    let items: Vec<CtrlmPlan> = serde_json::from_str(&content)?;
    Ok(items)
}

pub fn load_dag(path: &Path) -> Result<DagData> {
    let content = fs::read_to_string(path)?;
    let dag: DagData = serde_json::from_str(&content)?;
    Ok(dag)
}
