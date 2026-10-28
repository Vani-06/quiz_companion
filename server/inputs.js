// Parses and validates request bodies for each entity, matching the column
// types and constraints in db/schema.sql and db/business_logic.sql.
import { SKILL_LEVELS, ValidationError, decimal, id, integer, oneOf, text, url } from "./validation.js";

export function parseTopic(body) {
  return {
    name: text(body.name, "Topic name", { required: true, max: 80 }),
    description: text(body.description, "Description"),
    parent_topic_id: body.parent_topic_id ? id(body.parent_topic_id, "Parent topic") : null,
  };
}

export function parseItem(body, { creating }) {
  const item = {
    title: text(body.title, "Title", { required: true, max: 150 }),
    topic_id: id(body.topic_id, "Topic"),
    difficulty: integer(body.difficulty, "Difficulty", { min: 1, max: 5 }),
  };
  if (creating) {
    item.item_type = oneOf(String(body.item_type ?? "").toUpperCase(), "Item type",
      ["QUIZ", "PROJECT"], { required: true });
  }
  return item;
}

export function parseQuizDetails(body) {
  return {
    time_limit_min: integer(body.time_limit_min, "Time limit", { min: 1, max: 600 }),
    pass_mark: integer(body.pass_mark, "Pass mark", { min: 0, max: 100 }),
  };
}

export function parseProjectDetails(body) {
  const tech = Array.isArray(body.tech) ? body.tech : String(body.tech ?? "").split(",");
  const cleanTech = [...new Set(tech.map((entry) => String(entry).trim()).filter(Boolean))];
  if (cleanTech.some((entry) => entry.length > 50)) {
    throw new ValidationError("Each technology must be at most 50 characters");
  }
  return {
    est_hours: decimal(body.est_hours, "Estimated hours", { min: 0, max: 999.9 }),
    repo_url: url(body.repo_url, "Repository URL"),
    tech: cleanTech,
  };
}

export function parseQuestion(body) {
  return {
    question_text: text(body.question_text, "Question", { required: true }),
    correct_answer: text(body.correct_answer, "Correct answer", { required: true }),
    marks: integer(body.marks, "Marks", { min: 1, max: 100 }) ?? 1,
  };
}

export function parseUserUpdate(body) {
  return {
    full_name: text(body.full_name, "Full name", { required: true, max: 100 }),
    skill_level: oneOf(body.skill_level, "Skill level", SKILL_LEVELS, { required: true }),
  };
}
