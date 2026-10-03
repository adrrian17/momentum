import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import SignInForm from "@/components/sign-in-form";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ error: z.string().optional() }),
  component: RouteComponent,
});

function RouteComponent() {
  const { error } = Route.useSearch();

  return (
    <>
      {error && (
        <p role="alert" className="text-destructive mx-auto mt-4 max-w-md px-6">
          The verification link is invalid or expired. Sign in to request a new
          link.
        </p>
      )}
      <SignInForm />
    </>
  );
}
