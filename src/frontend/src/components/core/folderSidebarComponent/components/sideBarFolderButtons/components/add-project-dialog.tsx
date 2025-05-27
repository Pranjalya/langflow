import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import MultiselectComponent from "@/components/core/parameterRenderComponent/components/multiselectComponent";
import { useEffect, useState } from "react";
import { useGetUsers } from "@/controllers/API/queries/auth/use-get-users-page";
import useAuthStore from "@/stores/authStore";

interface AddProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; description: string; users: string[] }) => void;
  isLoading: boolean;
}

export const AddProjectDialog = ({ open, onOpenChange, onSubmit, isLoading }: AddProjectDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [users, setUsers] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);

  // Get current user
  const userData = useAuthStore((state) => state.userData);
  const currentUserId = userData?.id;
  const currentUsername = userData?.username;

  // Fetch users
  const { mutate: fetchUsers, data: usersData, status: usersStatus } = useGetUsers({});
  const [userOptions, setUserOptions] = useState<{ id: string; username: string }[]>([]);
  const [usernameToId, setUsernameToId] = useState<Record<string, string>>({});
  const [idToUsername, setIdToUsername] = useState<Record<string, string>>({});

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
    if (open && currentUserId) {
      setUsers((prev) => {
        if (!prev.includes(currentUserId)) {
          return [currentUserId, ...prev.filter((id) => id !== currentUserId)];
        }
        return prev;
      });
    }
    if (!open) {
      setName("");
      setDescription("");
      setUsers(currentUserId ? [currentUserId] : []);
      setTouched(false);
    }
  }, [open, currentUserId]);

  // For the dropdown: use usernames as options
  const usernameOptions = userOptions.map((u) => u.username);
  // For the dropdown value: convert selected user ids to usernames
  const selectedUsernames = users.map((id) => idToUsername[id]).filter(Boolean);

  // Prevent removal of current user (by username)
  const handleUsersChange = (value: string[]) => {
    if (!currentUserId || !currentUsername) return;
    // Always keep current user's username in the list
    if (!value.includes(currentUsername)) {
      value = [currentUsername, ...value];
    }
    // Convert usernames to ids, filter out any not in usernameToId
    const newIds = value.map((username) => usernameToId[username]).filter(Boolean);
    // Always keep current user id
    if (!newIds.includes(currentUserId)) {
      setUsers([currentUserId, ...newIds]);
    } else {
      setUsers(newIds);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: description.trim(), users });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
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
          <div className="flex flex-col gap-1">
            <label className="font-medium text-sm">Users with access</label>
            <MultiselectComponent
              disabled={usersStatus === "pending"}
              value={selectedUsernames}
              options={usernameOptions}
              handleOnNewValue={({ value }) => handleUsersChange(value)}
              id="users-with-access"
              editNode={false}
            />
            <span className="text-xs text-muted-foreground">Search and select users to grant access. You (the creator) are always included.</span>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={isLoading || !name.trim()}
              loading={isLoading}
              className="w-full"
            >
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 