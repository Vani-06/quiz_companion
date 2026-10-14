
import { getDashboardData as getMockDashboardData } from "./mockApi";

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== "false";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"
).replace(/\/+$/, "");

async function request(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}

export async function getDashboardData() {
  if (USE_MOCK_API) {
    return getMockDashboardData();
  }

  return request("/dashboard");
}
