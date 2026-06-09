import { redirect } from "next/navigation";

// Single-tenant: the middleware already gates everything, so the root just
// forwards to the dashboard (or gets bounced to /login by the middleware).
export default function HomePage() {
  redirect("/app/dashboard");
}
