export function AssignmentCompleteButton({
  onClick,
  isPending,
}: {
  onClick: () => void;
  isPending: boolean;
}) {
  return (
    <button type="button" className="secondary-button" onClick={onClick} disabled={isPending}>
      {isPending ? "Completing assignment..." : "Complete Assignment"}
    </button>
  );
}