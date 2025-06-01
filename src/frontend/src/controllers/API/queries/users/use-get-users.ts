import { useQuery } from "@tanstack/react-query";
import { api } from "../../api";

interface User {
  id: string;
  username: string;
}

interface UsersResponse {
  users: User[];
  total_count: number;
}

export const useGetUsers = () => {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await api.get<UsersResponse>("/api/v1/users");
      return response.data;
    },
  });
}; 