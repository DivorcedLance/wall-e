import Link from "next/link";

export const metadata = {
  title: "Página no encontrada",
  description: "La página que buscas no existe o fue movida.",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
        <img src="/walle_logo_dark.svg" alt="W.A.L.L.-E." className="h-14 w-14" />
      </div>
      <h1 className="mt-6 text-3xl font-bold text-foreground">404</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        La página que buscas no existe, fue movida, o está temporalmente no disponible.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
