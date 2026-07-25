use serde::Serialize;
use std::path::Path;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize)]
pub struct FileEntry {
    pub id: String,
    pub name: String,
    pub size: u64,
    pub ext: String,
    pub path: String,
}

#[derive(Debug, Default)]
pub struct FileManager {
    files: Vec<FileEntry>,
}

impl FileManager {
    pub fn new() -> Self {
        Self { files: Vec::new() }
    }

    pub fn add_file(&mut self, path_str: &str) -> Result<FileEntry, String> {
        let path = Path::new(path_str);
        if !path.exists() {
            return Err("File does not exist".to_string());
        }
        if !path.is_file() {
            return Err("Path is not a file".to_string());
        }

        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();

        let size = std::fs::metadata(path_str)
            .map_err(|e| e.to_string())?
            .len();

        let id = Uuid::new_v4().to_string();

        let entry = FileEntry {
            id,
            name,
            size,
            ext,
            path: path_str.to_string(),
        };

        self.files.push(entry.clone());
        Ok(entry)
    }

    pub fn remove_file(&mut self, id: &str) -> bool {
        let len = self.files.len();
        self.files.retain(|f| f.id != id);
        self.files.len() != len
    }

    pub fn get_file(&self, id: &str) -> Option<&FileEntry> {
        self.files.iter().find(|f| f.id == id)
    }

    pub fn list_files(&self) -> Vec<FileEntry> {
        self.files.clone()
    }

    pub fn clear(&mut self) {
        self.files.clear();
    }

    pub fn len(&self) -> usize {
        self.files.len()
    }
}