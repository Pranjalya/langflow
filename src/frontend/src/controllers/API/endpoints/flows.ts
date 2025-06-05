export const getFlowUsers = async (flowId: string) => {
  const response = await fetch(`/api/v1/flows/${flowId}/users`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Failed to get flow users");
  }
  return response.json();
};

export const updateFlowUserPermissions = async (
  flowId: string,
  userId: string,
  permissions: {
    can_read?: boolean;
    can_run?: boolean;
    can_edit?: boolean;
  }
) => {
  const response = await fetch(`/api/v1/flows/${flowId}/users/${userId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(permissions),
  });
  if (!response.ok) {
    throw new Error("Failed to update flow user permissions");
  }
  return response.json();
}; 