import { useQuery } from "@tanstack/react-query";
import { getProjectPermissions } from "../../projects";

export const useGetProjectPermissions = (projectId: string) => {
  return useQuery({
    queryKey: ["projectPermissions", projectId],
    queryFn: () => getProjectPermissions(projectId),
    enabled: !!projectId,
  });
}; 