fn main() {
    #[cfg(target_os = "macos")]
    {
        use swift_rs::SwiftLinker;

        // Note: Rebuild Swift code when DEVELOPER_DIR selects a different Xcode
        println!("cargo:rerun-if-env-changed=DEVELOPER_DIR");

        SwiftLinker::new("12.0").with_package("Mado", "./").link();
    }
}
