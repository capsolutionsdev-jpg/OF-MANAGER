import { redirect } from "next/navigation";

// L'aide de la plateforme = le support technique (messagerie client ↔ console dev).
// On garde /aide comme alias historique et on redirige vers /support.
export default function AidePage() {
  redirect("/support");
}
