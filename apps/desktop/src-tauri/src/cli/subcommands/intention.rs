//! Parses Intention commands and sends them to the running app.

use crate::{
    cli::{
        args::ensure_no_args,
        command_name,
        control::{self, ControlRequest},
        error::CliError,
        time_range::parse_duration_ms,
    },
    modules::intentions::{
        commands::{
            CreateIntentionParams, WriteIntentionBehaviorParams,
            WriteIntentionBlockAppTargetParams, WriteIntentionBlockParams,
            WriteIntentionBlockTargetParams, WriteIntentionBlockWebsiteTargetParams,
            WriteIntentionConditionParams, WriteIntentionConditionRuleParams,
        },
        intention::{
            IntentionBlockScope, IntentionBlockTargetAction, IntentionConditionAfterTransitionRule,
            IntentionConditionTransition, IntentionEnforcementMode,
        },
    },
};
use std::collections::HashSet;

pub const COMMAND: &str = "intention";

pub fn run(args: &[String]) -> Result<(), CliError> {
    if args.is_empty()
        || args
            .first()
            .is_some_and(|arg| arg == "help" || arg == "--help" || arg == "-h")
    {
        print_help();
        return Ok(());
    }

    let request = parse_request(args)?;
    let result = control::send(&request).map_err(CliError::new)?;
    let json = serde_json::to_string_pretty(&result).map_err(CliError::from_display)?;
    println!("{}", json);
    return Ok(());
}

fn parse_request(args: &[String]) -> Result<ControlRequest, CliError> {
    let (command, command_args) = args
        .split_first()
        .ok_or_else(|| CliError::new("missing Intention command"))?;

    return match command.as_str() {
        "list" => {
            ensure_no_args("intention list", command_args)?;
            Ok(ControlRequest::ListIntentions)
        }
        "show" | "start" | "stop" | "delete" => {
            let intention_id = parse_single_id(command, command_args)?;
            Ok(match command.as_str() {
                "show" => ControlRequest::GetIntention { intention_id },
                "start" => ControlRequest::StartIntention { intention_id },
                "stop" => ControlRequest::StopIntention { intention_id },
                _ => ControlRequest::DeleteIntention { intention_id },
            })
        }
        "create" => Ok(ControlRequest::CreateIntention {
            params: parse_create(command_args)?,
        }),
        _ => Err(CliError::unknown_command(
            COMMAND,
            command,
            format!("{} intention --help", command_name()),
        )),
    };
}

fn parse_single_id(command: &str, args: &[String]) -> Result<i64, CliError> {
    if args.len() != 1 {
        return Err(CliError::new(format!("Usage: intention {} <id>", command)));
    }

    return args[0]
        .parse::<i64>()
        .ok()
        .filter(|id| *id > 0)
        .ok_or_else(|| CliError::new("Intention ID must be a positive integer"));
}

fn parse_create(args: &[String]) -> Result<CreateIntentionParams, CliError> {
    let mut name = None;
    let mut duration_ms = None;
    let mut enforcement_mode = IntentionEnforcementMode::Casual;
    let mut scope = None;
    let mut targets = Vec::new();
    let mut seen_options = HashSet::new();
    let mut index = 0;

    while index < args.len() {
        let option = args[index].as_str();
        let value = args
            .get(index + 1)
            .filter(|value| !value.starts_with("--"))
            .ok_or_else(|| CliError::new(format!("Missing value for {}", option)))?;
        let repeatable = matches!(
            option,
            "--allow-app" | "--block-app" | "--allow-site" | "--block-site"
        );
        if !repeatable && !seen_options.insert(option) {
            return Err(CliError::new(format!("Duplicate option: {}", option)));
        }

        match option {
            "--name" => name = Some(value.trim().to_string()),
            "--duration" => duration_ms = Some(parse_duration_ms(value)?),
            "--mode" => enforcement_mode = parse_enforcement_mode(value)?,
            "--scope" => scope = Some(parse_scope(value)?),
            "--allow-app" | "--block-app" => {
                targets.push(parse_app_target(option, value)?);
            }
            "--allow-site" | "--block-site" => {
                targets.push(WriteIntentionBlockTargetParams::Website(
                    WriteIntentionBlockWebsiteTargetParams {
                        action: parse_target_action(option),
                        hostname: value.to_string(),
                        path: None,
                        name: None,
                        icon: None,
                        color: None,
                    },
                ));
            }
            _ => return Err(CliError::new(format!("Unknown create option: {}", option))),
        }
        index += 2;
    }

    let name = name
        .filter(|name| !name.is_empty())
        .ok_or_else(|| CliError::new("Missing non-empty --name"))?;
    let duration_ms =
        duration_ms.ok_or_else(|| CliError::new("Missing --duration, for example 30m"))?;
    if targets.is_empty() {
        return Err(CliError::new(
            "Choose at least one --allow-app, --block-app, --allow-site, or --block-site",
        ));
    }

    let has_allow = targets
        .iter()
        .any(|target| target_action(target) == IntentionBlockTargetAction::Allow);
    let has_block = targets
        .iter()
        .any(|target| target_action(target) == IntentionBlockTargetAction::Block);
    if has_allow && has_block && scope.is_none() {
        return Err(CliError::new(
            "Mixed allow/block targets require explicit --scope allow or --scope block",
        ));
    }
    let scope = scope.unwrap_or(if has_allow {
        IntentionBlockScope::AllowTargets
    } else {
        IntentionBlockScope::BlockTargets
    });

    return Ok(CreateIntentionParams {
        name,
        behavior: WriteIntentionBehaviorParams::Block(WriteIntentionBlockParams {
            enforcement_mode,
            balanced_delay_ms: 15_000,
            scope,
            targets,
        }),
        conditions: vec![
            WriteIntentionConditionParams {
                transition: IntentionConditionTransition::Start,
                rule: WriteIntentionConditionRuleParams::Manual,
            },
            WriteIntentionConditionParams {
                transition: IntentionConditionTransition::End,
                rule: WriteIntentionConditionRuleParams::AfterTransition(
                    IntentionConditionAfterTransitionRule {
                        anchor_transition: IntentionConditionTransition::Start,
                        offset_ms: duration_ms,
                    },
                ),
            },
        ],
    });
}

