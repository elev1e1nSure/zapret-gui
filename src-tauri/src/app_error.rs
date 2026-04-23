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

impl AppError {
    /// Machine-readable discriminant sent to the JS frontend.
    /// Must stay in sync with `DISCOVERY_ABORTED_TYPE` in src/config.js.
    pub fn error_type(&self) -> &'static str {
        match self {
            AppError::Path(_) => "Path",
            AppError::Io(_) => "Io",
            AppError::Extraction(_) => "Extraction",
            AppError::Network(_) => "Network",
            AppError::Process(_) => "Process",
            AppError::DiscoveryAborted => "DiscoveryAborted",
            AppError::Tray(_) => "Tray",
        }
    }
}

/// Serializes as `{ "type": "...", "message": "..." }` so the JS side can
/// branch on `error.type` instead of parsing the human-readable message string.
impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeMap;
        let mut map = serializer.serialize_map(Some(2))?;
        map.serialize_entry("type", self.error_type())?;
        map.serialize_entry("message", &self.to_string())?;
        map.end()
    }
}

pub type AppResult<T> = Result<T, AppError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn all_variants_have_non_empty_error_type() {
        use std::io;
        let variants: &[AppError] = &[
            AppError::Path("x".into()),
            AppError::Io(io::Error::new(io::ErrorKind::Other, "x")),
            AppError::Extraction("x".into()),
            AppError::Network("x".into()),
            AppError::Process("x".into()),
            AppError::DiscoveryAborted,
            AppError::Tray("x".into()),
        ];
        for v in variants {
            assert!(!v.error_type().is_empty(), "variant has empty error_type: {v:?}");
        }
    }

    #[test]
    fn discovery_aborted_serializes_as_typed_json_object() {
        let err = AppError::DiscoveryAborted;
        let json = serde_json::to_string(&err).unwrap();
        let val: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(val["type"], "DiscoveryAborted", "type mismatch");
        assert_eq!(val["message"], "Search aborted", "message mismatch");
    }

    #[test]
    fn process_error_embeds_original_message() {
        let inner = "winws.exe exited with code 5".to_string();
        let err = AppError::Process(inner.clone());
        let val: serde_json::Value = serde_json::to_string(&err)
            .and_then(|s| serde_json::from_str(&s).map_err(Into::into))
            .unwrap();
        assert_eq!(val["type"], "Process");
        assert!(
            val["message"].as_str().unwrap().contains(&inner),
            "inner message not present in serialized output"
        );
    }

    #[test]
    fn every_variant_serializes_with_type_and_message_keys() {
        use std::io;
        let variants: &[AppError] = &[
            AppError::Path("x".into()),
            AppError::Io(io::Error::new(io::ErrorKind::Other, "x")),
            AppError::Process("x".into()),
            AppError::Network("x".into()),
            AppError::DiscoveryAborted,
        ];
        for v in variants {
            let json = serde_json::to_string(v).unwrap();
            let val: serde_json::Value = serde_json::from_str(&json).unwrap();
            assert!(val.get("type").is_some(), "missing 'type' key for {v:?}");
            assert!(val.get("message").is_some(), "missing 'message' key for {v:?}");
        }
    }
}
