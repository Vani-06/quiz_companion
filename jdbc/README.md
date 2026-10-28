# JDBC client

A Java console client that connects to the same PostgreSQL database over JDBC and runs
retrieval, INSERT / UPDATE / DELETE, and the business-logic functions (`grade_quiz`,
`record_attempt`, `v_topic_strength`, `v_leaderboard`). It covers the ODBC/JDBC
connectivity requirement independently of the web API.

## Run it

1. Install a JDK (17 or newer).
2. Download the PostgreSQL JDBC driver into this folder:
   `postgresql-42.7.4.jar` from
   https://repo1.maven.org/maven2/org/postgresql/postgresql/42.7.4/postgresql-42.7.4.jar
   (jar files are git-ignored).
3. From the repository root, in PowerShell:

```powershell
$env:DB_URL = "jdbc:postgresql://localhost:5432/quiz_companion"
$env:DB_USER = "postgres"
java -cp jdbc\postgresql-42.7.4.jar jdbc\JdbcDemo.java
```

It prompts for the password unless `DB_PASSWORD` is set.

- No arguments: an interactive menu (list, add, rename, delete topics; list items; take a quiz; leaderboard).
- `--demo`: a scripted run of every operation, useful for screenshots.

The database must already be set up with `npm run db:setup`.
