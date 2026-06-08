use crate::app_error::{AppError, AppResult};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use futures::StreamExt;

const BASE_URL: &str = "http://127.0.0.1:7432/api";

#[derive(Debug)]
pub enum SseEvent {
    Progress { strategy: String, current: u64, total: u64 },
    Success { strategy: String },
    Error { message: String },
}

fn build_client() -> Client {
    Client::builder()
        .timeout(Duration::from_secs(10))
        .connect_timeout(Duration::from_secs(2))
        .build()
        .expect("Failed to build HTTP client")
}

fn build_sse_client() -> Client {
    Client::builder()
        .no_gzip()
        .no_deflate()
        .no_brotli()
        .connect_timeout(Duration::from_secs(2))
        .build()
        .expect("Failed to build SSE client")
}

#[derive(Debug, Deserialize, Serialize)]
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

pub async fn start_find<F>(mut callback: F) -> AppResult<String>
where
    F: FnMut(SseEvent),
{
    let client = build_sse_client();
    let url = format!("{}/find", BASE_URL);

    eprintln!("[find] POST /find");
    let response = client
        .post(&url)
        .send()
        .await
        .map_err(|e| AppError::Core(format!("Failed to POST /find: {}", e)))?;

    if !response.status().is_success() {
        eprintln!("[find] POST /find failed: {}", response.status());
        return Err(AppError::Core(format!(
            "POST /find returned status: {}",
            response.status()
        )));
    }

    eprintln!("[find] stream opened, waiting for events...");
    let started = std::time::Instant::now();

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk_result) = stream.next().await {
        match chunk_result {
            Ok(bytes) => {
                buffer.push_str(&String::from_utf8_lossy(&bytes));

                // Process only complete lines ending with \n
                while let Some(pos) = buffer.find('\n') {
                    let line = buffer[..pos].trim().to_string();
                    buffer = buffer[pos + 1..].to_string();

                    if let Some(json_str) = line.strip_prefix("data: ") {
                        eprintln!("[find] +{:.1}s SSE: {}", started.elapsed().as_secs_f32(), json_str);
                        if let Ok(value) = serde_json::from_str::<serde_json::Value>(json_str) {
                            if let Some(event_type) = value.get("type").and_then(|v| v.as_str()) {
                                match event_type {
                                    "progress" => {
                                        if let Some(data) = value.get("data") {
                                            if let (Some(strategy), Some(current), Some(total)) = (
                                                data.get("strategy").and_then(|v| v.as_str()),
                                                data.get("current").and_then(|v| v.as_u64()),
                                                data.get("total").and_then(|v| v.as_u64()),
                                            ) {
                                                eprintln!("[find] progress {}/{}: {}", current, total, strategy);
                                                callback(SseEvent::Progress {
                                                    strategy: strategy.to_string(),
                                                    current,
                                                    total,
                                                });
                                            }
                                        }
                                    }
                                    "success" => {
                                        if let Some(data) = value.get("data") {
                                            if let Some(strategy_obj) = data.get("strategy") {
                                                if let Some(strategy_name) = strategy_obj.get("Name").and_then(|v| v.as_str()) {
                                                    eprintln!("[find] success: {} (total {:.1}s)", strategy_name, started.elapsed().as_secs_f32());
                                                    callback(SseEvent::Success {
                                                        strategy: strategy_name.to_string(),
                                                    });
                                                    // Start the found strategy
                                                    let client = build_client();
                                                    let url = format!("{}/start", BASE_URL);
                                                    let _ = client.post(&url).send().await;
                                                    return Ok(strategy_name.to_string());
                                                }
                                            }
                                        }
                                    }
                                    "error" => {
                                        if let Some(message) = value.get("message").and_then(|v| v.as_str()) {
                                            eprintln!("[find] error event: {}", message);
                                            callback(SseEvent::Error {
                                                message: message.to_string(),
                                            });
                                            return Err(AppError::Core(message.to_string()));
                                        }
                                    }
                                    other => {
                                        eprintln!("[find] unknown event type: {}", other);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            Err(_) => continue,
        }
    }

    eprintln!("[find] stream ended without success after {:.1}s", started.elapsed().as_secs_f32());
    Err(AppError::Core("Discovery stream ended without success".to_string()))
}

pub async fn wait_idle(timeout_secs: u64) -> AppResult<()> {
    let timeout = Duration::from_secs(timeout_secs);
    let start = std::time::Instant::now();

    while start.elapsed() < timeout {
        match get_status().await {
            Ok(s) if !s.operation_in_progress => return Ok(()),
            Ok(s) => {
                eprintln!("[wait_idle] busy ({:?}), waiting...", s.operation_type);
            }
            Err(_) => {}
        }
        tokio::time::sleep(Duration::from_millis(300)).await;
    }

    Err(AppError::Core(format!(
        "Core still busy after {} seconds",
        timeout_secs
    )))
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
