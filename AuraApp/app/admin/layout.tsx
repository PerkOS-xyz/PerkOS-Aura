import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Admin Dashboard - Aura AI Service",
    description: "Manage your AI service registration and settings",
};

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background">
            <div className="container max-w-6xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2 text-aura-gradient">
                        Admin Dashboard
                    </h1>
                    <p className="text-muted-foreground">Manage your 20 AI service endpoints and registration</p>
                </div>
                {children}
            </div>
        </div>
    );
}
