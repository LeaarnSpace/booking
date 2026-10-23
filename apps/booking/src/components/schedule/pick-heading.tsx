export function PickHeading({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold text-black">What would you like to book?</h1>
      <p className="text-base text-muted">{text}</p>
    </div>
  );
}
