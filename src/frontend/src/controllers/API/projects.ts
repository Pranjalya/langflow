import { BASE_URL_API } from "../../constants/constants";

export const getProjectPermissions = async (projectId: string) => {
  const response = await fetch(`${BASE_URL_API}projects/${projectId}/permissions`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch project permissions");
  }

  return response.json();
}; 