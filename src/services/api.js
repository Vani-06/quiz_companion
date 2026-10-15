// All data comes from the Express/PostgreSQL API (proxied to /api by Vite in dev).
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(
  /\/+$/,
  ""
);

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      if (data.error) message = data.error;
    } catch {
      // Response had no JSON body; keep the generic message.
    }
    throw new Error(message);
  }

  return response.status === 204 ? null : response.json();
}

export const api = {
  health: () => request("/health"),
  getUsers: () => request("/users"),
  getDashboard: (userId) => request(`/dashboard?userId=${userId}`),
  getRecords: (userId) => request(`/records?userId=${userId}`),

  getTopics: () => request("/topics"),
  addTopic: (topic) => request("/topics", { method: "POST", body: topic }),
  deleteTopic: (id) => request(`/topics/${id}`, { method: "DELETE" }),

  getItems: (type) => request(`/items${type ? `?type=${type}` : ""}`),
  addItem: (item) => request("/items", { method: "POST", body: item }),
  deleteItem: (id) => request(`/items/${id}`, { method: "DELETE" }),

  getQuestions: (quizId) => request(`/quizzes/${quizId}/questions`),
  addQuestion: (quizId, question) =>
    request(`/quizzes/${quizId}/questions`, {
      method: "POST",
      body: question,
    }),

  setRecommendationStatus: (userId, itemId, status) =>
    request(`/recommendations/${userId}/${itemId}`, {
      method: "PATCH",
      body: { status },
    }),
};
