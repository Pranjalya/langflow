import { useQueryFunctionType } from "@/types/api";
import { api } from "../../api";
import { getURL } from "../../helpers/constants";
import { UseRequestProcessor } from "../../services/request-processor";

export interface IProjectRequest {
  id: string;
  project_name: string;
  justification: string;
  requested_users: string[];
  status: string;
  created_at: string;
  updated_at: string;
  requester_id: string;
  resolved_at: string | null;
  rejection_reason: string | null;
}

export const useGetProjectRequests: useQueryFunctionType<
  undefined,
  IProjectRequest[]
> = (options?) => {
  const { query } = UseRequestProcessor();

  const getProjectRequestsFn = async () => {
    const response = await api.get(`${getURL("PROJECT_REQUESTS")}/`);
    return response.data;
  };

  const queryResult = query(
    ["useGetProjectRequests"],
    getProjectRequestsFn,
    {
      refetchOnWindowFocus: false,
      ...options,
    }
  );

  return queryResult;
}; 