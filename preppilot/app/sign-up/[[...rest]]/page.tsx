import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { isClerkConfigured } from "@/lib/auth/clerk";

export default function Page() {
  if (!isClerkConfigured()) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md border rounded-lg p-6 space-y-3">
          <h1 className="text-xl font-semibold">Configure Clerk keys</h1>
          <p className="text-sm text-muted-foreground">
            Sign-up is disabled because Clerk is using placeholder keys in
            <code className="px-1">.env.local</code>. Add your real
            <code className="px-1">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and
            <code className="px-1">CLERK_SECRET_KEY</code>.
          </p>
          <Link href="/">
            <Button variant="outline" size="sm">Back to home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <SignUp />
    </div>
  );
}
