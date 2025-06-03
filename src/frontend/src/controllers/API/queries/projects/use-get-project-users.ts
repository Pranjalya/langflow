import { useQuery } from "@tanstack/react-query";
import { api } from "../../api";

interface ProjectUser {
  user_id: string;
  username?: string;
  can_read: boolean;
  can_run: boolean;
  can_edit: boolean;
  is_project_admin?: boolean;
}

interface ProjectUsersResponse {
  users: ProjectUser[];
  total_count: number;
}

export const useGetProjectUsers = (projectId: string) => {
  return useQuery({
    queryKey: ["project-users", projectId],
    queryFn: async () => {
      const response = await api.get<ProjectUsersResponse>(`/api/v1/projects/${projectId}/users`);
      return response.data;
    },
    enabled: !!projectId,
  });
}; 