import { useMutation } from "@tanstack/react-query";
import { api } from "../../api";

interface UpdateProjectUsersParams {
  projectId: string;
  users: {
    user_id: string;
    can_read: boolean;
    can_run: boolean;
    can_edit: boolean;
    is_project_admin?: boolean;
  }[];
}

export const useUpdateProjectUsers = () => {
  return useMutation({
    mutationFn: async (params: UpdateProjectUsersParams) => {
      try {
        // Update each user's permissions individually
        const updatePromises = params.users.map(user => 
          api.patch(`/api/v1/projects/${params.projectId}/users/${user.user_id}`, {
            can_read: user.can_read,
            can_run: user.can_run,
            can_edit: user.can_edit,
            is_project_admin: user.is_project_admin
          })
        );
        
        // Wait for all updates to complete
        const responses = await Promise.all(updatePromises);
        
        // Verify all responses are successful
        const allSuccessful = responses.every(r => r.status === 200);
        if (!allSuccessful) {
          throw new Error('Some permission updates failed');
        }
        
        return responses.map(r => r.data);
      } catch (error) {
        console.error('Error updating project user permissions:', error);
        throw error;
      }
    },
  });
}; 