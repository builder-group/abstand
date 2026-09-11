//! Parses Intention commands and sends them to the running desktop app.

use crate::cli::{
    args::ensure_no_args,
    command_name,
    control::{self, ControlRequest},
    error::CliError,
    time_range::parse_duration_ms,
};
use serde_json::{json, Value};
use std::{
    collections::HashSet,
    fs::File,
    io::{self, Read},
};

pub fn run(args: &[String]) -> Result<(), CliError> {
    if args.is_empty() || matches!(args[0].as_str(), "help" | "--help" | "-h") {
        print_help();
        return Ok(());
    }
    let request = parse_request(args)?;
    return execute(request);
}

pub fn status(args: &[String]) -> Result<(), CliError> {
    ensure_no_args("status", args)?;
    return execute(ControlRequest::Status);
}

fn execute(request: ControlRequest) -> Result<(), CliError> {
    let result = control::send(&request).map_err(CliError::new)?;
    println!(
        "{}",
        serde_json::to_string_pretty(&result).map_err(CliError::from_display)?
    );
    return Ok(());
}

fn parse_request(args: &[String]) -> Result<ControlRequest, CliError> {
    let (command, rest) = args
        .split_first()
        .ok_or_else(|| CliError::new("missing Intention command"))?;
    match command.as_str() {
        "list" => {
            ensure_no_args("intention list", rest)?;
            return Ok(ControlRequest::List);
        }
        "status" => {
            ensure_no_args("intention status", rest)?;
            return Ok(ControlRequest::Status);
        }
        "create" => {
            return Ok(ControlRequest::Create {
                params: parse_create(rest)?,
            })
        }
        "update" => {
            if rest.len() != 3 || rest[1] != "--file" {
                return Err(CliError::new(
                    "Usage: intention update <id> --file <path|->",
                ));
            }
            let id = parse_id(&rest[0])?;
            let mut params = read_json(&rest[2])?;
            let object = params
                .as_object_mut()
                .ok_or_else(|| CliError::new("Expected a JSON object"))?;
            object.insert("intentionId".into(), json!(id));
            return Ok(ControlRequest::Update { params });
        }
        "show" | "start" | "stop" | "delete" => {
            if rest.len() != 1 {
                return Err(CliError::new(format!("Usage: intention {} <id>", command)));
            }
            let id = parse_id(&rest[0])?;
            return Ok(match command.as_str() {
                "show" => ControlRequest::Show { id },
                "start" => ControlRequest::Start { id },
                "stop" => ControlRequest::Stop { id },
                _ => ControlRequest::Delete { id },
            });
        }
        _ => {
            return Err(CliError::unknown_command(
                "intention",
                command,
                format!("{} intention --help", command_name()),
            ))
        }
    }
}

fn parse_id(value: &str) -> Result<i64, CliError> {
    return value
        .parse::<i64>()
        .ok()
        .filter(|id| *id > 0)
        .ok_or_else(|| CliError::new("Intention ID must be a positive integer"));
}

fn parse_create(args: &[String]) -> Result<Value, CliError> {
    if args.first().map(String::as_str) == Some("--file") {
        if args.len() != 2 {
            return Err(CliError::new(
                "Use --file alone with a JSON path or - for stdin",
            ));
        }
        return read_json(&args[1]);
    }

    let mut name = None;
    let mut duration = None;
    let mut mode = "casual";
    let mut scope = None;
    let mut targets = Vec::new();
    let mut seen_options = HashSet::new();
    let mut index = 0;
    while index < args.len() {
        let option = args[index].as_str();
        let value = args
            .get(index + 1)
            .filter(|v| !v.starts_with("--"))
            .ok_or_else(|| CliError::new(format!("Missing value for {}", option)))?;
        let repeatable = matches!(
            option,
            "--allow-app" | "--block-app" | "--allow-site" | "--block-site"
        );
        if !repeatable && !seen_options.insert(option) {
            return Err(CliError::new(format!("Duplicate option: {}", option)));
        }
        match option {
            "--name" => name = Some(value.trim()),
            "--duration" => duration = Some(parse_duration_ms(value)?),
            "--mode" => {
                if !matches!(value.as_str(), "casual" | "balanced" | "strict") {
                    return Err(CliError::new("Mode must be casual, balanced, or strict"));
                }
                mode = value;
            }
            "--scope" => {
                scope = Some(match value.as_str() {
                    "allow" => "allowTargets",
                    "block" => "blockTargets",
                    _ => return Err(CliError::new("Scope must be allow or block")),
                });
            }
            "--allow-app" | "--block-app" => {
                let bundle_id = value.trim();
                if !bundle_id.contains('.') || bundle_id.chars().any(char::is_whitespace) {
                    return Err(CliError::new("App targets require a bundle ID, for example md.obsidian"));
                }
                targets.push(json!({
                    "type": "app", "action": if option == "--allow-app" { "allow" } else { "block" },
                    "stableId": bundle_id, "bundleId": bundle_id,
                }));
            }
            "--allow-site" | "--block-site" => targets.push(json!({
                "type": "website", "action": if option == "--allow-site" { "allow" } else { "block" },
                "hostname": value,
            })),
            _ => return Err(CliError::new(format!("Unknown create option: {}", option))),
        }
        index += 2;
    }
    let name = name
        .filter(|name| !name.is_empty())
        .ok_or_else(|| CliError::new("Missing non-empty --name"))?;
    let duration = duration.ok_or_else(|| CliError::new("Missing --duration, for example 30m"))?;
    if targets.is_empty() {
        return Err(CliError::new(
            "Choose at least one --allow-app, --block-app, --allow-site, or --block-site",
        ));
    }
    let has_allow = targets.iter().any(|target| target["action"] == "allow");
    let has_block = targets.iter().any(|target| target["action"] == "block");
    if has_allow && has_block && scope.is_none() {
        return Err(CliError::new(
            "Mixed allow/block targets require explicit --scope allow or --scope block",
        ));
    }
    let scope = scope.unwrap_or(if has_allow {
        "allowTargets"
    } else {
        "blockTargets"
    });
    return Ok(json!({
        "name": name,
        "behavior": {
            "type": "block", "enforcementMode": mode, "balancedDelayMs": 15000,
            "scope": scope, "targets": targets,
        },
        "conditions": [
            { "transition": "start", "rule": { "type": "manual" } },
            { "transition": "end", "rule": { "type": "afterTransition", "anchorTransition": "start", "offsetMs": duration } },
        ],
    }));
}

