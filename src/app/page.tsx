import { redirect } from "next/navigation";

// L'accueil redirige vers le tableau de bord (le middleware renvoie au login si non connecté).
export default function Home() {
  redirect("/dashboard");
}
