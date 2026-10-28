<#
.SYNOPSIS
  ODBC console client for the Adaptive Learning Platform database.

.DESCRIPTION
  Connects to PostgreSQL through the PostgreSQL ODBC driver (psqlODBC) using
  System.Data.Odbc and runs retrieval, INSERT, UPDATE, DELETE and the
  business-logic functions with parameterised commands. The ODBC counterpart
  of jdbc/JdbcDemo.java.

  Settings come from environment variables:
    DB_HOST (localhost)  DB_PORT (5432)  DB_NAME (quiz_companion)  DB_USER (postgres)
    DB_PASSWORD (prompted for when not set)

.EXAMPLE
  .\odbc\OdbcDemo.ps1            # interactive menu
  .\odbc\OdbcDemo.ps1 -Demo      # scripted run of every operation
#>
param([switch]$Demo)

$ErrorActionPreference = 'Stop'

function Get-Setting($name, $default) {
    $value = [Environment]::GetEnvironmentVariable($name)
    if ([string]::IsNullOrWhiteSpace($value)) { return $default }
    return $value
}

$dbHost = Get-Setting 'DB_HOST' 'localhost'
$dbPort = Get-Setting 'DB_PORT' '5432'
$dbName = Get-Setting 'DB_NAME' 'quiz_companion'
$dbUser = Get-Setting 'DB_USER' 'postgres'
$dbPass = Get-Setting 'DB_PASSWORD' $null
if (-not $dbPass) {
    $secure = Read-Host "Password for $dbUser" -AsSecureString
    $dbPass = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
}

# Pick the installed PostgreSQL ODBC driver (Unicode build, 64-bit).
$driver = Get-OdbcDriver -Platform '64-bit' |
    Where-Object { $_.Name -like 'PostgreSQL*' -and $_.Name -like '*UNICODE*' } |
    Select-Object -First 1
if (-not $driver) {
    throw 'PostgreSQL ODBC driver not found. Install psqlODBC (64-bit) and try again.'
}

$connectionString = "Driver={$($driver.Name)};Server=$dbHost;Port=$dbPort;Database=$dbName;Uid=$dbUser;Pwd=$dbPass;"
$db = New-Object System.Data.Odbc.OdbcConnection($connectionString)
$db.Open()
Write-Host "Connected to PostgreSQL $($db.ServerVersion) via ODBC driver '$($driver.Name)'"

# --- helpers -----------------------------------------------------------------

function New-Command($sql, $values, $tx) {
    $cmd = $db.CreateCommand()
    $cmd.CommandText = $sql
    if ($tx) { $cmd.Transaction = $tx }
    foreach ($v in $values) {
        $p = $cmd.Parameters.Add((New-Object System.Data.Odbc.OdbcParameter))
        $p.Value = if ($null -eq $v) { [DBNull]::Value } else { $v }
    }
    return $cmd
}

function Show-Query($sql, $values = @(), $tx = $null) {
    $cmd = New-Command $sql $values $tx
    $reader = $cmd.ExecuteReader()
    $rows = @()
    while ($reader.Read()) {
        $row = [ordered]@{}
        for ($i = 0; $i -lt $reader.FieldCount; $i++) {
            $row[$reader.GetName($i)] = if ($reader.IsDBNull($i)) { 'null' } else { $reader.GetValue($i) }
        }
        $rows += [pscustomobject]$row
    }
    $reader.Close()
    if ($rows.Count -gt 0) { $rows | Format-Table -AutoSize | Out-String -Width 200 | Write-Host }
    Write-Host "($($rows.Count) rows)"
}

# --- operations ---------------------------------------------------------------

function Show-Topics {
    Show-Query @'
SELECT t.topic_id, t.name, p.name AS parent
FROM topic t LEFT JOIN topic p ON p.topic_id = t.parent_topic_id
ORDER BY t.topic_id
'@
}

function Show-Items {
    Show-Query @'
SELECT li.item_id, li.title, li.item_type, t.name AS topic, li.difficulty
FROM learning_item li LEFT JOIN topic t ON t.topic_id = li.topic_id
ORDER BY li.item_id
'@
}

function Show-Leaderboard {
    Show-Query 'SELECT rank, full_name, total_score FROM v_leaderboard ORDER BY rank'
}

