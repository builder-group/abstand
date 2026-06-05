use std::process::Command;

#[tauri::command]
#[specta::specta]
pub fn is_accessibility_permission_granted() -> bool {
    #[cfg(target_os = "macos")]
    {
        return mado::is_accessibility_trusted();
    }

    #[cfg(not(target_os = "macos"))]
    {
        return false;
    }
}

#[tauri::command]
#[specta::specta]
pub fn open_accessibility_permission_settings() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
            .spawn()
            .map_err(|error| error.to_string())?;
        return Ok(());
    }

    #[cfg(not(target_os = "macos"))]
    {
        return Err("accessibility permission settings are only available on macOS".to_string());
    }
}
