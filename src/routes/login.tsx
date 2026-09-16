import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/cinevo/auth-form";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return <AuthPage mode="login" />;
}
