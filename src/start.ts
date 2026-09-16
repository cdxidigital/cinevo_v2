import { createCsrfMiddleware, createStart } from "@tanstack/react-start";
import { clerkMiddleware } from "@clerk/tanstack-react-start/server";

const publishableKey =
  process.env.CLERK_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const secretKey = process.env.CLERK_SECRET_KEY;

if (publishableKey && !process.env.CLERK_PUBLISHABLE_KEY) {
  process.env.CLERK_PUBLISHABLE_KEY = publishableKey;
}

export const startInstance = createStart(() => ({
  requestMiddleware:
    process.env.NODE_ENV === "production"
      ? [createCsrfMiddleware(), clerkMiddleware({ publishableKey, secretKey })]
      : [],
}));
