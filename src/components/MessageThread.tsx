import Link from "next/link"
import { usePathname } from "next/navigation"
import type { MessageListMetadata } from "@/types"
import { formatSenderInfo } from "@/lib/formatters"

interface MessageThreadProps {
  message: MessageListMetadata
  href: string
}

export default function MessageThread({ message, href }: MessageThreadProps) {
  const senderInfo = formatSenderInfo(message.from_addresses, message.from_email || undefined)
  const timestamp = new Date(message.ts!).toLocaleDateString()

  const pathname = usePathname()
  const isActive = decodeURI(pathname) === href
  const activeClass = "text-red"
  const inactiveClass = "text-gray-500"

  return (
    <Link
      href={href}
      className={isActive ? activeClass : inactiveClass}
    >
      <li className="flex flex-col p-2 py-4 border-b hover:bg-gray-800 text-sm">
        <div className="whitespace-nowrap text-ellipsis overflow-hidden pb-1">
          {message.subject}
        </div>
        <div className="flex flex-row">
          <span className="text-xs flex-grow whitespace-nowrap text-ellipsis overflow-hidden">
            {senderInfo.name}
          </span>
          <span className="text-xs">{timestamp}</span>
        </div>
      </li>
    </Link>
  )
}