function Add-Topic($name, $description, $parentId) {
    $cmd = New-Command 'INSERT INTO topic (name, description, parent_topic_id) VALUES (?, ?, ?) RETURNING topic_id' `
        @($name, $(if ($description) { $description } else { $null }), $parentId) $null
    $id = $cmd.ExecuteScalar()
    Write-Host "INSERT: topic $id created."
    return $id
}

function Rename-Topic($id, $name) {
    $cmd = New-Command 'UPDATE topic SET name = ? WHERE topic_id = ?' @($name, [int]$id) $null
    Write-Host "UPDATE: $($cmd.ExecuteNonQuery()) row(s) changed."
}

function Remove-Topic($id) {
    $cmd = New-Command 'DELETE FROM topic WHERE topic_id = ?' @([int]$id) $null
    Write-Host "DELETE: $($cmd.ExecuteNonQuery()) row(s) removed."
}

# Grades the answers and records the attempt in one transaction, like the web API.
# With -RollBack the transaction is undone afterwards (used by the demo, so the
# sample data stays unchanged).
function Submit-Quiz($userId, $quizId, $answersJson, [switch]$RollBack) {
    $tx = $db.BeginTransaction()
    try {
        $score = [double](New-Command 'SELECT grade_quiz(?, CAST(? AS jsonb))' @([int]$quizId, $answersJson) $tx).ExecuteScalar()
        $attempt = (New-Command "SELECT record_attempt(?, ?, 'completed', CAST(? AS numeric))" `
            @([int]$userId, [int]$quizId, $score) $tx).ExecuteScalar()
        Write-Host ("Scored {0:N2}%, stored as attempt {1}." -f $score, $attempt)
        Show-Query 'SELECT user_id, topic_id, proficiency_score, attempts_count FROM topic_proficiency WHERE user_id = ? ORDER BY topic_id' @([int]$userId) $tx
        if ($RollBack) { $tx.Rollback(); Write-Host 'Rolled back: demo data not kept.' } else { $tx.Commit() }
    } catch {
        $tx.Rollback()
        throw
    }
}

function Invoke-Safely([scriptblock]$action) {
    try { & $action } catch {
        # Constraint and trigger violations are reported, not fatal.
        Write-Host "Rejected by the database: $($_.Exception.Message)"
    }
}

function Invoke-Demo {
    Write-Host "`n== SELECT: topics"
    Show-Topics

    Write-Host "`n== INSERT, UPDATE, DELETE on topic"
    $id = Add-Topic 'ODBC Demo Topic' 'Created through ODBC' 1
    Rename-Topic $id 'ODBC Demo Topic (renamed)'
    Remove-Topic $id

    Write-Host "`n== Business logic: grade and record a quiz attempt for user 2 (rolled back afterwards)"
    Submit-Quiz 2 1 '{"1": "0", "2": "Traversal"}' -RollBack

    Write-Host "`n== Constraint check: deleting a topic that has learning items"
    Invoke-Safely { Remove-Topic 3 }

    Write-Host "`n== SELECT: leaderboard view"
    Show-Leaderboard
}

# --- main ---------------------------------------------------------------------

try {
    if ($Demo) {
        Invoke-Demo
    } else {
        while ($true) {
            Write-Host ''
            Write-Host '1. List topics            5. List learning items'
            Write-Host '2. Add a topic            6. Take a quiz (grade + record attempt)'
            Write-Host '3. Rename a topic         7. Show leaderboard'
            Write-Host '4. Delete a topic         8. Run the full scripted demo'
            Write-Host '0. Exit'
            $choice = Read-Host 'Choose'
            switch ($choice) {
                '1' { Invoke-Safely { Show-Topics } }
                '2' { Invoke-Safely { Add-Topic (Read-Host 'Name') (Read-Host 'Description') $null | Out-Null } }
                '3' { Invoke-Safely { Rename-Topic (Read-Host 'Topic id') (Read-Host 'New name') } }
                '4' { Invoke-Safely { Remove-Topic (Read-Host 'Topic id') } }
                '5' { Invoke-Safely { Show-Items } }
                '6' {
                    Invoke-Safely {
                        $user = Read-Host 'User id'; $quiz = Read-Host 'Quiz id'
                        $answers = [ordered]@{}
                        for ($n = 1; ; $n++) {
                            $a = Read-Host "Answer to question $n (blank to finish)"
                            if (-not $a) { break }
                            $answers["$n"] = $a
                        }
                        Submit-Quiz $user $quiz ($answers | ConvertTo-Json -Compress)
                    }
                }
                '7' { Invoke-Safely { Show-Leaderboard } }
                '8' { Invoke-Safely { Invoke-Demo } }
                '0' { }
                default { Write-Host 'Unknown option.' }
            }
            if ($choice -eq '0') { break }
        }
    }
} finally {
    $db.Close()
}
