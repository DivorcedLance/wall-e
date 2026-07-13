"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Mail, Phone, MapPin, Calendar, Crown, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/components/ThemeProvider";

interface FakeClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  tier: "base" | "standard" | "premium" | "enterprise";
  mowers: number;
  spaces: number;
  surface: string;
  joinDate: string;
  status: "active" | "trial" | "inactive";
  lastActivity: string;
}

const FAKE_CLIENTS: FakeClient[] = [
  {
    id: "c1",
    name: "Municipalidad de Surco",
    email: "contacto@munisurco.gob.pe",
    phone: "+51 1 234-5678",
    address: "Av. José Carlos Mariátegui 450, Santiago de Surco",
    tier: "premium",
    mowers: 12,
    spaces: 8,
    surface: "~45,000 m²",
    joinDate: "2024-03-15",
    status: "active",
    lastActivity: "Hace 2 horas",
  },
  {
    id: "c2",
    name: "Club El Golf Residencias",
    email: "admin@elgolf.pe",
    phone: "+51 1 456-7890",
    address: "Av. La Molina 1200, La Molina",
    tier: "standard",
    mowers: 5,
    spaces: 4,
    surface: "~18,000 m²",
    joinDate: "2024-06-22",
    status: "active",
    lastActivity: "Hace 5 horas",
  },
  {
    id: "c3",
    name: "Universidad Pacifico",
    email: "facilities@upacifico.edu.pe",
    phone: "+51 1 205-2000",
    address: "Av. Central 1500, San Isidro",
    tier: "premium",
    mowers: 8,
    spaces: 6,
    surface: "~32,000 m²",
    joinDate: "2024-01-10",
    status: "active",
    lastActivity: "Hace 1 día",
  },
  {
    id: "c4",
    name: "Conjunto residencial Los Olivos",
    email: "admin@losolivs.com",
    phone: "+51 1 532-1000",
    address: "Calle Los Olivos 800, San Martin de Porres",
    tier: "base",
    mowers: 2,
    spaces: 2,
    surface: "~5,500 m²",
    joinDate: "2024-09-01",
    status: "trial",
    lastActivity: "Hace 30 min",
  },
  {
    id: "c5",
    name: "Parque Industrial Villa El Salvador",
    email: "ops@parqueindustrial.pe",
    phone: "+51 1 612-3456",
    address: "Av. Industrial 500, Villa El Salvador",
    tier: "enterprise",
    mowers: 20,
    spaces: 12,
    surface: "~85,000 m²",
    joinDate: "2023-11-20",
    status: "active",
    lastActivity: "Hace 15 min",
  },
  {
    id: "c6",
    name: "Hotel Country Club Lima",
    email: "maintenance@countryclubhotel.pe",
    phone: "+51 1 213-5000",
    address: "Av. Javier Prado Este 4600, Santiago de Surco",
    tier: "standard",
    mowers: 4,
    spaces: 3,
    surface: "~12,000 m²",
    joinDate: "2024-08-05",
    status: "active",
    lastActivity: "Hace 3 horas",
  },
  {
    id: "c7",
    name: "Centro Comercial MegaPlaza",
    email: "facilities@megaplaza.com.pe",
    phone: "+51 1 615-7890",
    address: "Av. Guardia Civil 450, Carabayllo",
    tier: "premium",
    mowers: 6,
    spaces: 5,
    surface: "~28,000 m²",
    joinDate: "2024-04-18",
    status: "inactive",
    lastActivity: "Hace 2 semanas",
  },
  {
    id: "c8",
    name: "Estancia Hacienda Los Molinos",
    email: "jefatura@losmolinos.pe",
    phone: "+51 66 234-567",
    address: "Km 5 Carretera Central, Huancayo",
    tier: "base",
    mowers: 1,
    spaces: 1,
    surface: "~3,200 m²",
    joinDate: "2025-01-05",
    status: "trial",
    lastActivity: "Hace 10 min",
  },
];

const TIER_COLORS: Record<string, string> = {
  base: "bg-secondary/10 text-secondary border-secondary/30",
  standard: "bg-primary/10 text-primary border-primary/30",
  premium: "bg-accent/10 text-accent border-accent/30",
  enterprise: "bg-destructive/10 text-destructive border-destructive/30",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-primary/10 text-primary",
  trial: "bg-accent/10 text-accent",
  inactive: "bg-muted text-muted-foreground",
};

export default function ClientsPage() {
  const { theme } = useTheme();
  const logoSrc = theme === "dark" ? "/walle_logo_dark.svg" : "/walle_logo_light.svg";
  const [selectedClient, setSelectedClient] = useState<FakeClient | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <img src={logoSrc} alt="W.A.L.L.-E." className="h-9 w-9" />
            <span className="text-lg font-bold">W.A.L.L.-E.</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/about" className="hover:text-foreground transition-colors">Acerca de</Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors">Precios</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contacto</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3 w-3" />
            Volver al inicio
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Panel de Clientes</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {FAKE_CLIENTS.length} clientes registrados · {FAKE_CLIENTS.filter((c) => c.status === "active").length} activos
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            <Crown className="h-3 w-3 mr-1" />
            Ruta secreta
          </Badge>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-foreground">{FAKE_CLIENTS.length}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Total Clientes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-primary">{FAKE_CLIENTS.filter((c) => c.status === "active").length}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Activos</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-accent">{FAKE_CLIENTS.filter((c) => c.status === "trial").length}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">En Prueba</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-foreground">{FAKE_CLIENTS.reduce((sum, c) => sum + c.mowers, 0)}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Total Podadoras</div>
            </CardContent>
          </Card>
        </div>

        {/* Client Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FAKE_CLIENTS.map((client) => (
            <Card
              key={client.id}
              className={`cursor-pointer transition-all hover:border-primary/30 hover:shadow-md ${
                selectedClient?.id === client.id ? "border-primary shadow-md" : ""
              }`}
              onClick={() => setSelectedClient(selectedClient?.id === client.id ? null : client)}
            >
              <CardHeader className="p-3 pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold leading-tight">{client.name}</CardTitle>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{client.surface}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${TIER_COLORS[client.tier]}`}>
                      {client.tier}
                    </Badge>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${STATUS_COLORS[client.status]}`}>
                      {client.status === "active" ? "Activo" : client.status === "trial" ? "Prueba" : "Inactivo"}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span>Podadoras:</span>
                    <span className="font-medium text-foreground">{client.mowers}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span>Espacios:</span>
                    <span className="font-medium text-foreground">{client.spaces}</span>
                  </div>
                </div>

                {selectedClient?.id === client.id && (
                  <>
                    <Separator />
                    <div className="space-y-1.5 text-[10px]">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span>{client.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{client.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{client.address}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Desde: {client.joinDate}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <ExternalLink className="h-3 w-3" />
                        <span>Última actividad: {client.lastActivity}</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
