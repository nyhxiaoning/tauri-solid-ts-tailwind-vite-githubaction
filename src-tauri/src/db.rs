use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

/// Schema-agnostic document store: the frontend owns the data shape,
/// Rust only persists one opaque JSON document to disk.
pub struct DocumentStore {
    data: Mutex<serde_json::Value>,
    path: PathBuf,
}

impl DocumentStore {
    pub fn new(app_dir: PathBuf) -> Result<Self, String> {
        fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
        let path = app_dir.join("todo_data.json");
        let data = if path.exists() {
            let json = fs::read_to_string(&path).map_err(|e| e.to_string())?;
            serde_json::from_str(&json).map_err(|e| e.to_string())?
        } else {
            serde_json::Value::Null
        };
        Ok(DocumentStore {
            data: Mutex::new(data),
            path,
        })
    }

    pub fn load(&self) -> serde_json::Value {
        self.data
            .lock()
            .map(|d| d.clone())
            .unwrap_or(serde_json::Value::Null)
    }

    pub fn save(&self, value: serde_json::Value) -> Result<(), String> {
        let json = serde_json::to_string_pretty(&value).map_err(|e| e.to_string())?;
        // Write to a temp file first, then rename for atomicity.
        let tmp = self.path.with_extension("json.tmp");
        fs::write(&tmp, json).map_err(|e| e.to_string())?;
        fs::rename(&tmp, &self.path).map_err(|e| e.to_string())?;
        *self.data.lock().map_err(|e| e.to_string())? = value;
        Ok(())
    }
}
