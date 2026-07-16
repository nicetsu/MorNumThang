import { redirect } from "next/navigation";

// ponytail: /me folded into /patients — keep a bounce for old links.
export default function MeRedirect() {
  redirect("/patients");
}
