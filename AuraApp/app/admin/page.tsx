"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface RegistrationStatus {
    registered: boolean;
    vendorId?: string;
    vendorName?: string;
    facilitatorUrl: string;
    lastChecked?: string;
    error?: string;
}

export default function AdminPage() {
    const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [facilitatorHealth, setFacilitatorHealth] = useState<boolean | null>(null);

    useEffect(() => {
        loadStatus();
    }, []);

    const loadStatus = async () => {
        try {
            setLoading(true);
            const [statusResponse, healthResponse] = await Promise.all([
                fetch("/api/admin/register"), // GET request to check status
                fetch("/api/admin/facilitator/health"),
            ]);

            if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                setRegistrationStatus(statusData);
            }

            if (healthResponse.ok) {
                const healthData = await healthResponse.json();
                setFacilitatorHealth(healthData.healthy || false);
            }
        } catch (error) {
            console.error("Failed to load status:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleReregister = async () => {
        try {
            setRegistering(true);
            const response = await fetch("/api/admin/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            if (response.ok) {
                await loadStatus(); // Refresh status after registration
            }
        } catch (error) {
            console.error("Re-registration failed:", error);
        } finally {
            setRegistering(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Registration Status */}
                <div className="bg-card border border-border rounded-xl p-6 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-foreground">Registration Status</h3>
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-aura-purple border-t-transparent rounded-full animate-spin" />
                        ) : registrationStatus?.registered ? (
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded">
                                Registered
                            </span>
                        ) : (
                            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded">
                                Not Registered
                            </span>
                        )}
                    </div>
                    {registrationStatus && (
                        <div className="space-y-2 text-sm">
                            {registrationStatus.vendorId && (
                                <div>
                                    <span className="text-muted-foreground">Vendor ID:</span>
                                    <span className="text-foreground ml-2 font-mono text-xs break-all">
                                        {registrationStatus.vendorId}
                                    </span>
                                </div>
                            )}
                            {registrationStatus.vendorName && (
                                <div>
                                    <span className="text-muted-foreground">Name:</span>
                                    <span className="text-foreground ml-2">{registrationStatus.vendorName}</span>
                                </div>
                            )}
                            <div>
                                <span className="text-muted-foreground">Facilitator:</span>
                                <span className="text-foreground ml-2 text-xs break-all">
                                    {registrationStatus.facilitatorUrl}
                                </span>
                            </div>
                        </div>
                    )}
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={loadStatus}
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-aura-gradient hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            {loading ? "Loading..." : "Refresh Status"}
                        </button>
                        <button
                            onClick={handleReregister}
                            disabled={registering || loading}
                            className="flex-1 px-4 py-2 bg-aura-cyan/20 hover:bg-aura-cyan/30 border border-aura-cyan/30 disabled:opacity-50 disabled:cursor-not-allowed text-aura-cyan text-sm font-medium rounded-lg transition-colors"
                        >
                            {registering ? "Registering..." : "Re-register"}
                        </button>
                    </div>
                </div>

                {/* Facilitator Health */}
                <div className="bg-card border border-border rounded-xl p-6 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-foreground">Facilitator Health</h3>
                        {facilitatorHealth === null ? (
                            <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                        ) : facilitatorHealth ? (
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded">
                                Online
                            </span>
                        ) : (
                            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded">
                                Offline
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {facilitatorHealth
                            ? "Facilitator is responding"
                            : "Facilitator is not responding"}
                    </p>
                </div>

                {/* Service Stats */}
                <div className="bg-card border border-border rounded-xl p-6 backdrop-blur-sm">
                    <h3 className="text-lg font-semibold text-foreground mb-4">AI Services</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Endpoints:</span>
                            <span className="text-aura-purple font-semibold">20</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Vision & Audio:</span>
                            <span className="text-foreground">4</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">NLP Services:</span>
                            <span className="text-foreground">6</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Business Tools:</span>
                            <span className="text-foreground">3</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Developer Tools:</span>
                            <span className="text-foreground">5</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Advanced:</span>
                            <span className="text-foreground">2</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Link
                    href="/admin/membership"
                    className="block bg-gradient-to-br from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/30 rounded-xl p-6 backdrop-blur-sm transition-all"
                >
                    <h3 className="text-lg font-semibold text-foreground mb-2">Membership Management</h3>
                    <p className="text-sm text-muted-foreground">View users, subscriptions, and revenue</p>
                </Link>

                <Link
                    href="/dashboard"
                    className="block bg-gradient-to-br from-aura-purple/20 to-aura-cyan/20 hover:from-aura-purple/30 hover:to-aura-cyan/30 border border-aura-purple/30 rounded-xl p-6 backdrop-blur-sm transition-all"
                >
                    <h3 className="text-lg font-semibold text-foreground mb-2">Main Dashboard</h3>
                    <p className="text-sm text-muted-foreground">Access service discovery and testing</p>
                </Link>

                <Link
                    href="/docs"
                    className="block bg-gradient-to-br from-aura-cyan/20 to-aura-purple/20 hover:from-aura-cyan/30 hover:to-aura-purple/30 border border-aura-cyan/30 rounded-xl p-6 backdrop-blur-sm transition-all"
                >
                    <h3 className="text-lg font-semibold text-foreground mb-2">API Documentation</h3>
                    <p className="text-sm text-muted-foreground">View OpenAPI specs and examples</p>
                </Link>
            </div>

            {/* Instructions */}
            <div className="bg-card border border-border rounded-xl p-6 backdrop-blur-sm">
                <h3 className="text-lg font-semibold text-aura-gradient mb-4">Aura AI Services</h3>
                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <h4 className="text-aura-purple font-medium mb-2">Vision & Audio (4)</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>• Image Analysis ($0.05)</li>
                            <li>• Image Generation ($0.15)</li>
                            <li>• Audio Transcription ($0.04)</li>
                            <li>• Text-to-Speech ($0.04)</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-aura-purple font-medium mb-2">NLP Services (6)</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>• Text Summarization ($0.03)</li>
                            <li>• Translation ($0.03)</li>
                            <li>• Sentiment Analysis ($0.02)</li>
                            <li>• Content Moderation ($0.01)</li>
                            <li>• Text Simplification ($0.02)</li>
                            <li>• Entity Extraction ($0.03)</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-aura-purple font-medium mb-2">Business Tools (3)</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>• Email Generation ($0.02)</li>
                            <li>• Product Descriptions ($0.03)</li>
                            <li>• SEO Optimization ($0.05)</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-aura-purple font-medium mb-2">Developer Tools (5)</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>• Code Generation ($0.08)</li>
                            <li>• Code Review ($0.05)</li>
                            <li>• SQL Generation ($0.03)</li>
                            <li>• Regex Generator ($0.02)</li>
                            <li>• API Docs ($0.05)</li>
                        </ul>
                    </div>
                </div>
                <div className="mt-4">
                    <h4 className="text-aura-purple font-medium mb-2">Advanced (2)</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• OCR Text Extraction ($0.04)</li>
                        <li>• Quiz Generator ($0.05)</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
