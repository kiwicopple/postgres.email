import { XCircleIcon } from "@heroicons/react/solid"

const ErrorDisplay = ({ error }: { error: any }) => {
  return (
    <div className="rounded-md bg-red-50 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <XCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
        </div>

        <div className="ml-3">
          <h3 className="font-medium text-red-800 text-sm">
            An error occurred with message:
          </h3>
          <div className="mt-2 text-red-700 text-sm">{error.message}</div>
        </div>
      </div>
    </div>
  )
}

export default ErrorDisplay
