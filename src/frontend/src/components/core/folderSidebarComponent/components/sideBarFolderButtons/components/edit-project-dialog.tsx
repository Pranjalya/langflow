import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useEffect, useState } from "react";
import useAuthStore from "@/stores/authStore";
import { useUpdateProjectUsers } from "@/controllers/API/queries/projects/use-update-project-users";
import { useGetProjectUsers } from "@/controllers/API/queries/projects/use-get-project-users";
import { useRemoveProjectUser } from "@/controllers/API/queries/projects/use-remove-project-user";
import { useGetUsers } from "@/controllers/API/queries/users/use-get-users";
import { useAddProjectUser } from "@/controllers/API/queries/projects/use-add-project-user";
import { Trash2, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserPermission {
  user_id: string;
  username?: string;
  can_read: boolean;
  can_run: boolean;
  can_edit: boolean;
  is_project_admin?: boolean;
}

interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  onSuccess?: () => void;
}

export const EditProjectDialog = ({ 
  open, 
  onOpenChange, 
  projectId,
  projectName,
  onSuccess 
}: EditProjectDialogProps) => {
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [touched, setTouched] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [newUserPermissions, setNewUserPermissions] = useState({
    can_read: true,
    can_run: false,
    can_edit: false,
  });

  // Get current user
  const userData = useAuthStore((state) => state.userData);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const currentUserId = userData?.id;
  const currentUsername = userData?.username;
  const userLevel = userData?.user_level;

  // Get project users
  const { data: projectUsersData, isLoading: isLoadingProjectUsers, refetch } = useGetProjectUsers(projectId);

  // Get all users
  const { data: allUsersData, isLoading: isLoadingAllUsers } = useGetUsers();

  // Update project users mutation
  const { mutate: updateProjectUsers, isPending: isUpdating } = useUpdateProjectUsers();

  // Remove project user mutation
  const { mutate: removeProjectUser, isPending: isRemoving } = useRemoveProjectUser();

  // Add project user mutation
  const { mutate: addProjectUser, isPending: isAdding } = useAddProjectUser();

  // Reset state when dialog is closed
  const handleClose = () => {
    onOpenChange(false);
    // Reset state after dialog is closed
    setTimeout(() => {
      setUserPermissions([]);
      setTouched(false);
      setSelectedUserId("");
      setNewUserPermissions({
        can_read: true,
        can_run: false,
        can_edit: false,
      });
    }, 300); // Match the dialog close animation duration
  };

  // Fetch fresh data when dialog is opened
  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  // Update user permissions when data is loaded
  useEffect(() => {
    if (projectUsersData?.users && open) {
      setUserPermissions(projectUsersData.users.map(user => ({
        user_id: user.user_id,
        username: user.username,
        can_read: user.can_read,
        can_run: user.can_run,
        can_edit: user.can_edit,
        is_project_admin: user.is_project_admin
      })));
    }
  }, [projectUsersData, open]);

  const handlePermissionChange = (userId: string, permission: 'can_read' | 'can_run' | 'can_edit' | 'is_project_admin', value: boolean) => {
    if (userId === currentUserId) return; // Prevent changing current user's permissions

    setUserPermissions(prev => prev.map(p => 
      p.user_id === userId ? { ...p, [permission]: value } : p
    ));
  };

  const handleNewUserPermissionChange = (permission: 'can_read' | 'can_run' | 'can_edit', value: boolean) => {
    setNewUserPermissions(prev => ({ ...prev, [permission]: value }));
  };

  const handleAddUser = () => {
    if (!selectedUserId) return;

    addProjectUser(
      {
        projectId,
        userId: selectedUserId,
        permissions: newUserPermissions
      },
      {
        onSuccess: () => {
          setSelectedUserId("");
          setNewUserPermissions({
            can_read: true,
            can_run: false,
            can_edit: false,
          });
        }
      }
    );
  };

  const handleRemoveUser = (userId: string) => {
    if (userId === currentUserId) return; // Prevent removing current user

    removeProjectUser(
      { projectId, userId },
      {
        onSuccess: () => {
          // The query invalidation in the mutation will trigger a refetch
          // and update the UI automatically
        }
      }
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched(true);

    updateProjectUsers(
      {
        projectId,
        users: userPermissions.map(p => ({
          user_id: p.user_id,
          can_read: p.can_read,
          can_run: p.can_run,
          can_edit: p.can_edit,
          is_project_admin: p.is_project_admin
        }))
      },
      {
        onSuccess: () => {
          onSuccess?.();
          handleClose();
        }
      }
    );
  };

  // Filter out users that are already in the project
  const availableUsers = allUsersData?.users.filter(
    user => !userPermissions.some(p => p.user_id === user.id)
  ) || [];

  if (isLoadingProjectUsers || isLoadingAllUsers) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Project: {projectName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            {/* Add User Section */}
            <div className="flex flex-col gap-2">
              <label className="font-medium text-sm">Add User</label>
              <div className="flex items-center gap-2">
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="new-user-read"
                      checked={newUserPermissions.can_read}
                      onCheckedChange={(checked) => handleNewUserPermissionChange('can_read', checked as boolean)}
                    />
                    <label htmlFor="new-user-read" className="text-sm">Read</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="new-user-run"
                      checked={newUserPermissions.can_run}
                      onCheckedChange={(checked) => handleNewUserPermissionChange('can_run', checked as boolean)}
                    />
                    <label htmlFor="new-user-run" className="text-sm">Run</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="new-user-edit"
                      checked={newUserPermissions.can_edit}
                      onCheckedChange={(checked) => handleNewUserPermissionChange('can_edit', checked as boolean)}
                    />
                    <label htmlFor="new-user-edit" className="text-sm">Edit</label>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAddUser}
                  disabled={!selectedUserId || isAdding}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Existing Users Section */}
            <div className="flex flex-col gap-1">
              <label className="font-medium text-sm">Users with access</label>
              <div className="border rounded p-2">
                {userPermissions.map(user => (
                  <div key={user.user_id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{user.username}</span>
                      {user.user_id === currentUserId && <span className="text-xs text-muted-foreground">(You)</span>}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`read-${user.user_id}`}
                          checked={user.can_read}
                          onCheckedChange={(checked) => handlePermissionChange(user.user_id, 'can_read', checked as boolean)}
                          disabled={user.user_id === currentUserId}
                        />
                        <label htmlFor={`read-${user.user_id}`} className="text-sm">Read</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`run-${user.user_id}`}
                          checked={user.can_run}
                          onCheckedChange={(checked) => handlePermissionChange(user.user_id, 'can_run', checked as boolean)}
                          disabled={user.user_id === currentUserId}
                        />
                        <label htmlFor={`run-${user.user_id}`} className="text-sm">Run</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`edit-${user.user_id}`}
                          checked={user.can_edit}
                          onCheckedChange={(checked) => handlePermissionChange(user.user_id, 'can_edit', checked as boolean)}
                          disabled={user.user_id === currentUserId}
                        />
                        <label htmlFor={`edit-${user.user_id}`} className="text-sm">Edit</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`admin-${user.user_id}`}
                          checked={user.is_project_admin}
                          onCheckedChange={(checked) => handlePermissionChange(user.user_id, 'is_project_admin', checked as boolean)}
                          disabled={user.user_id === currentUserId}
                        />
                        <label htmlFor={`admin-${user.user_id}`} className="text-sm">Project Admin</label>
                      </div>
                      {user.user_id !== currentUserId && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveUser(user.user_id)}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 