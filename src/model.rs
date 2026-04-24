use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct AppInventory {
    #[serde(default)]
    pub app_port_app_code: String,
    #[serde(default)]
    pub app_port_app_id: String,
    #[serde(default)]
    pub app_port_application_plan: String,
    #[serde(default)]
    pub app_port_category: String,
    #[serde(default)]
    pub app_port_criticality_level: String,
    #[serde(default)]
    pub app_port_domain: String,
    #[serde(default)]
    pub app_port_it_division: String,
    #[serde(default)]
    pub app_port_org_code: String,
    #[serde(default)]
    pub app_port_sub_domain: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Job {
    #[serde(default)]
    pub app_port_app_code: String,
    #[serde(default)]
    pub app_port_app_id: String,
    #[serde(default)]
    pub app_port_application_plan: String,
    #[serde(default)]
    pub app_port_category: String,
    #[serde(default)]
    pub app_port_criticality_level: String,
    #[serde(default)]
    pub app_port_domain: String,
    #[serde(default)]
    pub app_port_it_division: String,
    #[serde(default)]
    pub app_port_org_code: String,
    #[serde(default)]
    pub app_port_revised_to_sub_domain: String,
    #[serde(default)]
    pub app_port_sub_domain: String,
    #[serde(default)]
    pub control_m_appl_type: String,
    #[serde(default)]
    pub control_m_appl_ver: String,
    #[serde(default)]
    pub control_m_application: String,
    #[serde(default)]
    pub control_m_command_line: String,
    #[serde(default)]
    pub control_m_critical: String,
    #[serde(default)]
    pub control_m_cyclic: String,
    #[serde(default)]
    pub control_m_description: String,
    #[serde(default)]
    pub control_m_folder: String,
    #[serde(default)]
    pub control_m_job_name: String,
    #[serde(default)]
    pub control_m_owner: String,
    #[serde(default)]
    pub control_m_priority: String,
    #[serde(default)]
    pub control_m_sub_application: String,
    #[serde(default)]
    pub control_m_task_type: String,
}
