import { platformApiFetch } from "./platform-client.js";

/**
 * @param {{ phone: string, password: string }} dto
 * @returns {Promise<{ accessToken: string, user: { id: string, phone: string, fullName: string } }>}
 */
export function login(dto) {
  return platformApiFetch("/platform-auth/login", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}
