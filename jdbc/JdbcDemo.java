import java.io.BufferedReader;
import java.io.Console;
import java.io.IOException;
import java.io.InputStreamReader;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;

/**
 * JDBC console client for the Adaptive Learning Platform database.
 * Runs retrieval and DML (INSERT, UPDATE, DELETE) plus the business-logic
 * functions directly over JDBC, independent of the web API.
 *
 * Connection settings come from environment variables:
 *   DB_URL      (default jdbc:postgresql://localhost:5432/quiz_companion)
 *   DB_USER     (default postgres)
 *   DB_PASSWORD (prompted for when not set)
 */
public class JdbcDemo {

    private static final BufferedReader IN = new BufferedReader(new InputStreamReader(System.in));

    public static void main(String[] args) throws IOException {
        String url = env("DB_URL", "jdbc:postgresql://localhost:5432/quiz_companion");
        String user = env("DB_USER", "postgres");
        String password = System.getenv("DB_PASSWORD");
        if (password == null) {
            password = readPassword("Password for " + user + ": ");
        }

        try (Connection db = DriverManager.getConnection(url, user, password)) {
            System.out.println("Connected to " + db.getMetaData().getDatabaseProductName()
                + " " + db.getMetaData().getDatabaseProductVersion() + " via JDBC");
            if (args.length > 0 && args[0].equals("--demo")) {
                runDemo(db);
            } else {
                menu(db);
            }
        } catch (SQLException e) {
            System.err.println("Database error: " + e.getMessage());
            System.exit(1);
        }
    }

    // ------------------------------------------------------------------ menu --

    private static void menu(Connection db) throws IOException {
        while (true) {
            System.out.println();
            System.out.println("1. List topics            5. List learning items");
            System.out.println("2. Add a topic            6. Take a quiz (grade + record attempt)");
            System.out.println("3. Rename a topic         7. Show leaderboard");
            System.out.println("4. Delete a topic         8. Run the full scripted demo");
            System.out.println("0. Exit");
            String choice = ask("Choose: ");
            try {
                switch (choice) {
                    case "1" -> listTopics(db);
                    case "2" -> addTopic(db, ask("Name: "), ask("Description: "), null);
                    case "3" -> renameTopic(db, Integer.parseInt(ask("Topic id: ")), ask("New name: "));
                    case "4" -> deleteTopic(db, Integer.parseInt(ask("Topic id: ")));
                    case "5" -> listItems(db);
                    case "6" -> takeQuiz(db, Integer.parseInt(ask("User id: ")),
                        Integer.parseInt(ask("Quiz id: ")), readAnswers(db));
                    case "7" -> leaderboard(db);
                    case "8" -> runDemo(db);
                    case "0" -> { return; }
                    default -> System.out.println("Unknown option.");
                }
            } catch (SQLException e) {
                // Constraint and trigger violations are reported, not fatal.
                System.out.println("Rejected by the database: " + e.getMessage());
            } catch (NumberFormatException e) {
                System.out.println("Please enter a number.");
            }
        }
    }

    // -------------------------------------------------------------- retrieval --

    private static void listTopics(Connection db) throws SQLException {
        print(db, """
            SELECT t.topic_id, t.name, p.name AS parent
            FROM topic t LEFT JOIN topic p ON p.topic_id = t.parent_topic_id
            ORDER BY t.topic_id""");
    }

    private static void listItems(Connection db) throws SQLException {
        print(db, """
            SELECT li.item_id, li.title, li.item_type, t.name AS topic, li.difficulty
            FROM learning_item li LEFT JOIN topic t ON t.topic_id = li.topic_id
            ORDER BY li.item_id""");
    }

    private static void leaderboard(Connection db) throws SQLException {
        print(db, "SELECT rank, full_name, total_score FROM v_leaderboard ORDER BY rank");
    }

    // -------------------------------------------------------------------- DML --

    private static int addTopic(Connection db, String name, String description, Integer parentId)
            throws SQLException {
        try (PreparedStatement st = db.prepareStatement(
                "INSERT INTO topic (name, description, parent_topic_id) VALUES (?, ?, ?) RETURNING topic_id")) {
            st.setString(1, name);
            st.setString(2, description.isBlank() ? null : description);
            st.setObject(3, parentId);
            try (ResultSet rs = st.executeQuery()) {
                rs.next();
                int id = rs.getInt(1);
                System.out.println("INSERT: topic " + id + " created.");
                return id;
            }
        }
    }

