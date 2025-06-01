import { useMutation } from "@tanstack/react-query";
import { api } from "../../api";

interface UpdateProjectUsersParams {
  projectId: string;
  users: {
    user_id: string;
    can_read: boolean;
    can_run: boolean;
    can_edit: boolean;
  }[];
}

export const useUpdateProjectUsers = () => {
  return useMutation({
    mutationFn: async (params: UpdateProjectUsersParams) => {
      // Update each user's permissions individually
      const updatePromises = params.users.map(user => 
        api.patch(`/api/v1/projects/${params.projectId}/users/${user.user_id}`, {
          can_read: user.can_read,
          can_run: user.can_run,
          can_edit: user.can_edit
        })
      );
      
      const responses = await Promise.all(updatePromises);
      return responses.map(r => r.data);
    },
  });
}; 