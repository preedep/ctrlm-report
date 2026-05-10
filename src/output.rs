use crate::model::{AppInventory, CtrlmPlan, Job};
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

// Compact representation of an app inventory item for embedding in the report.
#[derive(Debug, Serialize)]
struct ReportAppItem<'a> {
    #[serde(rename = "ac")]
    app_code: &'a str,
    #[serde(rename = "ai")]
    app_id: &'a str,
    #[serde(rename = "pl")]
    plan: &'a str,
    #[serde(rename = "cat")]
    category: &'a str,
    #[serde(rename = "cl")]
    criticality_level: &'a str,
    #[serde(rename = "dom")]
    domain: &'a str,
    #[serde(rename = "div")]
    it_division: &'a str,
    #[serde(rename = "oc")]
    org_code: &'a str,
    #[serde(rename = "sd")]
    sub_domain: &'a str,
    #[serde(rename = "la")]
    layer: &'a str,
}

impl<'a> ReportAppItem<'a> {
    fn from_inventory(i: &'a AppInventory) -> Self {
        Self {
            app_code: &i.app_port_app_code,
            app_id: &i.app_port_app_id,
            plan: &i.app_port_application_plan,
            category: &i.app_port_category,
            criticality_level: &i.app_port_criticality_level,
            domain: &i.app_port_domain,
            it_division: &i.app_port_it_division,
            org_code: &i.app_port_org_code,
            sub_domain: &i.app_port_sub_domain,
            layer: &i.app_port_layer,
        }
    }
}

// Compact representation of a CTM migration plan item.
#[derive(Debug, Serialize)]
struct ReportPlanItem<'a> {
    #[serde(rename = "jn")]
    job_name: &'a str,
    #[serde(rename = "sr")]
    sr_no: &'a str,
    #[serde(rename = "st")]
    status: &'a str,
    #[serde(rename = "dn")]
    dag_name: &'a str,
}

impl<'a> ReportPlanItem<'a> {
    fn from_plan(p: &'a CtrlmPlan) -> Self {
        Self {
            job_name: &p.control_m_job_name,
            sr_no: &p.sr_no,
            status: &p.status,
            dag_name: &p.dag_name,
        }
    }
}

const TEMPLATE: &str = include_str!("template.html");

const MSAL_CDN: &str =
    r#"<script src="https://alcdn.msauth.net/browser/2.38.3/js/msal-browser.min.js"></script>"#;

const MSAL_STARTUP_TMPL: &str = r#"(async function() {
  setLoaderMsg('Signing in…');
  const _msal = new msal.PublicClientApplication({
    auth: {
      clientId: '__CLIENT_ID__',
      authority: 'https://login.microsoftonline.com/__TENANT_ID__',
      redirectUri: window.location.origin + window.location.pathname,
    },
    cache: { cacheLocation: 'sessionStorage' },
  });
  await _msal.initialize();
  const _res  = await _msal.handleRedirectPromise();
  const _acct = _res?.account ?? _msal.getAllAccounts()[0];
  if (!_acct) {
    await _msal.loginRedirect({ scopes: ['User.Read'] });
    return;
  }
  const _u = document.getElementById('auth-user');
  if (_u) {
    _u.style.display = 'flex';
    const initials = (_acct.name || _acct.username || '?')
      .split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
    document.getElementById('auth-user-avatar').textContent = initials;
    _u.querySelector('.auth-user-name').textContent = _acct.name || _acct.username;
    document.getElementById('auth-signout-btn').onclick =
      () => _msal.logoutRedirect({ account: _acct });
  }
  document.getElementById('loading-overlay').classList.add('hidden');
})();"#;

const NO_AUTH_STARTUP: &str =
    "document.getElementById('loading-overlay').classList.add('hidden');";

/// Configuration for optional Entra ID authentication gate.
#[derive(Debug)]
pub struct AuthConfig {
    pub enabled: bool,
    pub client_id: String,
    pub tenant_id: String,
}

impl Default for AuthConfig {
    fn default() -> Self {
        Self { enabled: false, client_id: String::new(), tenant_id: String::new() }
    }
}

pub fn generate_report(
    jobs: &[Job],
    app_inventory: &[AppInventory],
    plan: &[CtrlmPlan],
    output_path: &Path,
    auth: &AuthConfig,
) -> Result<()> {
    let report_jobs: Vec<ReportJob<'_>> = jobs.iter().map(ReportJob::from_job).collect();
    let data_json = serde_json::to_string(&report_jobs)?;

    let report_apps: Vec<ReportAppItem<'_>> = app_inventory.iter().map(ReportAppItem::from_inventory).collect();
    let app_data_json = serde_json::to_string(&report_apps)?;

    let report_plan: Vec<ReportPlanItem<'_>> = plan.iter().map(ReportPlanItem::from_plan).collect();
    let plan_data_json = serde_json::to_string(&report_plan)?;

    let gen_time = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let (msal_cdn, auth_startup) = if auth.enabled {
        let startup = MSAL_STARTUP_TMPL
            .replace("__CLIENT_ID__", &auth.client_id)
            .replace("__TENANT_ID__", &auth.tenant_id);
        (MSAL_CDN, startup)
    } else {
        ("", NO_AUTH_STARTUP.to_string())
    };

    let html = TEMPLATE
        .replace("__DATA__", &data_json)
        .replace("__APP_DATA__", &app_data_json)
        .replace("__PLAN_DATA__", &plan_data_json)
        .replace("__GEN_TIME__", &gen_time.to_string())
        .replace("__MSAL_CDN__", msal_cdn)
        .replace("__AUTH_STARTUP__", &auth_startup);

    fs::write(output_path, html)?;
    Ok(())
}
