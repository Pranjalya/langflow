import { BASE_URL_API } from "@/constants/constants";
import { FlowType } from "@/types/flow";

export const acquireLock = async (flowId: string): Promise<FlowType> => {
  const response = await fetch(`${BASE_URL_API}flows/${flowId}/lock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to acquire lock");
  }

  return response.json();
};

export const releaseLock = async (flowId: string): Promise<FlowType> => {
  const response = await fetch(`${BASE_URL_API}flows/${flowId}/unlock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to release lock");
  }

  return response.json();
}; 