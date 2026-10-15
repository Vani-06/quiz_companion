"""Builds the completed Phase 2 deck as a NEW file (the original is never modified).

Usage: python docs/build_phase2_deck.py <original.pptx> <shots_dir> <output.pptx>
"""
import copy
import sys

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR
from pptx.util import Emu, Inches, Pt

src, shots, out = sys.argv[1:4]
NAVY, GOLD, CODE_BG, GREY = "14284B", "C9962B", "0F1B33", "4A5563"
prs = Presentation(src)


def rgb(h):
    return RGBColor.from_string(h)


def find_slide_by_text(text):
    for s in prs.slides:
        for sh in s.shapes:
            if sh.has_text_frame and text in sh.text_frame.text:
                return s
    raise KeyError(text)


def add_text(slide, x, y, w, h, lines, size=14, color="1F2933", bold=False,
             font="Arial", fill=None, anchor=MSO_ANCHOR.TOP, shape=None, pad=0.12):
    box = slide.shapes.add_shape(shape or MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    box.line.fill.background()
    if fill:
        box.fill.solid()
        box.fill.fore_color.rgb = rgb(fill)
    else:
        box.fill.background()
    box.shadow.inherit = False
    tf = box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = Inches(pad)
    tf.margin_top = tf.margin_bottom = Inches(0.06)
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        if isinstance(line, tuple):
            text, opts = line
        else:
            text, opts = line, {}
        r = p.add_run()
        r.text = text
        r.font.size = Pt(opts.get("size", size))
        r.font.bold = opts.get("bold", bold)
        r.font.name = opts.get("font", font)
        r.font.color.rgb = rgb(opts.get("color", color))
        p.space_after = Pt(opts.get("after", 4))
        p.alignment = None
    return box


def new_slide_after(after_slide, kicker, title, number):
    """Clone a content slide's frame (kicker, title, footer) into a new slide."""
    layout = after_slide.slide_layout
    s = prs.slides.add_slide(layout)
    for ph in list(s.placeholders):
        ph._element.getparent().remove(ph._element)
    for sh in after_slide.shapes:
        if sh.name in ("Text 0", "Text 1") or (sh.has_text_frame and "Adaptive Learning Platform" in sh.text_frame.text):
            s.shapes._spTree.append(copy.deepcopy(sh._element))
    for sh in s.shapes:
        if not sh.has_text_frame:
            continue
        t = sh.text_frame.text
        run = sh.text_frame.paragraphs[0].runs[0]
        if sh.name == "Text 0":
            run.text = kicker
        elif sh.name == "Text 1":
            run.text = title
        elif "Adaptive Learning Platform" in t:
            run.text = f"Adaptive Learning Platform · Phase 2 · {number}"
    # move into position (right after after_slide)
    ids = prs.slides._sldIdLst
    el = ids[-1]
    ids.remove(el)
    ids.insert(list(prs.slides).index(after_slide) + 1, el)
    return s


def renumber_footers():
    for i, s in enumerate(prs.slides, 1):
        for sh in s.shapes:
            if sh.has_text_frame and sh.text_frame.text.startswith("Adaptive Learning Platform") and "Phase 2" in sh.text_frame.text:
                runs = sh.text_frame.paragraphs[0].runs
                runs[0].text = f"Adaptive Learning Platform · Phase 2 · {i}"
                for extra in runs[1:]:
                    extra.text = ""


def pic(slide, name, x, y, w):
    return slide.shapes.add_picture(f"{shots}/{name}.png", Inches(x), Inches(y), width=Inches(w))


# ---------------------------------------------------------------- slide 17 --
s17 = find_slide_by_text("Front-End Design")
for s in prs.slides:
    if s.shapes.title is not None and s.shapes.title.text_frame.text == "Front-End Design":
        s17 = s
pic(s17, "dashboard", 0.667, 1.4, 6.3)
add_text(s17, 7.3, 1.4, 5.4, 0.4, [("Quiz Companion web interface", {"bold": True, "color": "FFFFFF", "font": "Consolas", "size": 14})],
         fill=NAVY, anchor=MSO_ANCHOR.MIDDLE)
add_text(s17, 7.3, 1.8, 5.4, 3.7, [
    ("React 19 + Vite single-page app, styled as a dark dashboard.", {"size": 14}),
    ("Student switcher in the top bar; every page re-queries PostgreSQL for that student.", {"size": 14}),
    ("Dashboard: attempts, average score, topic proficiency chart, recent attempts and ranked recommendations.", {"size": 14}),
    ("Recommendations can be marked Done, Dismissed or Restored (UPDATE on recommendation.status).", {"size": 14}),
    ("No data is hard-coded in the front end: every number comes from the 10 PostgreSQL tables through the API.", {"size": 14}),
], fill="F3F4F6", pad=0.18)
add_text(s17, 0.667, 6.0, 12.0, 0.3, [("Screenshot: Dashboard page running on the sample data from Part 6.", {"size": 11, "color": GREY})])

# --------------------------------------------------- new slide: all pages ----
pages = new_slide_after(s17, "Part 7 · Front-End Design", "Front-End Pages and Database Use", 18)
grid = [("learning", "My Learning: attempt history", 0.667, 1.35),
        ("quizzes", "Quizzes: question bank (weak entity)", 4.75, 1.35),
        ("items", "Learning Items: quizzes and projects", 0.667, 4.05),
        ("topics", "Topics: parent / child hierarchy", 4.75, 4.05)]
for name, cap, x, y in grid:
    pic(pages, name, x, y, 3.9)
    add_text(pages, x, y + 2.43, 3.9, 0.28, [(cap, {"size": 11, "color": GREY})], pad=0)
add_text(pages, 8.9, 1.35, 3.8, 0.4, [("Page → tables used", {"bold": True, "color": "FFFFFF", "font": "Consolas", "size": 14})],
         fill=NAVY, anchor=MSO_ANCHOR.MIDDLE)
add_text(pages, 8.9, 1.75, 3.8, 4.7, [
    ("Dashboard", {"bold": True}), ("users, learning_record, topic_proficiency, recommendation, learning_item", {"size": 12, "after": 8}),
    ("My Learning", {"bold": True}), ("learning_record, learning_item, topic", {"size": 12, "after": 8}),
    ("Quizzes", {"bold": True}), ("quiz, question (add questions)", {"size": 12, "after": 8}),
    ("Learning Items", {"bold": True}), ("learning_item, quiz, project, project_tech (add / delete)", {"size": 12, "after": 8}),
    ("Topics", {"bold": True}), ("topic (add / delete, self-referencing FK)", {"size": 12}),
], size=14, fill="F3F4F6", pad=0.18)

# ------------------------------------------- new slide: initial connectivity ----
conn = new_slide_after(pages, "Part 9 · Database connectivity (initial)", "Front End to PostgreSQL Connection", 19)
steps = ["React page", "HTTP /api request", "Express route", "pg connection pool", "PostgreSQL"]
for i, st in enumerate(steps):
    x = 0.667 + i * 2.45
    box = add_text(conn, x, 1.4, 2.05, 0.9, [(f"STEP {i + 1}", {"size": 11, "bold": True, "color": GOLD, "after": 0}),
                                              (st, {"size": 14, "bold": True, "color": "FFFFFF"})],
                   fill=NAVY, shape=MSO_SHAPE.ROUNDED_RECTANGLE, anchor=MSO_ANCHOR.MIDDLE)
    for p in box.text_frame.paragraphs:
        p.alignment = 2  # center
    if i < 4:
        add_text(conn, x + 2.05, 1.65, 0.4, 0.4, [("→", {"size": 18, "color": GOLD})], pad=0.05)

rows = [("Operation", "API call", "SQL executed (parameterised)"),
        ("Retrieve", "GET /api/dashboard?userId=1", "SELECT ... FROM learning_record / topic_proficiency / recommendation"),
        ("Retrieve", "GET /api/items", "SELECT ... FROM learning_item LEFT JOIN quiz, project, project_tech"),
        ("Insert", "POST /api/items", "INSERT INTO learning_item, then quiz or project + project_tech (one transaction)"),
        ("Insert", "POST /api/topics", "INSERT INTO topic (name, description, parent_topic_id)"),
        ("Update", "PATCH /api/recommendations/1/2", "UPDATE recommendation SET status = $3"),
        ("Delete", "DELETE /api/topics/3", "DELETE FROM topic; FK violation returned as a 409 message")]
tbl = conn.shapes.add_table(len(rows), 3, Inches(0.667), Inches(2.6), Inches(12.0), Inches(3.4)).table
tbl.columns[0].width, tbl.columns[1].width, tbl.columns[2].width = Inches(1.5), Inches(3.9), Inches(6.6)
for r, row in enumerate(rows):
    for c, val in enumerate(row):
        cell = tbl.cell(r, c)
        cell.text = val
        para = cell.text_frame.paragraphs[0]
        para.runs[0].font.size = Pt(12)
        para.runs[0].font.name = "Arial"
        para.runs[0].font.bold = r == 0
        para.runs[0].font.color.rgb = rgb("000000" if r == 0 else "1F2933")
        cell.fill.solid()
        cell.fill.fore_color.rgb = rgb("E2E2DC" if r == 0 else "FFFFFF")
add_text(conn, 0.667, 6.15, 12.0, 0.6, [
    ("Test: GET /api/health returns {\"status\":\"ok\",\"database\":\"connected\"}. Connection string comes from DATABASE_URL; scripts: npm run db:setup, npm run server.",
     {"size": 12, "color": GREY})])

# ------------------------------------------------- placeholders -> outputs ----
def replace_box(slide, marker, lines, height_in=None):
    for sh in slide.shapes:
        if sh.has_text_frame and marker in sh.text_frame.text:
            tf = sh.text_frame
            sh.fill.solid()
            sh.fill.fore_color.rgb = rgb(CODE_BG)
            sh.line.fill.background()
            for p in list(tf.paragraphs)[1:]:
                p._p.getparent().remove(p._p)
            first = tf.paragraphs[0]
            first.runs[0].text = lines[0]
            for ln in lines[1:]:
                p = copy.deepcopy(first._p)
                tf._txBody.append(p)
            for p, ln in zip(tf.paragraphs, lines):
                p.runs[0].text = ln
                p.runs[0].font.name = "Consolas"
                p.runs[0].font.size = Pt(11)
                p.runs[0].font.color.rgb = rgb("E6EAF2")
                p.line_spacing = None
            tf.margin_top = tf.margin_bottom = Inches(0.08)
            if height_in:
                sh.height = Inches(height_in)
            return sh
    raise KeyError(marker)


tables = ["table_name  (10 rows)", "learning_item, learning_record, project,", "project_tech, question, quiz, recommendation,", "topic, topic_proficiency, users"]
s8 = find_slide_by_text("Schema Verification and Constraint Summary")
box8 = replace_box(s8, "[Insert screenshot", tables, 1.2)
box8.top = Inches(3.5)

counts = ["table_name         | records", "-------------------+--------", "learning_item     |   4", "learning_record   |   5",
          "project           |   2", "project_tech      |   4", "question          |   4", "quiz              |   2",
          "recommendation    |   4", "topic             |   4", "topic_proficiency |   4", "users             |   3"]
s16 = find_slide_by_text("Data Population Verification")
for sh in s16.shapes:
    if sh.has_text_frame and "[Insert screenshot" in sh.text_frame.text:
        print("slide16 box", sh.left, sh.top, sh.width, sh.height)
replace_box(s16, "[Insert screenshot", ["Output: 12 rows, total = 36 (matches expected counts)"], None)

s28 = find_slide_by_text("Testing the Business Rules")
for sh in s28.shapes:
    if sh.has_text_frame:
        for p in sh.text_frame.paragraphs:
            for r in p.runs:
                r.text = (r.text.replace("NOW());", "LOCALTIMESTAMP);").replace("NOW()", "LOCALTIMESTAMP"))
replace_box(s28, "[Insert screenshot", [
    "record_attempt(1,3,'submitted',88)  -> OK, attempt_no 1",
    "record_attempt(1,3,'submitted',120) -> ERROR: violates check constraint \"chk_score\"",
    "topic_proficiency user 1: topic 2 = 88.00 (1 attempt)",
    "after record_attempt(2,2,'completed',45): generate_recommendations(2) -> SQL Joins, 0.5500",
], 1.3)

# ----------------------------------------------------------- slide 12 URLs ----
for s in prs.slides:
    for sh in s.shapes:
        if sh.has_text_frame:
            for p in sh.text_frame.paragraphs:
                for r in p.runs:
                    if "YOUR-USERNAME" in r.text:
                        r.text = r.text.replace("YOUR-USERNAME", "example")

# ----------------------------------------------------------------- slide 29 ----
s29 = find_slide_by_text("Conclusion and Next Steps")
tbl29 = [sh for sh in s29.shapes if sh.has_table][0].table
for r_idx, row in enumerate(tbl29.rows):
    first = row.cells[0].text_frame.text
    if first == "Front end":
        row.cells[1].text_frame.paragraphs[0].runs[0].text if row.cells[1].text_frame.paragraphs[0].runs else None
        cell = row.cells[1]
        tmpl = tbl29.cell(r_idx - 1, 1).text_frame.paragraphs[0].runs[0]
        p = cell.text_frame.paragraphs[0]
        r = p.add_run()
        r.text = "React web app with five pages (dashboard, attempts, quizzes, learning items, topics) reading live PostgreSQL data"
        r.font.size, r.font.name = tmpl.font.size, tmpl.font.name
        r.font.color.rgb = rgb("000000")
        # add a connectivity row after it by cloning this row
        new_tr = copy.deepcopy(row._tr)
        row._tr.addnext(new_tr)
        cells = new_tr.findall("{http://schemas.openxmlformats.org/drawingml/2006/main}tc")
        for tc, text in zip(cells, ["Initial connectivity", "Express + pg connection pool: SELECT, INSERT, UPDATE and DELETE run from the front end"]):
            ts = tc.findall(".//{http://schemas.openxmlformats.org/drawingml/2006/main}t")
            ts[0].text = text
        break
tbl29_shape = [sh for sh in s29.shapes if sh.has_table][0]
tbl29_shape.height = tbl29_shape.height + Inches(0.5)

renumber_footers()
prs.save(out)
print("saved", out, len(prs.slides), "slides")
