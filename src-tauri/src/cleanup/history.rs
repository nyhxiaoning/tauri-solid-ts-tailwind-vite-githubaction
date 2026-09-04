use super::{ActionResult, CleanupAction, Tier};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Mutex, MutexGuard};
use std::time::{SystemTime, UNIX_EPOCH};

static HISTORY_LOCK: Mutex<()> = Mutex::new(());
static RECORD_SEQUENCE: AtomicU64 = AtomicU64::new(0);

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct HistoryRecord {
    pub record_id: String,
    pub timestamp_ms: u128,
    pub action_id: String,
    pub action_name: String,
    pub tier: Option<Tier>,
    pub status: String,
    pub before_gb: Option<f64>,
    pub after_gb: Option<f64>,
    pub released_gb: f64,
    pub estimated: bool,
    pub message: String,
}

impl HistoryRecord {
    pub fn from_action_result(action: Option<&CleanupAction>, result: &ActionResult) -> Self {
        let timestamp_ms = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis();
        Self::from_action_result_at(action, result, timestamp_ms)
    }

    fn from_action_result_at(
        action: Option<&CleanupAction>,
        result: &ActionResult,
        timestamp_ms: u128,
    ) -> Self {
        let sequence = RECORD_SEQUENCE.fetch_add(1, Ordering::Relaxed);
        Self {
            record_id: format!("{timestamp_ms}-{}-{sequence}", std::process::id()),
            timestamp_ms,
            action_id: result.id.clone(),
            action_name: result.name.clone(),
            tier: action.map(|action| action.tier.clone()),
            status: result.status.clone(),
            before_gb: result.before_gb,
            after_gb: result.after_gb,
            released_gb: result.released_gb,
            estimated: result.estimated,
            message: result.message.clone(),
        }
    }
}

pub fn read_history(path: &Path) -> io::Result<Vec<HistoryRecord>> {
    let _guard = lock_history()?;
    read_history_unlocked(path)
}

fn read_history_unlocked(path: &Path) -> io::Result<Vec<HistoryRecord>> {
    match fs::read(path) {
        Ok(contents) => serde_json::from_slice(&contents)
            .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error)),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(Vec::new()),
        Err(error) => Err(error),
    }
}

pub fn append_history(path: &Path, record: HistoryRecord) -> io::Result<()> {
    let _guard = lock_history()?;
    let mut records = read_history_unlocked(path)?;
    records.insert(0, record);
    records.truncate(500);
    write_history_unlocked(path, &records)
}

pub fn clear_history(path: &Path) -> io::Result<()> {
    let _guard = lock_history()?;
    write_history_unlocked(path, &[])
}

fn lock_history() -> io::Result<MutexGuard<'static, ()>> {
    HISTORY_LOCK
        .lock()
        .map_err(|_| io::Error::other("cleanup history lock is poisoned"))
}

fn write_history_unlocked(path: &Path, records: &[HistoryRecord]) -> io::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let contents = serde_json::to_vec_pretty(&records)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    let temporary_path = temporary_path(path);
    fs::write(&temporary_path, contents)?;
    fs::rename(temporary_path, path)
}