fn read_json(path: &str) -> Result<Value, CliError> {
    let reader: Box<dyn Read> = if path == "-" {
        Box::new(io::stdin())
    } else {
        Box::new(File::open(path).map_err(CliError::from_display)?)
    };
    let mut bytes = Vec::new();
    reader
        .take(1024 * 1024 + 1)
        .read_to_end(&mut bytes)
        .map_err(CliError::from_display)?;
    if bytes.len() > 1024 * 1024 {
        return Err(CliError::new("JSON input exceeds 1 MiB"));
    }
    return serde_json::from_slice(&bytes).map_err(CliError::from_display);
}

fn print_help() {
    println!("Usage:
  {command} intention list
  {command} intention status
  {command} intention show <id>
  {command} intention create --name <name> --duration <30m> <targets> [--mode casual|balanced|strict]
  {command} intention create --file <path|->
  {command} intention update <id> --file <path|->
  {command} intention start <id>
  {command} intention stop <id>
  {command} intention delete <id>

Targets (repeatable):
  --allow-app <bundle-id>  Allow an app, for example md.obsidian.
  --block-app <bundle-id>  Block an app, for example com.apple.Safari.
  --allow-site <hostname> Allow a website.
  --block-site <hostname> Block a website.
  --scope allow|block     Required when mixing allow and block targets.

Create defaults to Casual enforcement and manual start. Creation does not start a session.
Durations require a suffix: ms, s, m, h, or d. All successful commands print JSON.
The desktop app with CLI control must be running. Strict active blocks cannot be stopped early.
Active Balanced blocks require GUI confirmation for early stopping or weakening.
Website blocking is not a network firewall; it does not disconnect the internet.", command = command_name());
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::modules::intentions::commands::CreateIntentionParams;

    fn args(values: &[&str]) -> Vec<String> {
        return values.iter().map(|value| value.to_string()).collect();
    }

    #[test]
    fn obsidian_profile_has_manual_start_and_timed_casual_end() {
        let request = parse_request(&args(&[
            "create",
            "--name",
            "Nauka własna",
            "--duration",
            "30m",
            "--allow-app",
            "md.obsidian",
        ]))
        .unwrap();
        let ControlRequest::Create { params } = request else {
            panic!("expected create")
        };
        assert_eq!(params["behavior"]["scope"], "allowTargets");
        assert_eq!(params["behavior"]["enforcementMode"], "casual");
        assert_eq!(params["conditions"][0]["rule"]["type"], "manual");
        assert_eq!(params["conditions"][1]["rule"]["offsetMs"], 1_800_000);
        serde_json::from_value::<CreateIntentionParams>(params).unwrap();
    }

    #[test]
    fn repeated_targets_are_preserved_and_mixed_scope_is_explicit() {
        let values = args(&[
            "--name",
            "Test",
            "--duration",
            "5m",
            "--block-app",
            "com.apple.Safari",
            "--allow-app",
            "md.obsidian",
        ]);
        assert!(parse_create(&values).is_err());
        let mut values = values;
        values.extend(args(&["--scope", "block"]));
        let params = parse_create(&values).unwrap();
        assert_eq!(params["behavior"]["targets"].as_array().unwrap().len(), 2);
        assert_eq!(params["behavior"]["scope"], "blockTargets");
    }

    #[test]
    fn invalid_commands_never_reach_the_running_app() {
        for values in [
            vec!["start", "0"],
            vec!["stop", "-1"],
            vec!["delete", "1", "--force"],
            vec!["list", "unexpected"],
            vec!["unknown"],
            vec![
                "create",
                "--name",
                "Test",
                "--duration",
                "0m",
                "--allow-app",
                "md.obsidian",
            ],
            vec![
                "create",
                "--name",
                "Test",
                "--duration",
                "999999999999999999d",
                "--allow-app",
                "md.obsidian",
            ],
            vec!["create", "--name", "Test", "--name", "Again"],
            vec!["create", "--name", "Test", "--duration", "5m"],
            vec![
                "create",
                "--name",
                "Test",
                "--duration",
                "5m",
                "--allow-app",
                "Obsidian",
            ],
        ] {
            assert!(
                parse_request(&args(&values)).is_err(),
                "accepted {:?}",
                values
            );
        }
    }
}
