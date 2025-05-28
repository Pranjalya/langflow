import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import MultiselectComponent from "@/components/core/parameterRenderComponent/components/multiselectComponent";
import { useEffect, useState } from "react";
import { useGetUsers } from "@/controllers/API/queries/auth/use-get-users-page";
import useAuthStore from "@/stores/authStore";

interface AddProjectRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { project_name: string; justification: string; requested_users: string[] }) => void;
  isLoading: boolean;
}

export const AddProjectRequestDialog = ({ open, onOpenChange, onSubmit, isLoading }: AddProjectRequestDialogProps) => {
  const [projectName, setProjectName] = useState("");
  const [justification, setJustification] = useState("");
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
      setProjectName("");
      setJustification("");
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
    if (!projectName.trim() || !justification.trim()) return;
    onSubmit({ project_name: projectName.trim(), justification: justification.trim(), requested_users: users });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="project-name" className="font-medium text-sm">Project Name<span className="text-red-500">*</span></label>
            <input
              id="project-name"
              className="border rounded px-3 py-2 text-sm"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              required
              autoFocus
              placeholder="Enter project name"
            />
            {touched && !projectName.trim() && <span className="text-xs text-red-500">Project name is required.</span>}
          </div>
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
          <div className="flex flex-col gap-1">
            <label className="font-medium text-sm">Users to include</label>
            <MultiselectComponent
              disabled={usersStatus === "pending"}
              value={selectedUsernames}
              options={usernameOptions}
              handleOnNewValue={({ value }) => handleUsersChange(value)}
              id="users-with-access"
              editNode={false}
            />
            <span className="text-xs text-muted-foreground">Search and select users to include in the project. You (the requester) are always included.</span>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={isLoading || !projectName.trim() || !justification.trim()}
              loading={isLoading}
              className="w-full"
            >
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 