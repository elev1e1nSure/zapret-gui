use crate::app_error::{AppError, AppResult};
use reqwest::Client;
use serde::Deserialize;
use std::time::Duration;

const BASE_URL: &str = "http://127.0.0.1:7432/api";

fn build_client() -> Client {
    Client::builder()
        .timeout(Duration::from_secs(10))
        .connect_timeout(Duration::from_secs(2))
        .build()
        .expect("Failed to build HTTP client")
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct CoreStatus {
    pub winws_running: bool,
    pub watchdog_running: bool,
    pub current_strategy: Option<String>,
    pub operation_in_progress: bool,
    pub operation_type: Option<String>,
}

pub async fn get_status() -> AppResult<CoreStatus> {
    let client = build_client();
    let url = format!("{}/status", BASE_URL);

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| AppError::Core(format!("Failed to GET /status: {}", e)))?;

    if !response.status().is_success() {
        return Err(AppError::Core(format!(
            "GET /status returned status: {}",
            response.status()
        )));
    }

    response
        .json()
        .await
        .map_err(|e| AppError::Core(format!("Failed to deserialize status: {}", e)))
}

pub async fn start_best() -> AppResult<()> {
    let client = build_client();
    let url = format!("{}/start", BASE_URL);

    let response = client
        .post(&url)
        .send()
        .await
        .map_err(|e| AppError::Core(format!("Failed to POST /start: {}", e)))?;

    if !response.status().is_success() {
        return Err(AppError::Process(format!(
            "POST /start returned status: {}",
            response.status()
        )));
    }

    Ok(())
}

pub async fn stop() -> AppResult<()> {
    let client = build_client();
    let url = format!("{}/stop", BASE_URL);

    let response = client
        .post(&url)
        .send()
        .await
        .map_err(|e| AppError::Core(format!("Failed to POST /stop: {}", e)))?;

    if !response.status().is_success() {
        return Err(AppError::Core(format!(
            "POST /stop returned status: {}",
            response.status()
        )));
    }

    Ok(())
}

#[allow(dead_code)]
pub async fn start_find() -> AppResult<reqwest::Response> {
    let client = build_client();
    let url = format!("{}/find", BASE_URL);

    let response = client
        .post(&url)
        .send()
        .await
        .map_err(|e| AppError::Core(format!("Failed to POST /find: {}", e)))?;

    if !response.status().is_success() {
        return Err(AppError::Core(format!(
            "POST /find returned status: {}",
            response.status()
        )));
    }

    Ok(response)
}

pub async fn wait_ready(timeout_secs: u64) -> AppResult<()> {
    let client = build_client();
    let url = format!("{}/health", BASE_URL);
    let timeout = Duration::from_secs(timeout_secs);
    let start = std::time::Instant::now();

    while start.elapsed() < timeout {
        let response = client.get(&url).send().await;

        if let Ok(resp) = response {
            if resp.status().is_success() {
                return Ok(());
            }
        }

        tokio::time::sleep(Duration::from_millis(200)).await;
    }

    Err(AppError::Core(format!(
        "Core API not ready after {} seconds",
        timeout_secs
    )))
}
