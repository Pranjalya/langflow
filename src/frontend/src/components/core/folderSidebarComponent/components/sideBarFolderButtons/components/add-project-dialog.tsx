import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import MultiselectComponent from "@/components/core/parameterRenderComponent/components/multiselectComponent";
import { useEffect, useState } from "react";
import { useGetUsers } from "@/controllers/API/queries/auth/use-get-users-page";

interface AddProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; description: string; users: string[] }) => void;
  isLoading: boolean;
}

export default function AddProjectDialog({ open, onOpenChange, onSubmit, isLoading }: AddProjectDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [users, setUsers] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);

  // Fetch users
  const { mutate: fetchUsers, data: usersData, status: usersStatus } = useGetUsers({});
  const [userOptions, setUserOptions] = useState<string[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      fetchUsers({ skip: 0, limit: 1000 });
    }
  }, [open, fetchUsers]);

  useEffect(() => {
    if (usersData && Array.isArray(usersData)) {
      setUserOptions(usersData.map((u) => u.id));
      setUserMap(Object.fromEntries(usersData.map((u) => [u.id, u.username])));
    }
  }, [usersData]);

  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setUsers([]);
      setTouched(false);
    }
  }, [open]);

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
              value={users}
              options={userOptions.map(id => userMap[id] ? `${id}::${userMap[id]}` : id)}
              handleOnNewValue={({ value }) => setUsers(value.map(v => v.split("::")[0]))}
              id="users-with-access"
              editNode={false}
            />
            <span className="text-xs text-muted-foreground">Search and select users to grant access.</span>
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