type ButtonProps = {
  size?: "xs" | "sm" | "md" | "lg"
  label: string
  isActive: boolean
  onClick: () => void
}

export default function ButtonGroup({
  size = "xs",
  label,
  onClick,
  isActive,
}: ButtonProps) {
  const bgColor = isActive ? "bg-gray-200" : "bg-white hover:bg-gray-50"
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${bgColor} relative inline-flex items-center px-2 py-1 rounded border border-gray-300  text-${size} font-medium text-gray-700  focus:z-10 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500`}
    >
      {label}
    </button>
  )
}
