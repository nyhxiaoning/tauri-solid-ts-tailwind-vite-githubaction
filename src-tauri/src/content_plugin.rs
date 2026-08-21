use serde::de::DeserializeOwned;
use tauri::{plugin::{Builder, TauriPlugin}, Runtime};

#[cfg(target_os = "android")]
mod android_impl {
  use super::*;
  use tauri::plugin::PluginApi;
  use tauri::Manager;

  const PLUGIN_IDENTIFIER: &str = "com.lanshare.app";

  pub fn init<R: Runtime, C: DeserializeOwned>() -> TauriPlugin<R, C> {
    Builder::new("content-resolver")
      .setup(|app, api| {
        let handle = api
          .register_android_plugin(PLUGIN_IDENTIFIER, "ContentPlugin")
          .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
        app.manage(ContentPlugin(handle));
        Ok(())
      })
      .build()
  }

  pub struct ContentPlugin<R: Runtime>(pub tauri::plugin::PluginHandle<R>);

  impl<R: Runtime> ContentPlugin<R> {
    pub fn get_content_info(&self, uri: &str) -> Result<ContentInfo, String> {
      self
        .0
        .run_mobile_plugin("getContentInfo", serde_json::json!({ "uri": uri }))
        .map_err(|e| e.to_string())
    }
  }

  #[derive(serde::Deserialize, Clone, Debug)]
  pub struct ContentInfo {
    #[serde(default)]
    pub display_name: Option<String>,
    #[serde(default)]
    pub mime_type: Option<String>,
  }
}

#[cfg(target_os = "android")]
pub use android_impl::{init, ContentPlugin};

#[cfg(not(target_os = "android"))]
pub fn init<R: Runtime, C: DeserializeOwned>() -> TauriPlugin<R, C> {
  Builder::new("content-resolver").build()
}
