import React, { useState, useEffect } from "react";
import { PermissionType, ResourceType, PermissionGrantRequest } from "../types/permission";
import { PermissionService } from "../controllers/permission";
import { useGetUsers } from "../controllers/API/queries/auth/use-get-users-page";

interface PermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceId: string;
  resourceType: ResourceType;
  onSuccess?: () => void;
}

interface User {
  id: string;
  username: string;
}

const PermissionModal: React.FC<PermissionModalProps> = ({
  isOpen,
  onClose,
  resourceId,
  resourceType,
  onSuccess,
}) => {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [permissionType, setPermissionType] = useState<PermissionType>(PermissionType.READ);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  const { mutate: getUsers } = useGetUsers({});

  useEffect(() => {
    if (isOpen) {
      getUsers(
        { skip: 0, limit: 100 },
        {
          onSuccess: (response) => {
            setUsers(response.users);
          },
          onError: (error) => {
            setError("Failed to fetch users");
          },
        }
      );
    }
  }, [isOpen, getUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedUserId) {
      setError("Please select a user");
      return;
    }

    try {
      const request: PermissionGrantRequest = {
        grantee_user_id: selectedUserId,
        permission_type: permissionType,
      };

      const permissionService = PermissionService.getInstance();
      if (resourceType === ResourceType.FOLDER) {
        await permissionService.grantFolderPermission(resourceId, request);
      } else {
        await permissionService.grantFlowPermission(resourceId, request);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to grant permission");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">Grant Permission</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select User
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            >
              <option value="">Select a user...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Permission Type
            </label>
            <select
              value={permissionType}
              onChange={(e) => setPermissionType(e.target.value as PermissionType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {Object.values(PermissionType).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="mb-4 text-red-600 text-sm">{error}</div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Grant Permission
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PermissionModal; 