import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/cinevo/auth-form";

export const Route = createFileRoute("/signup")({ component: Signup });

function Signup() {
  return <AuthPage mode="signup" />;
}