fn parse_enforcement_mode(value: &str) -> Result<IntentionEnforcementMode, CliError> {
    return match value {
        "casual" => Ok(IntentionEnforcementMode::Casual),
        "balanced" => Ok(IntentionEnforcementMode::Balanced),
        "strict" => Ok(IntentionEnforcementMode::Strict),
        _ => Err(CliError::new("Mode must be casual, balanced, or strict")),
    };
}

fn parse_scope(value: &str) -> Result<IntentionBlockScope, CliError> {
    return match value {
        "allow" => Ok(IntentionBlockScope::AllowTargets),
        "block" => Ok(IntentionBlockScope::BlockTargets),
        _ => Err(CliError::new("Scope must be allow or block")),
    };
}

fn parse_app_target(
    option: &str,
    value: &str,
) -> Result<WriteIntentionBlockTargetParams, CliError> {
    let bundle_id = value.trim();
    if !bundle_id.contains('.') || bundle_id.chars().any(char::is_whitespace) {
        return Err(CliError::new(
            "App targets require a bundle ID, for example md.obsidian",
        ));
    }

    return Ok(WriteIntentionBlockTargetParams::App(
        WriteIntentionBlockAppTargetParams {
            action: parse_target_action(option),
            stable_id: bundle_id.to_string(),
            name: None,
            bundle_id: Some(bundle_id.to_string()),
            process_path: None,
            icon: None,
            color: None,
        },
    ));
}

fn target_action(target: &WriteIntentionBlockTargetParams) -> IntentionBlockTargetAction {
    return match target {
        WriteIntentionBlockTargetParams::App(app) => app.action,
        WriteIntentionBlockTargetParams::Website(website) => website.action,
    };
}

fn parse_target_action(option: &str) -> IntentionBlockTargetAction {
    return if option.starts_with("--allow-") {
        IntentionBlockTargetAction::Allow
    } else {
        IntentionBlockTargetAction::Block
    };
}

fn print_help() {
    println!(
        "Usage:
  {0} intention list
  {0} intention show <id>
  {0} intention create --name <name> --duration <30m> <targets> [options]
  {0} intention start <id>
  {0} intention stop <id>
  {0} intention delete <id>

Targets (repeatable):
  --allow-app <bundle-id>   Allow an app, for example md.obsidian.
  --block-app <bundle-id>   Block an app, for example com.apple.Safari.
  --allow-site <hostname>   Allow a website.
  --block-site <hostname>   Block a website.

Options:
  --mode casual|balanced|strict   Defaults to casual.
  --scope allow|block             Required when mixing allow and block targets.

Create uses a manual start and ends after the given duration.
Durations require a positive integer followed by ms, s, m, h, or d.
Active Strict Intentions cannot be stopped or deleted.
Stopping or deleting an active Balanced Intention requires confirmation in the app.
The desktop app must be running. All successful commands print JSON.",
        command_name()
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    fn args(values: &[&str]) -> Vec<String> {
        return values.iter().map(|value| value.to_string()).collect();
    }

    #[test]
    fn create_defaults_to_a_manual_timed_casual_intention() {
        let request = parse_request(&args(&[
            "create",
            "--name",
            "Study",
            "--duration",
            "30m",
            "--allow-app",
            "md.obsidian",
        ]))
        .unwrap();
        let ControlRequest::CreateIntention { params } = request else {
            panic!("expected create request")
        };

        assert_eq!(params.name, "Study");
        let WriteIntentionBehaviorParams::Block(block) = params.behavior else {
            panic!("expected block behavior")
        };
        assert_eq!(block.enforcement_mode, IntentionEnforcementMode::Casual);
        assert_eq!(block.scope, IntentionBlockScope::AllowTargets);
        assert_eq!(block.targets.len(), 1);
        let WriteIntentionConditionRuleParams::AfterTransition(rule) = &params.conditions[1].rule
        else {
            panic!("expected timed end condition")
        };
        assert_eq!(rule.offset_ms, 1_800_000);
    }

    #[test]
    fn mixed_targets_require_an_explicit_scope() {
        let values = args(&[
            "--name",
            "Study",
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
        let WriteIntentionBehaviorParams::Block(block) = params.behavior else {
            panic!("expected block behavior")
        };
        assert_eq!(block.targets.len(), 2);
        assert_eq!(block.scope, IntentionBlockScope::BlockTargets);
    }

    #[test]
    fn invalid_commands_are_rejected_before_connecting() {
        for values in [
            vec!["start", "0"],
            vec!["stop", "-1"],
            vec!["delete", "1", "--force"],
            vec!["list", "unexpected"],
            vec!["status"],
            vec!["update", "1"],
            vec!["unknown"],
            vec![
                "create",
                "--name",
                "Study",
                "--duration",
                "0m",
                "--allow-app",
                "md.obsidian",
            ],
            vec![
                "create",
                "--name",
                "Study",
                "--duration",
                "999999999999999999d",
                "--allow-app",
                "md.obsidian",
            ],
            vec!["create", "--name", "Study", "--name", "Again"],
            vec!["create", "--name", "Study", "--duration", "5m"],
            vec![
                "create",
                "--name",
                "Study",
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
