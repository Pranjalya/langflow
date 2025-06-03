import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useEffect, useState } from "react";
import { useGetUsers } from "@/controllers/API/queries/auth/use-get-users-page";
import useAuthStore from "@/stores/authStore";
import { useCreateProjectRequest } from "@/controllers/API/queries/projects";

interface UserPermission {
  id: string;
  username: string;
  can_read: boolean;
  can_run: boolean;
  can_edit: boolean;
  is_project_admin?: boolean;
}

interface AddProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; description: string; users: UserPermission[] }) => void;
  isLoading: boolean;
}

export const AddProjectDialog = ({ open, onOpenChange, onSubmit, isLoading }: AddProjectDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [justification, setJustification] = useState("");
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [touched, setTouched] = useState(false);

  // Get current user
  const userData = useAuthStore((state) => state.userData);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const currentUserId = userData?.id;
  const currentUsername = userData?.username;
  const userLevel = userData?.user_level;

  // Fetch users
  const { mutate: fetchUsers, data: usersData, status: usersStatus } = useGetUsers({});
  const [userOptions, setUserOptions] = useState<{ id: string; username: string }[]>([]);
  const [usernameToId, setUsernameToId] = useState<Record<string, string>>({});
  const [idToUsername, setIdToUsername] = useState<Record<string, string>>({});

  // Project request mutation
  const { mutate: createProjectRequest, isPending: isCreatingRequest } = useCreateProjectRequest();

  useEffect(() => {
    if (open) {
      fetchUsers({ skip: 0, limit: 1000 });
    }
  }, [open, fetchUsers]);

  useEffect(() => {
    if (usersData && Array.isArray(usersData["users"])) {
      setUserOptions(usersData["users"].map((u) => ({ id: u.id, username: u.username })));
      setUsernameToId(Object.fromEntries(usersData["users"].map((u) => [u.username, u.id])));
      setIdToUsername(Object.fromEntries(usersData["users"].map((u) => [u.id, u.username])));
    }
  }, [usersData]);

  // Ensure current user is always selected when dialog opens
  useEffect(() => {
    if (open && currentUserId && currentUsername) {
      setUserPermissions((prev) => {
        if (!prev.some(p => p.id === currentUserId)) {
          return [{
            id: currentUserId,
            username: currentUsername,
            can_read: true,
            can_run: true,
            can_edit: true,
            is_project_admin: true
          }, ...prev.filter(p => p.id !== currentUserId)];
        }
        return prev;
      });
    }
    if (!open) {
      setName("");
      setDescription("");
      setJustification("");
      setUserPermissions(currentUserId && currentUsername ? [{
        id: currentUserId,
        username: currentUsername,
        can_read: true,
        can_run: true,
        can_edit: true,
        is_project_admin: true
      }] : []);
      setTouched(false);
    }
  }, [open, currentUserId, currentUsername]);

  const handleUserSelect = (username: string) => {
    const userId = usernameToId[username];
    if (!userId) return;

    setUserPermissions(prev => {
      if (!prev.some(p => p.id === userId)) {
        return [...prev, {
          id: userId,
          username,
          can_read: true,
          can_run: false,
          can_edit: false,
          is_project_admin: false
        }];
      }
      return prev;
    });
  };

  const handleUserDeselect = (username: string) => {
    const userId = usernameToId[username];
    if (!userId || userId === currentUserId) return; // Prevent removing current user

    setUserPermissions(prev => prev.filter(p => p.id !== userId));
  };

  const handlePermissionChange = (userId: string, permission: 'can_read' | 'can_run' | 'can_edit' | 'is_project_admin', value: boolean) => {
    if (userId === currentUserId) return; // Prevent changing current user's permissions

    setUserPermissions(prev => prev.map(p => 
      p.id === userId ? { ...p, [permission]: value } : p
    ));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!name.trim()) return;

    if (userLevel === "SUPER_ADMIN") {
      // Super admin creates project directly
      onSubmit({ 
        name: name.trim(), 
        description: description.trim(), 
        users: userPermissions 
      });
    } else if (userLevel === "PROJECT_ADMIN") {
      // Project admin creates project request
      createProjectRequest({
        project_name: name.trim(),
        justification: justification.trim(),
        requested_users: userPermissions.map(p => p.id)
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{userLevel === "SUPER_ADMIN" ? "Create New Project" : "Request New Project"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="project-name" className="font-medium text-sm">Project Name<span className="text-red-500">*</span></label>
            <input
              id="project-name"
              className="border rounded px-3 py-2 text-sm"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
              placeholder="Enter project name"
            />
            {touched && !name.trim() && <span className="text-xs text-red-500">Project name is required.</span>}
          </div>
          {userLevel === "SUPER_ADMIN" ? (
            <div className="flex flex-col gap-1">
              <label htmlFor="project-description" className="font-medium text-sm">Description</label>
              <textarea
                id="project-description"
                className="border rounded px-3 py-2 text-sm min-h-[60px]"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Enter project description (optional)"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label htmlFor="project-justification" className="font-medium text-sm">Justification<span className="text-red-500">*</span></label>
              <textarea
                id="project-justification"
                className="border rounded px-3 py-2 text-sm min-h-[60px]"
                value={justification}
                onChange={e => setJustification(e.target.value)}
                required
                placeholder="Explain why you need this project"
              />
              {touched && !justification.trim() && <span className="text-xs text-red-500">Justification is required.</span>}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="font-medium text-sm">Users with access</label>
            <div className="border rounded p-2">
              {userPermissions.map(user => (
                <div key={user.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{user.username}</span>
                    {user.id === currentUserId && <span className="text-xs text-muted-foreground">(You)</span>}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`read-${user.id}`}
                        checked={user.can_read}
                        onCheckedChange={(checked) => handlePermissionChange(user.id, 'can_read', checked as boolean)}
                        disabled={user.id === currentUserId}
                      />
                      <label htmlFor={`read-${user.id}`} className="text-sm">Read</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`run-${user.id}`}
                        checked={user.can_run}
                        onCheckedChange={(checked) => handlePermissionChange(user.id, 'can_run', checked as boolean)}
                        disabled={user.id === currentUserId}
                      />
                      <label htmlFor={`run-${user.id}`} className="text-sm">Run</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`edit-${user.id}`}
                        checked={user.can_edit}
                        onCheckedChange={(checked) => handlePermissionChange(user.id, 'can_edit', checked as boolean)}
                        disabled={user.id === currentUserId}
                      />
                      <label htmlFor={`edit-${user.id}`} className="text-sm">Edit</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`admin-${user.id}`}
                        checked={user.is_project_admin}
                        onCheckedChange={(checked) => handlePermissionChange(user.id, 'is_project_admin', checked as boolean)}
                        disabled={user.id === currentUserId}
                      />
                      <label htmlFor={`admin-${user.id}`} className="text-sm">Project Admin</label>
                    </div>
                    {user.id !== currentUserId && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUserDeselect(user.username)}
                        className="h-6 w-6 p-0"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <div className="mt-2">
                <select
                  className="w-full border rounded px-2 py-1 text-sm"
                  onChange={(e) => handleUserSelect(e.target.value)}
                  value=""
                >
                  <option value="">Add user...</option>
                  {userOptions
                    .filter(u => !userPermissions.some(p => p.id === u.id))
                    .map(u => (
                      <option key={u.id} value={u.username}>
                        {u.username}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading || isCreatingRequest}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || isCreatingRequest}
            >
              {userLevel === "SUPER_ADMIN" ? "Create Project" : "Submit Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 