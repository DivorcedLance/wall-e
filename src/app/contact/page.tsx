"use client";

import LandingLayout from "@/components/LandingPage";
import { Mail, Github } from "lucide-react";

export default function ContactPage() {
  return (
    <LandingLayout>
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-3xl font-bold">Contacto</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          ¿Tienes preguntas? Nos encantaría escucharte.
        </p>
        <div className="mt-8 space-y-6">
          <a href="mailto:divorcedlance@gmail.com" className="flex items-start gap-4 rounded-lg border border-border bg-surface p-5 hover:border-primary/30 transition-colors">
            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <h3 className="font-medium">Email</h3>
              <p className="text-sm text-muted-foreground">divorcedlance@gmail.com</p>
            </div>
          </a>
          <a href="https://github.com/DivorcedLance/wall-e" target="_blank" rel="noopener noreferrer" className="flex items-start gap-4 rounded-lg border border-border bg-surface p-5 hover:border-primary/30 transition-colors">
            <Github className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <h3 className="font-medium">Repositorio</h3>
              <p className="text-sm text-muted-foreground">github.com/DivorcedLance/wall-e</p>
            </div>
          </a>
          <div className="flex items-start gap-4 rounded-lg border border-border bg-surface p-5">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
            <div>
              <h3 className="font-medium">Teléfono</h3>
              <p className="text-sm text-muted-foreground">+51 967 738 908</p>
            </div>
          </div>
        </div>
      </main>
    </LandingLayout>
  );
}
