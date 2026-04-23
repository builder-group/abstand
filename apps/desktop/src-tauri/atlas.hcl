env "local" {
  src = "file://src/modules/db/schema.sql"
  dev = "sqlite://dev?mode=memory"

  migration {
    dir = "file://migrations"
  }
}
