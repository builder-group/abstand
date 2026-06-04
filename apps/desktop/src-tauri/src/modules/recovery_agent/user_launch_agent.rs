use std::{
    error::Error,
    fs,
    path::{Path, PathBuf},
    process::Command,
};

/// Controls a per-user launchd job backed by a plist in `~/Library/LaunchAgents`.
pub struct UserLaunchAgent {
    label: String,
    executable_path: PathBuf,
    arguments: Vec<String>,
    bundle_identifiers: Vec<String>,
    plist_path: PathBuf,
    log_dir: PathBuf,
}

impl UserLaunchAgent {
    pub fn new(config: UserLaunchAgentConfig) -> Self {
        return Self {
            label: config.label,
            executable_path: config.executable_path,
            arguments: config.arguments,
            bundle_identifiers: config.bundle_identifiers,
            plist_path: config.plist_path,
            log_dir: config.log_dir,
        };
    }

    pub fn enable(&self) -> Result<(), Box<dyn Error>> {
        self.validate_executable_path()?;
        let was_configured = self.is_configured();

        self.write_plist()?;

        if self.is_loaded()? {
            self.unload()?;
        }

        if let Err(error) = self.load() {
            if !was_configured && self.plist_path.exists() {
                fs::remove_file(&self.plist_path)?;
            }
            return Err(error);
        }

        return Ok(());
    }

    pub fn disable(&self) -> Result<(), Box<dyn Error>> {
        if self.is_loaded()? {
            self.unload()?;
        }

        if self.plist_path.exists() {
            fs::remove_file(&self.plist_path)?;
        }

        return Ok(());
    }

    pub fn is_configured(&self) -> bool {
        return self.plist_path.exists();
    }

    /// Returns whether launchd currently knows about this job in the user GUI domain.
    pub fn is_loaded(&self) -> Result<bool, Box<dyn Error>> {
        let service = format!("{}/{}", launchctl_domain()?, self.label);
        let output = Command::new("launchctl")
            .args(["print", service.as_str()])
            .output()?;

        return Ok(output.status.success());
    }

    pub fn plist_path(&self) -> &Path {
        return &self.plist_path;
    }

    fn write_plist(&self) -> Result<(), Box<dyn Error>> {
        if let Some(parent) = self.plist_path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::create_dir_all(&self.log_dir)?;

        fs::write(&self.plist_path, self.build_plist())?;
        return Ok(());
    }

    fn build_plist(&self) -> String {
        let mut program_arguments = vec![self.executable_path.to_string_lossy().to_string()];
        program_arguments.extend(self.arguments.iter().cloned());

        let stdout_path = self.log_dir.join("recovery-agent.log");
        let stderr_path = self.log_dir.join("recovery-agent.err.log");

        return format!(
            r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>{label}</string>
    <key>AssociatedBundleIdentifiers</key>
    <array>
{associated_bundle_identifiers}
    </array>
    <key>ProgramArguments</key>
    <array>
{program_arguments}
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>{stdout_path}</string>
    <key>StandardErrorPath</key>
    <string>{stderr_path}</string>
</dict>
</plist>
"#,
            label = escape_plist_text(&self.label),
            associated_bundle_identifiers = plist_string_array(&self.bundle_identifiers),
            program_arguments = plist_string_array(&program_arguments),
            stdout_path = escape_plist_text(&stdout_path.to_string_lossy()),
            stderr_path = escape_plist_text(&stderr_path.to_string_lossy()),
        );
    }

    fn load(&self) -> Result<(), Box<dyn Error>> {
        let domain = launchctl_domain()?;
        let plist_path = path_string(&self.plist_path)?;
        return launchctl(&["bootstrap", &domain, &plist_path]);
    }

    fn unload(&self) -> Result<(), Box<dyn Error>> {
        let domain = launchctl_domain()?;
        let plist_path = path_string(&self.plist_path)?;
        return launchctl(&["bootout", &domain, &plist_path]);
    }

    fn validate_executable_path(&self) -> Result<(), Box<dyn Error>> {
        if !self.executable_path.exists() {
            return Err(format!(
                "recovery agent executable does not exist: {}",
                self.executable_path.display()
            )
            .into());
        }

        if !self.executable_path.is_absolute() {
            return Err(format!(
                "recovery agent executable is not absolute: {}",
                self.executable_path.display()
            )
            .into());
        }

        return Ok(());
    }
}

pub struct UserLaunchAgentConfig {
    pub label: String,
    pub executable_path: PathBuf,
    pub arguments: Vec<String>,
    pub bundle_identifiers: Vec<String>,
    pub plist_path: PathBuf,
    pub log_dir: PathBuf,
}

fn path_string(path: &Path) -> Result<String, Box<dyn Error>> {
    return path
        .to_str()
        .map(|path| path.to_string())
        .ok_or_else(|| "path is not valid UTF-8".into());
}

fn plist_string_array(values: &[String]) -> String {
    return values
        .iter()
        .map(|value| format!("        <string>{}</string>", escape_plist_text(value)))
        .collect::<Vec<_>>()
        .join("\n");
}

fn escape_plist_text(value: &str) -> String {
    return value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;");
}

fn launchctl(args: &[&str]) -> Result<(), Box<dyn Error>> {
    let output = Command::new("launchctl").args(args).output()?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stderr = stderr.trim();
        if stderr.is_empty() {
            return Err(
                format!("launchctl {} exited with {}", args.join(" "), output.status).into(),
            );
        }

        return Err(format!("launchctl {} failed: {}", args.join(" "), stderr).into());
    }

    return Ok(());
}

fn launchctl_domain() -> Result<String, Box<dyn Error>> {
    let output = Command::new("id").arg("-u").output()?;
    if !output.status.success() {
        return Err("failed to resolve current user id".into());
    }

    let uid = String::from_utf8(output.stdout)?;
    return Ok(format!("gui/{}", uid.trim()));
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn escapes_plist_values() {
        let value = escape_plist_text("A&B <C> \"D\" 'E'");

        assert_eq!(value, "A&amp;B &lt;C&gt; &quot;D&quot; &apos;E&apos;");
    }

    #[test]
    fn resolves_plist_string_arrays() {
        let values = vec![
            "/Applications/Abstand.app".to_string(),
            "--flag".to_string(),
        ];

        assert_eq!(
            plist_string_array(&values),
            "        <string>/Applications/Abstand.app</string>\n        <string>--flag</string>"
        );
    }

    #[test]
    fn builds_launch_agent_plist() {
        let agent = UserLaunchAgent::new(UserLaunchAgentConfig {
            label: "com.buildergroup.abstand.test".to_string(),
            executable_path: PathBuf::from("/Applications/Abstand.app/Contents/MacOS/Abstand"),
            arguments: vec!["--recovery-agent".to_string()],
            bundle_identifiers: vec!["com.buildergroup.abstand".to_string()],
            plist_path: PathBuf::from("/Users/test/Library/LaunchAgents/com.test.plist"),
            log_dir: PathBuf::from("/Users/test/Library/Application Support/Abstand/logs"),
        });

        let plist = agent.build_plist();

        assert!(plist.contains("<string>com.buildergroup.abstand.test</string>"));
        assert!(plist.contains("<string>/Applications/Abstand.app/Contents/MacOS/Abstand</string>"));
        assert!(plist.contains("<string>--recovery-agent</string>"));
        assert!(plist.contains("<key>KeepAlive</key>"));
    }
}
