export enum PermissionType {
  READ = "read",
  WRITE = "write",
  RUN = "run",
  DELETE = "delete",
  MANAGE_PERMISSIONS = "manage_permissions",
}

export enum ResourceType {
  FOLDER = "folder",
  FLOW = "flow",
}

export interface PermissionGrantRequest {
  grantee_user_id: string;
  permission_type: PermissionType;
}

export interface ResourcePermission {
  id: string;
  grantee_user_id: string;
  resource_id: string;
  resource_type: ResourceType;
  permission_type: PermissionType;
  granted_by_user_id: string | null;
  created_at: string;
  updated_at: string;
} 