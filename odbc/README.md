# ODBC client

A PowerShell console client that connects to the same PostgreSQL database through the
**PostgreSQL ODBC driver** (psqlODBC) using `System.Data.Odbc`. It runs retrieval, INSERT,
UPDATE, DELETE and the business-logic functions (`grade_quiz`, `record_attempt`,
`v_leaderboard`) with parameterised commands. It is the ODBC counterpart of
[`jdbc/JdbcDemo.java`](../jdbc/README.md) and needs nothing to be installed beyond the driver.

## Requirements

- Windows with the 64-bit **PostgreSQL ODBC driver** installed. Check with:

  ```powershell
  Get-OdbcDriver -Platform 64-bit | Where-Object Name -like 'PostgreSQL*'
  ```

  It is installed together with PostgreSQL by Stack Builder, or download psqlODBC from
  https://www.postgresql.org/ftp/odbc/releases/.
- The database set up with `npm run db:setup`.

## Run it

From the repository root, in PowerShell:

```powershell
$env:DB_PASSWORD = 'your-postgres-password'
.\odbc\OdbcDemo.ps1 -Demo
```

- With `-Demo` it runs every operation in turn. The quiz attempt is rolled back, so the sample
  data stays unchanged.
- Without `-Demo` it opens an interactive menu: list, add, rename and delete topics, list items,
  take a quiz, show the leaderboard.

Settings come from environment variables: `DB_HOST` (localhost), `DB_PORT` (5432),
`DB_NAME` (quiz_companion), `DB_USER` (postgres) and `DB_PASSWORD`. If `DB_PASSWORD` is not set,
the script asks for it with a hidden prompt.

If PowerShell refuses to run the script, allow local scripts for your user once:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## What the demo prints

1. Connection message naming the ODBC driver.
2. `SELECT` of the topic hierarchy.
3. `INSERT`, `UPDATE` and `DELETE` of a demo topic.
4. `grade_quiz()` and `record_attempt()` in one transaction, then the updated proficiency, then a rollback.
5. A rejected delete: trigger error `Topic 3 still has learning items` (SQLSTATE 23001).
6. The `v_leaderboard` view.
