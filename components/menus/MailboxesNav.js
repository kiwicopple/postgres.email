import Link from "next/link"
import { classNames } from "../../lib/utils"

export default function MailboxesNav({ mailboxList, currentMailbox }) {
  return (
    <nav className="flex-1 px-2 pb-4 space-y-1">
      {mailboxList.map((item) => (
        <Link href={`/list/${item.id}`} passHref key={item.id}>
          <a
            className={classNames(
              item.id === currentMailbox
                ? "bg-gray-100 text-gray-900"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              "group flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer"
            )}
          >
            {item.id}
          </a>
        </Link>
      ))}
    </nav>
  )
}
