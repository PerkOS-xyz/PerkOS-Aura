import type { Metadata } from "next";
import { Header } from "../components/Header";

export const metadata: Metadata = {
    title: "Admin Dashboard - AI Service",
    description: "Manage your AI service registration and settings",
};

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
            <Header />
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                        Admin Dashboard
                    </h1>
                    <p className="text-gray-400">Manage your 20 AI service endpoints and registration</p>
                </div>
                {children}
            </div>
        </div>
    );
}
