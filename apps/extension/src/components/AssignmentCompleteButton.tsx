export function AssignmentCompleteButton({
  onClick,
  isPending,
  disabled = false,
}: {
  onClick: () => void;
  isPending: boolean;
  disabled?: boolean;
}) {
  return (
    <button type="button" className="secondary-button" onClick={onClick} disabled={isPending || disabled}>
      {isPending ? "Completing assignment..." : "Complete Assignment"}
    </button>
  );
}