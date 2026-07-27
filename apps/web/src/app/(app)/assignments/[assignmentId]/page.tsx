import { notFound } from "next/navigation";
import { AssignmentDetailShell } from "@/features/assignments/assignment-detail-shell";
import { getAssignmentDetail } from "@/features/assignments/data";
import { requireUser } from "@/lib/auth/session";

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  await requireUser();
  const { assignmentId } = await params;
  const assignment = await getAssignmentDetail(assignmentId);

  if (!assignment) {
    notFound();
  }

  return <AssignmentDetailShell assignment={assignment} />;
}