use crate::model::{AppInventory, CtrlmPlan, DagData, Job};
use anyhow::Result;
use serde::Serialize;
use std::collections::HashMap;
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

// Pre-aggregated app-level dependency graph for the Job Dependencies tab.
// Built in Rust so the JS never has to iterate 28K raw edges at startup.
#[derive(Debug, Serialize)]
struct AppDepNode {
    #[serde(rename = "ac")]
    app_code: String,
    #[serde(rename = "jc")]
    job_count: usize,      // jobs that have at least one cross-app edge
    #[serde(rename = "tc")]
    total_count: usize,    // total jobs in this app
    #[serde(rename = "pl")]
    plan: String,
}

#[derive(Debug, Serialize)]
struct AppDepEdge {
    #[serde(rename = "f")]
    from: String,
    #[serde(rename = "t")]
    to: String,
    #[serde(rename = "c")]
    count: usize,
}

#[derive(Debug, Serialize)]
struct AppDepGraph {
    nodes: Vec<AppDepNode>,
    edges: Vec<AppDepEdge>,
}

/// Build a compact app-level dependency graph from the raw DAG + job list.
/// Skips jobs with empty app_port_app_code, and skips self-loops.
fn build_app_dep_graph(jobs: &[Job], dag: &DagData) -> AppDepGraph {
    // Map job_name → app_code (only for jobs with a non-empty app_code)
    let job_to_app: HashMap<&str, &str> = jobs
        .iter()
        .filter(|j| !j.app_port_app_code.is_empty() && !j.control_m_job_name.is_empty())
        .map(|j| (j.control_m_job_name.as_str(), j.app_port_app_code.as_str()))
        .collect();

    // Map node_id → job_name
    let id_to_job: HashMap<u64, &str> = dag.nodes.iter()
        .map(|n| (n.id, n.job_name.as_str()))
        .collect();

    // Per-app total job counts and plan (first plan seen wins)
    let mut app_job_count: HashMap<&str, usize> = HashMap::new();
    let mut app_plan: HashMap<&str, &str> = HashMap::new();
    for j in jobs {
        if j.app_port_app_code.is_empty() { continue; }
        *app_job_count.entry(&j.app_port_app_code).or_insert(0) += 1;
        app_plan.entry(&j.app_port_app_code).or_insert(&j.app_port_application_plan);
    }

    // Cross-app edge counts + track which jobs are on a cross-app edge
    let mut edge_counts: HashMap<(&str, &str), usize> = HashMap::new();
    let mut dep_jobs_per_app: HashMap<&str, std::collections::HashSet<&str>> = HashMap::new();
    for e in &dag.edges {
        let from_job = match id_to_job.get(&e.from) { Some(j) => j, None => continue };
        let to_job   = match id_to_job.get(&e.to)   { Some(j) => j, None => continue };
        let from_app = match job_to_app.get(*from_job) { Some(a) => a, None => continue };
        let to_app   = match job_to_app.get(*to_job)   { Some(a) => a, None => continue };
        if from_app == to_app { continue; }  // skip same-app
        *edge_counts.entry((from_app, to_app)).or_insert(0) += 1;
        dep_jobs_per_app.entry(from_app).or_default().insert(from_job);
        dep_jobs_per_app.entry(to_app).or_default().insert(to_job);
    }

    // Only include app nodes that appear in at least one cross-app edge
    let connected_apps: std::collections::HashSet<&str> = edge_counts.keys()
        .flat_map(|(f, t)| [*f, *t])
        .collect();

    let mut nodes: Vec<AppDepNode> = connected_apps.iter().map(|&ac| AppDepNode {
        app_code:    ac.to_string(),
        job_count:   dep_jobs_per_app.get(ac).map(|s| s.len()).unwrap_or(0),
        total_count: *app_job_count.get(ac).unwrap_or(&0),
        plan:        app_plan.get(ac).copied().unwrap_or("").to_string(),
    }).collect();
    nodes.sort_by(|a, b| a.app_code.cmp(&b.app_code));

    let mut edges: Vec<AppDepEdge> = edge_counts.into_iter().map(|((f, t), c)| AppDepEdge {
        from:  f.to_string(),
        to:    t.to_string(),
        count: c,
    }).collect();
    edges.sort_by(|a, b| a.from.cmp(&b.from).then(a.to.cmp(&b.to)));

    AppDepGraph { nodes, edges }
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
    dag: Option<&DagData>,
    output_path: &Path,
    auth: &AuthConfig,
) -> Result<()> {
    let report_jobs: Vec<ReportJob<'_>> = jobs.iter().map(ReportJob::from_job).collect();
    let data_json = serde_json::to_string(&report_jobs)?;

    let report_apps: Vec<ReportAppItem<'_>> = app_inventory.iter().map(ReportAppItem::from_inventory).collect();
    let app_data_json = serde_json::to_string(&report_apps)?;

    let report_plan: Vec<ReportPlanItem<'_>> = plan.iter().map(ReportPlanItem::from_plan).collect();
    let plan_data_json = serde_json::to_string(&report_plan)?;

    let dag_json = match dag {
        Some(d) => serde_json::to_string(d)?,
        None => "null".to_string(),
    };

    let app_dep_json = match dag {
        Some(d) => serde_json::to_string(&build_app_dep_graph(jobs, d))?,
        None => "null".to_string(),
    };

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
        .replace("__DAG_DATA__", &dag_json)
        .replace("__APP_DEP_DATA__", &app_dep_json)
        .replace("__GEN_TIME__", &gen_time.to_string())
        .replace("__MSAL_CDN__", msal_cdn)
        .replace("__AUTH_STARTUP__", &auth_startup);

    fs::write(output_path, html)?;
    Ok(())
}
