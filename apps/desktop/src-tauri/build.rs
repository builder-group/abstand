fn main() {
    // Embedded sqlx migrations need a rebuild when SQL files are added or changed
    println!("cargo:rerun-if-changed=migrations");

    tauri_build::build()
}
