export function ErrorMessage({ message = 'Something went wrong. Please try again.' }) {
  return (
    <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-400">
      {message}
    </div>
  )
}
