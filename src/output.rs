use crate::model::Job;
use anyhow::Result;
use serde::Serialize;
use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

// Compact representation — only fields needed for the report.
// Short serde keys reduce embedded JSON size by ~40%.
#[derive(Debug, Serialize)]
struct ReportJob<'a> {
    #[serde(rename = "jn")]
    job_name: &'a str,
    #[serde(rename = "fo")]
    folder: &'a str,
    #[serde(rename = "ap")]
    application: &'a str,
    #[serde(rename = "sa")]
    sub_application: &'a str,
    #[serde(rename = "dom")]
    domain: &'a str,
    #[serde(rename = "sd")]
    sub_domain: &'a str,
    #[serde(rename = "ac")]
    app_code: &'a str,
    #[serde(rename = "div")]
    it_division: &'a str,
    #[serde(rename = "at")]
    appl_type: &'a str,
    #[serde(rename = "tt")]
    task_type: &'a str,
    #[serde(rename = "cr")]
    critical: &'a str,
    #[serde(rename = "pr")]
    priority: &'a str,
    #[serde(rename = "cl")]
    criticality_level: &'a str,
    #[serde(rename = "pl")]
    plan: &'a str,
}

impl<'a> ReportJob<'a> {
    fn from_job(j: &'a Job) -> Self {
        Self {
            job_name: &j.control_m_job_name,
            folder: &j.control_m_folder,
            application: &j.control_m_application,
            sub_application: &j.control_m_sub_application,
            domain: &j.app_port_domain,
            sub_domain: if !j.app_port_revised_to_sub_domain.is_empty() {
                &j.app_port_revised_to_sub_domain
            } else {
                &j.app_port_sub_domain
            },
            app_code: &j.app_port_app_code,
            it_division: &j.app_port_it_division,
            appl_type: &j.control_m_appl_type,
            task_type: &j.control_m_task_type,
            critical: &j.control_m_critical,
            priority: &j.control_m_priority,
            criticality_level: &j.app_port_criticality_level,
            plan: &j.app_port_application_plan,
        }
    }
}

const TEMPLATE: &str = include_str!("template.html");

pub fn generate_report(jobs: &[Job], output_path: &Path) -> Result<()> {
    let report_jobs: Vec<ReportJob<'_>> = jobs.iter().map(ReportJob::from_job).collect();
    let data_json = serde_json::to_string(&report_jobs)?;

    let gen_time = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let html = TEMPLATE
        .replace("__DATA__", &data_json)
        .replace("__GEN_TIME__", &gen_time.to_string());

    fs::write(output_path, html)?;
    Ok(())
}
