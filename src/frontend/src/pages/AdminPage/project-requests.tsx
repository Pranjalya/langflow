import { useGetProjectRequests, useUpdateProjectRequest } from "@/controllers/API/queries/projects";
import { useGetUsers } from "@/controllers/API/queries/auth";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import CustomLoader from "@/customization/components/custom-loader";
import { useState, useEffect } from "react";
import PaginatorComponent from "@/components/common/paginatorComponent";
import { PAGINATION_PAGE, PAGINATION_SIZE } from "@/constants/constants";

export default function ProjectRequestsPage() {
  const [pageIndex, setPageIndex] = useState(PAGINATION_PAGE);
  const [pageSize, setPageSize] = useState(PAGINATION_SIZE);
  const [userMap, setUserMap] = useState<Record<string, string>>({});

  const { data: projectRequests, isLoading } = useGetProjectRequests();
  const { mutate: updateProjectRequest } = useUpdateProjectRequest();
  const { mutate: fetchUsers, data: usersData } = useGetUsers({});

  useEffect(() => {
    fetchUsers({ skip: 0, limit: 1000 });
  }, [fetchUsers]);

  useEffect(() => {
    if (usersData && Array.isArray(usersData["users"])) {
      const newUserMap = Object.fromEntries(
        usersData["users"].map((u) => [u.id, u.username])
      );
      setUserMap(newUserMap);
    }
  }, [usersData]);

  const handleStatusUpdate = (requestId: string, status: string) => {
    updateProjectRequest({ id: requestId, status });
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <CustomLoader remSize={12} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="m-4 h-fit overflow-x-hidden overflow-y-scroll rounded-md border-2 bg-background custom-scroll">
        <Table className="table-fixed outline-1">
          <TableHeader className="table-fixed bg-muted outline-1">
            <TableRow>
              <TableHead className="h-10">Project Name</TableHead>
              <TableHead className="h-10">Requested By</TableHead>
              <TableHead className="h-10">Justification</TableHead>
              <TableHead className="h-10">Status</TableHead>
              <TableHead className="h-10">Created At</TableHead>
              <TableHead className="h-10">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projectRequests?.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="truncate py-2">{request.project_name}</TableCell>
                <TableCell className="truncate py-2">{userMap[request.requester_id] || request.requester_id}</TableCell>
                <TableCell className="truncate py-2">{request.justification}</TableCell>
                <TableCell className="truncate py-2">{request.status}</TableCell>
                <TableCell className="truncate py-2">
                  {format(new Date(request.created_at), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="flex gap-2 py-2">
                  {request.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusUpdate(request.id, "approved")}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusUpdate(request.id, "rejected")}
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

      <PaginatorComponent
        pageIndex={pageIndex}
        pageSize={pageSize}
        totalRowsCount={projectRequests?.length || 0}
        paginate={(index, size) => {
          setPageIndex(index);
          setPageSize(size);
        }}
        rowsCount={[10, 20, 50, 100]}
      />
    </div>
  );
} 