    private static void renameTopic(Connection db, int topicId, String name) throws SQLException {
        try (PreparedStatement st = db.prepareStatement("UPDATE topic SET name = ? WHERE topic_id = ?")) {
            st.setString(1, name);
            st.setInt(2, topicId);
            System.out.println("UPDATE: " + st.executeUpdate() + " row(s) changed.");
        }
    }

    private static void deleteTopic(Connection db, int topicId) throws SQLException {
        try (PreparedStatement st = db.prepareStatement("DELETE FROM topic WHERE topic_id = ?")) {
            st.setInt(1, topicId);
            System.out.println("DELETE: " + st.executeUpdate() + " row(s) removed.");
        }
    }

    // Grades and records the attempt in one transaction, like the web API does.
    private static void takeQuiz(Connection db, int userId, int quizId, String answersJson)
            throws SQLException {
        db.setAutoCommit(false);
        try (PreparedStatement grade = db.prepareStatement("SELECT grade_quiz(?, ?::jsonb)");
             PreparedStatement record = db.prepareStatement(
                 "SELECT record_attempt(?, ?, 'completed', ?::numeric)")) {
            grade.setInt(1, quizId);
            grade.setString(2, answersJson);
            double score;
            try (ResultSet rs = grade.executeQuery()) {
                rs.next();
                score = rs.getDouble(1);
            }
            record.setInt(1, userId);
            record.setInt(2, quizId);
            record.setDouble(3, score);
            int attempt;
            try (ResultSet rs = record.executeQuery()) {
                rs.next();
                attempt = rs.getInt(1);
            }
            db.commit();
            System.out.printf("Scored %.2f%%, stored as attempt %d.%n", score, attempt);
        } catch (SQLException e) {
            db.rollback();
            throw e;
        } finally {
            db.setAutoCommit(true);
        }
    }

    // ----------------------------------------------------------------- demo --

    private static void runDemo(Connection db) throws SQLException {
        System.out.println("\n== SELECT: topics");
        listTopics(db);

        System.out.println("\n== INSERT, UPDATE, DELETE on topic");
        int id = addTopic(db, "JDBC Demo Topic", "Created from Java", 1);
        renameTopic(db, id, "JDBC Demo Topic (renamed)");
        deleteTopic(db, id);

        System.out.println("\n== Business logic: grade and record a quiz attempt for user 2");
        takeQuiz(db, 2, 1, "{\"1\": \"0\", \"2\": \"Traversal\"}");
        print(db, "SELECT user_id, topic, proficiency_score, strength FROM v_topic_strength WHERE user_id = 2");

        System.out.println("\n== Constraint check: deleting a topic that has learning items");
        try {
            deleteTopic(db, 3);
        } catch (SQLException e) {
            System.out.println("Rejected as expected: " + e.getMessage());
        }

        System.out.println("\n== SELECT: leaderboard view");
        leaderboard(db);
    }

    // -------------------------------------------------------------- helpers --

    private static void print(Connection db, String sql) throws SQLException {
        try (PreparedStatement st = db.prepareStatement(sql); ResultSet rs = st.executeQuery()) {
            ResultSetMetaData meta = rs.getMetaData();
            int columns = meta.getColumnCount();
            StringBuilder header = new StringBuilder();
            for (int i = 1; i <= columns; i++) {
                header.append(String.format("%-28s", meta.getColumnLabel(i)));
            }
            System.out.println(header.toString().stripTrailing());
            int rows = 0;
            while (rs.next()) {
                StringBuilder line = new StringBuilder();
                for (int i = 1; i <= columns; i++) {
                    line.append(String.format("%-28s", rs.getString(i)));
                }
                System.out.println(line.toString().stripTrailing());
                rows++;
            }
            System.out.println("(" + rows + " rows)");
        }
    }

    private static String readAnswers(Connection db) throws IOException {
        StringBuilder json = new StringBuilder("{");
        for (int no = 1; ; no++) {
            String answer = ask("Answer to question " + no + " (blank to finish): ");
            if (answer.isBlank()) break;
            if (no > 1) json.append(", ");
            json.append('"').append(no).append("\": \"").append(answer.replace("\"", "\\\"")).append('"');
        }
        return json.append('}').toString();
    }

    private static String ask(String prompt) throws IOException {
        System.out.print(prompt);
        String line = IN.readLine();
        return line == null ? "0" : line.trim();
    }

    private static String readPassword(String prompt) throws IOException {
        Console console = System.console();
        if (console != null) {
            char[] chars = console.readPassword(prompt);
            return chars == null ? "" : new String(chars);
        }
        return ask(prompt);
    }

    private static String env(String name, String fallback) {
        String value = System.getenv(name);
        return value == null || value.isBlank() ? fallback : value;
    }
}
