fn main() {
    // Note: Embedded sqlx migrations need a rebuild when SQL files are added or changed
    println!("cargo:rerun-if-changed=migrations");

    tauri_build::build();

    // Note: A development app can use a release build, so derive identity from Tauri config
    let (config, _) = tauri_codegen::get_config(std::path::Path::new("tauri.conf.json"))
        .expect("Failed to read Tauri config");
    println!(
        "cargo:rustc-env=ABSTAND_BUNDLE_IDENTIFIER={}",
        config.identifier
    );
}