fn temporary_path(path: &Path) -> PathBuf {
    let mut name = path.as_os_str().to_os_string();
    name.push(".tmp");
    PathBuf::from(name)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Barrier};

    fn sample_record(index: u128) -> HistoryRecord {
        HistoryRecord {
            record_id: format!("record-{index}"),
            timestamp_ms: index,
            action_id: "l1-01-npm".into(),
            action_name: "npm 缓存".into(),
            tier: Some(Tier::One),
            status: "success".into(),
            before_gb: Some(2.0),
            after_gb: Some(1.0),
            released_gb: 1.0,
            estimated: false,
            message: String::new(),
        }
    }

    #[test]
    fn history_round_trips_through_its_public_api() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("cleanup-history.json");

        append_history(&path, sample_record(1)).unwrap();

        assert_eq!(read_history(&path).unwrap(), vec![sample_record(1)]);
    }

    #[test]
    fn newest_history_is_returned_first() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("cleanup-history.json");
        append_history(&path, sample_record(1)).unwrap();

        append_history(&path, sample_record(2)).unwrap();

        let records = read_history(&path).unwrap();
        assert_eq!(records[0].record_id, "record-2");
        assert_eq!(records[1].record_id, "record-1");
    }

    #[test]
    fn history_keeps_only_the_newest_five_hundred_records() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("cleanup-history.json");
        for index in 0..501 {
            append_history(&path, sample_record(index)).unwrap();
        }

        let records = read_history(&path).unwrap();
        assert_eq!(records.len(), 500);
        assert_eq!(records.first().unwrap().record_id, "record-500");
        assert_eq!(records.last().unwrap().record_id, "record-1");
    }

    #[test]
    fn concurrent_appends_retain_every_record_without_corruption() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("cleanup-history.json");
        let barrier = Arc::new(Barrier::new(32));

        std::thread::scope(|scope| {
            let mut handles = Vec::new();
            for index in 0..32 {
                let path = path.clone();
                let barrier = Arc::clone(&barrier);
                handles.push(scope.spawn(move || {
                    barrier.wait();
                    append_history(&path, sample_record(index))
                }));
            }
            for handle in handles {
                handle.join().unwrap().unwrap();
            }
        });

        let records = read_history(&path).unwrap();
        assert_eq!(records.len(), 32);
        let ids: std::collections::HashSet<_> =
            records.iter().map(|record| &record.record_id).collect();
        assert_eq!(ids.len(), 32);
    }

    #[test]
    fn concurrent_append_and_clear_never_corrupt_history() {
        let dir = tempfile::tempdir().unwrap();
        for round in 0..32 {
            let path = dir.path().join(format!("history-{round}.json"));
            append_history(&path, sample_record(0)).unwrap();
            let barrier = Arc::new(Barrier::new(2));
            std::thread::scope(|scope| {
                let append_path = path.clone();
                let append_barrier = Arc::clone(&barrier);
                let append = scope.spawn(move || {
                    append_barrier.wait();
                    append_history(&append_path, sample_record(1))
                });
                let clear_path = path.clone();
                let clear_barrier = Arc::clone(&barrier);
                let clear = scope.spawn(move || {
                    clear_barrier.wait();
                    clear_history(&clear_path)
                });
                append.join().unwrap().unwrap();
                clear.join().unwrap().unwrap();
            });

            let records = read_history(&path).unwrap();
            assert!(
                records.is_empty() || records == vec![sample_record(1)],
                "unexpected records after concurrent append/clear: {records:?}"
            );
            assert!(!temporary_path(&path).exists());
        }
    }

    #[test]
    fn malformed_history_is_reported_instead_of_discarded() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("cleanup-history.json");
        std::fs::write(&path, b"not json").unwrap();

        let error = read_history(&path).unwrap_err();

        assert_eq!(error.kind(), std::io::ErrorKind::InvalidData);
        assert_eq!(std::fs::read(&path).unwrap(), b"not json");
    }

    #[test]
    fn append_atomically_replaces_through_the_temporary_path() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("cleanup-history.json");
        let temporary_path = dir.path().join("cleanup-history.json.tmp");
        std::fs::write(&temporary_path, b"stale partial write").unwrap();

        append_history(&path, sample_record(1)).unwrap();

        assert_eq!(read_history(&path).unwrap(), vec![sample_record(1)]);
        assert!(!temporary_path.exists());
    }

    #[test]
    fn clear_history_leaves_an_empty_readable_history() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("cleanup-history.json");
        append_history(&path, sample_record(1)).unwrap();

        clear_history(&path).unwrap();

        assert!(read_history(&path).unwrap().is_empty());
        assert!(!dir.path().join("cleanup-history.json.tmp").exists());
    }

    #[test]
    fn action_results_become_complete_history_records() {
        let action = crate::cleanup::find_action("l1-01-npm").unwrap();
        let result = crate::cleanup::ActionResult {
            id: action.id.into(),
            name: action.name.into(),
            status: "success".into(),
            before_gb: Some(2.0),
            after_gb: Some(0.5),
            released_gb: 1.5,
            estimated: false,
            message: "完成".into(),
        };

        let record = HistoryRecord::from_action_result(Some(&action), &result);

        assert_eq!(record.action_id, result.id);
        assert_eq!(record.action_name, result.name);
        assert_eq!(record.tier, Some(Tier::One));
        assert_eq!(record.status, result.status);
        assert_eq!(record.before_gb, result.before_gb);
        assert_eq!(record.after_gb, result.after_gb);
        assert_eq!(record.released_gb, result.released_gb);
        assert_eq!(record.estimated, result.estimated);
        assert_eq!(record.message, result.message);
        assert!(record.timestamp_ms > 0);
        assert!(record.record_id.starts_with(&format!(
            "{}-{}-",
            record.timestamp_ms,
            std::process::id()
        )));
    }

    #[test]
    fn generated_ids_are_unique_even_with_the_same_timestamp() {
        let action = crate::cleanup::find_action("l1-01-npm").unwrap();
        let result = crate::cleanup::ActionResult {
            id: action.id.into(),
            name: action.name.into(),
            status: "success".into(),
            before_gb: None,
            after_gb: None,
            released_gb: 1.0,
            estimated: true,
            message: String::new(),
        };

        let ids: std::collections::HashSet<_> = (0..1_000)
            .map(|_| HistoryRecord::from_action_result_at(Some(&action), &result, 42).record_id)
            .collect();

        assert_eq!(ids.len(), 1_000);
    }
}
