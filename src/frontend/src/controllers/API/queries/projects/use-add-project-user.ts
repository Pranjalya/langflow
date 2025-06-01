import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api";

interface AddProjectUserParams {
  projectId: string;
  userId: string;
  permissions: {
    can_read: boolean;
    can_run: boolean;
    can_edit: boolean;
  };
}

export const useAddProjectUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, userId, permissions }: AddProjectUserParams) => {
      const response = await api.patch(`/api/v1/projects/${projectId}/users/${userId}`, permissions);
      return response.data;
    },
    onSuccess: (_, { projectId }) => {
      // Invalidate the project users query to refetch the updated list
      queryClient.invalidateQueries({ queryKey: ["project-users", projectId] });
    },
  });
}; 