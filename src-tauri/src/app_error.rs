use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Path error: {0}")]
    Path(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Extraction error: {0}")]
    Extraction(String),
    #[error("Network error: {0}")]
    Network(String),
    #[error("Process error: {0}")]
    Process(String),
    #[error("Search aborted")]
    DiscoveryAborted,
    #[error("Tray error: {0}")]
    Tray(String),
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

pub type AppResult<T> = Result<T, AppError>;
