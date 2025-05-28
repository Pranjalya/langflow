import { useGetProjectRequests, useUpdateProjectRequest } from "../../controllers/API/queries/projects";
import { Button } from "../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

export default function ProjectRequestsPage() {
  const { data: projectRequests, isLoading } = useGetProjectRequests();
  const updateProjectRequest = useUpdateProjectRequest();

  const handleStatusUpdate = async (id: string, status: string) => {
    await updateProjectRequest.mutateAsync({ id, status });
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-8 text-2xl font-bold">Project Requests</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project Name</TableHead>
            <TableHead>Justification</TableHead>
            <TableHead>Requested Users</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projectRequests?.map((request) => (
            <TableRow key={request.id}>
              <TableCell>{request.project_name}</TableCell>
              <TableCell>{request.justification}</TableCell>
              <TableCell>{request.requested_users.join(", ")}</TableCell>
              <TableCell>{request.status}</TableCell>
              <TableCell>
                {format(new Date(request.created_at), "MMM d, yyyy HH:mm")}
              </TableCell>
              <TableCell>
                {request.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusUpdate(request.id, "approved")}
                      disabled={updateProjectRequest.isPending}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusUpdate(request.id, "rejected")}
                      disabled={updateProjectRequest.isPending}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 