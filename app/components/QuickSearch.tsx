/*
  This example requires Tailwind CSS v2.0+ 
  
  This example requires some changes to your config:
  
  ```
  // tailwind.config.js
  module.exports = {
    // ...
    plugins: [
      // ...
      require('@tailwindcss/forms'),
    ],
  }
  ```
*/
import { useNavigate } from "@remix-run/react"

export default function QuickSearch() {
  const navigate = useNavigate()

  const handleKeyDown = (event: any) => {
    if (event.key === "Enter") {
      navigate({
        pathname: "/lists/search",
        search: `?q=${event.target.value}`,
      })
    }
  }

  return (
    <div>
      {/* <label
        htmlFor="search"
        className="block text-sm font-medium text-gray-700"
      >
        Quick search
      </label> */}
      <div className="mt-1 relative flex items-center">
        <input
          type="text"
          name="search"
          id="search"
          // disabled={true}
          placeholder="Search"
          className="shadow-sm focus:ring-gray-600 focus:border-gray-600 block w-full pr-12 sm:text-sm border rounded-md bg-gray-900 border-gray-800"
          onKeyDown={handleKeyDown}
        />
        {/* <div className="absolute inset-y-0 right-0 flex py-1.5 pr-1.5">
          <kbd className="inline-flex items-center border border-gray-800 rounded px-2 text-sm font-sans font-medium text-gray-400">
            ⌘K
          </kbd>
        </div> */}
      </div>
    </div>
  )
}
