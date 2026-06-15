import Link from "next/link";
import { RefreshCcw } from "lucide-react";

export default function TemporaryServiceIssue({
  title = "Temporary connection issue",
  message = "We could not load this part of PrepPilot right now. Your account and chats are safe. Please retry in a moment.",
  retryHref = "/chat",
}: {
  title?: string;
  message?: string;
  retryHref?: string;
}) {
  return (
    <div className="flex-1 bg-[#f6f7f8] px-4 py-10">
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center">
        <div className="mb-4 grid h-11 w-11 place-items-center rounded-md bg-[#151515] text-white">
          <RefreshCcw className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#151515]">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
        <Link
          href={retryHref}
          className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#151515] px-4 text-sm font-medium text-white transition-colors hover:bg-[#242424]"
        >
          <RefreshCcw className="h-4 w-4" />
          Try again
        </Link>
      </div>
    </div>
  );
}
