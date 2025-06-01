import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api";

interface RemoveProjectUserParams {
  projectId: string;
  userId: string;
}

export const useRemoveProjectUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, userId }: RemoveProjectUserParams) => {
      const response = await api.delete(`/api/v1/projects/${projectId}/users/${userId}`);
      return response.data;
    },
    onSuccess: (_, { projectId }) => {
      // Invalidate the project users query to refetch the updated list
      queryClient.invalidateQueries({ queryKey: ["project-users", projectId] });
    },
  });
}; 