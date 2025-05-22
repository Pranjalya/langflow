import React, { useState, useEffect } from "react";
import { PermissionType, ResourceType, ResourcePermission } from "../types/permission";
import { PermissionService } from "../controllers/permission";
import PermissionModal from "../modals/PermissionModal";

interface PermissionListProps {
  resourceId: string;
  resourceType: ResourceType;
}

const PermissionList: React.FC<PermissionListProps> = ({ resourceId, resourceType }) => {
  const [permissions, setPermissions] = useState<ResourcePermission[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = async () => {
    try {
      const permissionService = PermissionService.getInstance();
      const permissions = await permissionService.getResourcePermissions(resourceId, resourceType);
      setPermissions(permissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch permissions");
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [resourceId, resourceType]);

  const handleRevokePermission = async (
    granteeUserId: string,
    permissionType: PermissionType
  ) => {
    try {
      const permissionService = PermissionService.getInstance();
      if (resourceType === ResourceType.FOLDER) {
        await permissionService.revokeFolderPermission(
          resourceId,
          granteeUserId,
          permissionType
        );
      } else {
        await permissionService.revokeFlowPermission(
          resourceId,
          granteeUserId,
          permissionType
        );
      }
      fetchPermissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke permission");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Permissions</h3>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Grant Permission
        </button>
      </div>

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Grantee User ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Permission Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Granted By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {permissions.map((permission) => (
              <tr key={permission.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {permission.grantee_user_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {permission.permission_type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {permission.granted_by_user_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <button
                    onClick={() =>
                      handleRevokePermission(
                        permission.grantee_user_id,
                        permission.permission_type
                      )
                    }
                    className="text-red-600 hover:text-red-900"
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PermissionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        resourceId={resourceId}
        resourceType={resourceType}
        onSuccess={fetchPermissions}
      />
    </div>
  );
};

export default PermissionList; 