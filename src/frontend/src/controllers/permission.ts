import { PermissionGrantRequest, PermissionType, ResourceType, ResourcePermission } from "../types/permission";
import { API_URL } from "@/constants/api";

export class PermissionService {
  private static instance: PermissionService;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = API_URL;
  }

  public static getInstance(): PermissionService {
    if (!PermissionService.instance) {
      PermissionService.instance = new PermissionService();
    }
    return PermissionService.instance;
  }

  async getResourcePermissions(
    resourceId: string,
    resourceType: ResourceType
  ): Promise<ResourcePermission[]> {
    const response = await fetch(
      `${this.baseUrl}/${resourceType}/${resourceId}/permissions`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch permissions: ${response.statusText}`);
    }

    return response.json();
  }

  async grantFolderPermission(folderId: string, request: PermissionGrantRequest): Promise<void> {
    const response = await fetch(`${this.baseUrl}/folders/${folderId}/permissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to grant folder permission: ${response.statusText}`);
    }
  }

  async revokeFolderPermission(
    folderId: string,
    granteeUserId: string,
    permissionType: PermissionType
  ): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/folders/${folderId}/permissions/${granteeUserId}/${permissionType}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to revoke folder permission: ${response.statusText}`);
    }
  }

  async grantFlowPermission(flowId: string, request: PermissionGrantRequest): Promise<void> {
    const response = await fetch(`${this.baseUrl}/flows/${flowId}/permissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to grant flow permission: ${response.statusText}`);
    }
  }

  async revokeFlowPermission(
    flowId: string,
    granteeUserId: string,
    permissionType: PermissionType
  ): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/flows/${flowId}/permissions/${granteeUserId}/${permissionType}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to revoke flow permission: ${response.statusText}`);
    }
  }
} 