use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use std::path::PathBuf;
use std::fs;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DesignSave {
    pub id: i64,
    pub name: String,
    pub design_type: String,
    pub design_data: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScoreRecord {
    pub id: i64,
    pub mode: String,
    pub score: i64,
    pub shots: i64,
    pub hits: i64,
    pub created_at: String,
}

/// Simple in-memory database with JSON persistence.
/// For production, replace with rusqlite (blocked by network in sandbox).
pub struct Database {
    designs: Mutex<Vec<DesignSave>>,
    scores: Mutex<Vec<ScoreRecord>>,
    settings: Mutex<HashMap<String, String>>,
    next_id: Mutex<i64>,
    path: PathBuf,
}

impl Database {
    pub fn new(app_dir: PathBuf) -> Result<Self, String> {
        fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
        let db = Database {
            designs: Mutex::new(Vec::new()),
            scores: Mutex::new(Vec::new()),
            settings: Mutex::new(HashMap::new()),
            next_id: Mutex::new(1),
            path: app_dir,
        };
        db.load()?;
        Ok(db)
    }

    fn persist_path(&self) -> PathBuf {
        self.path.join("game_data.json")
    }

    fn save(&self) -> Result<(), String> {
        use serde::Serialize;
        #[derive(Serialize)]
        struct Persist {
            designs: Vec<DesignSave>,
            scores: Vec<ScoreRecord>,
            settings: HashMap<String, String>,
            next_id: i64,
        }
        let data = Persist {
            designs: self.designs.lock().map_err(|e| e.to_string())?.clone(),
            scores: self.scores.lock().map_err(|e| e.to_string())?.clone(),
            settings: self.settings.lock().map_err(|e| e.to_string())?.clone(),
            next_id: *self.next_id.lock().map_err(|e| e.to_string())?,
        };
        let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
        fs::write(self.persist_path(), json).map_err(|e| e.to_string())
    }

    fn load(&self) -> Result<(), String> {
        let p = self.persist_path();
        if !p.exists() {
            return Ok(());
        }
        let json = fs::read_to_string(&p).map_err(|e| e.to_string())?;
        #[derive(Deserialize)]
        struct Persist {
            designs: Vec<DesignSave>,
            scores: Vec<ScoreRecord>,
            settings: HashMap<String, String>,
            next_id: i64,
        }
        let data: Persist = serde_json::from_str(&json).map_err(|e| e.to_string())?;
        *self.designs.lock().map_err(|e| e.to_string())? = data.designs;
        *self.scores.lock().map_err(|e| e.to_string())? = data.scores;
        *self.settings.lock().map_err(|e| e.to_string())? = data.settings;
        *self.next_id.lock().map_err(|e| e.to_string())? = data.next_id;
        Ok(())
    }

    pub fn save_design(&self, name: &str, design_type: &str, data: &str) -> Result<i64, String> {
        let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        let mut id_lock = self.next_id.lock().map_err(|e| e.to_string())?;
        let id = *id_lock;
        *id_lock += 1;
        drop(id_lock);

        self.designs.lock().map_err(|e| e.to_string())?.push(DesignSave {
            id,
            name: name.to_string(),
            design_type: design_type.to_string(),
            design_data: data.to_string(),
            created_at: now,
        });
        self.save()?;
        Ok(id)
    }

    pub fn get_designs(&self) -> Result<Vec<DesignSave>, String> {
        let mut designs = self.designs.lock().map_err(|e| e.to_string())?.clone();
        designs.reverse();
        Ok(designs)
    }

    pub fn save_score(&self, mode: &str, score: i64, shots: i64, hits: i64) -> Result<i64, String> {
        let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        let mut id_lock = self.next_id.lock().map_err(|e| e.to_string())?;
        let id = *id_lock;
        *id_lock += 1;
        drop(id_lock);

        self.scores.lock().map_err(|e| e.to_string())?.push(ScoreRecord {
            id,
            mode: mode.to_string(),
            score,
            shots,
            hits,
            created_at: now,
        });
        self.save()?;
        Ok(id)
    }

    pub fn get_high_scores(&self, mode: &str, limit: i64) -> Result<Vec<ScoreRecord>, String> {
        let scores = self.scores.lock().map_err(|e| e.to_string())?;
        let mut filtered: Vec<ScoreRecord> = scores.iter()
            .filter(|s| s.mode == mode)
            .cloned()
            .collect();
        filtered.sort_by(|a, b| b.score.cmp(&a.score));
        filtered.truncate(limit as usize);
        Ok(filtered)
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>, String> {
        Ok(self.settings.lock().map_err(|e| e.to_string())?.get(key).cloned())
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<(), String> {
        self.settings.lock().map_err(|e| e.to_string())?.insert(key.to_string(), value.to_string());
        self.save()
    }
}
