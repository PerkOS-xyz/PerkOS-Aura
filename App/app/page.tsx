"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import configData from "./config.json";

// Icon mapping
const iconMap: Record<string, string> = {
  zap: "⚡",
  send: "📤",
  bot: "🤖",
  shield: "🛡️",
};

export default function Home() {
  const hero = configData.hero || {};
  const features = configData.features || [];
  const examples = configData.examples || [];
  const mcp = configData.mcp || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      {/* Animated Background Grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-20" />

      <div className="relative">
        <Header />

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent leading-tight">
              {hero.title || "20 AI Services with x402 Micropayments"}
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-4 max-w-3xl mx-auto">
              {hero.subtitle || "Powerful AI capabilities powered by GPT-4o, DALL-E 3, and Whisper"}
            </p>
            <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
              {hero.description || ""}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {hero.cta?.primary && (
                <Link
                  href={hero.cta.primary.link}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 text-lg"
                >
                  {hero.cta.primary.text}
                </Link>
              )}
              {hero.cta?.secondary && (
                <Link
                  href={hero.cta.secondary.link}
                  className="px-8 py-4 border-2 border-blue-500/50 text-blue-400 hover:border-blue-400 hover:text-blue-300 font-semibold rounded-xl transition-all duration-300 text-lg"
                >
                  {hero.cta.secondary.text}
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12 text-gray-100">
              Features
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature: any, index: number) => (
                <div
                  key={index}
                  className={`p-6 rounded-xl border backdrop-blur-sm transition-all duration-300 ${feature.highlight
                      ? "bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/50"
                      : "bg-slate-800/30 border-blue-500/20 hover:border-blue-400/50"
                    }`}
                >
                  <div className="text-4xl mb-4">
                    {iconMap[feature.icon] || "✨"}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-100 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* MCP Configuration Section */}
        {mcp.enabled && (
          <section className="container mx-auto px-4 py-16">
            <div className="max-w-4xl mx-auto">
              <div className="bg-slate-800/30 border border-blue-500/20 rounded-xl p-8 backdrop-blur-sm">
                <h2 className="text-3xl font-bold mb-4 text-gray-100">
                  {(mcp as any).title || "Configure with MCP"}
                </h2>
                <p className="text-gray-400 mb-6">
                  {(mcp as any).description || ""}
                </p>

                {/* Instructions */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-200 mb-3">
                    Setup Instructions
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-300">
                    {((mcp as any).instructions || []).map((instruction: string, index: number) => (
                      <li key={index} className="text-sm">
                        {instruction}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Code Example */}
                {(mcp as any).codeExample && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-200 mb-3">
                      Configuration Example
                    </h3>
                    <pre className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 overflow-x-auto">
                      <code className="text-cyan-400 text-sm">
                        {(mcp as any).codeExample.code}
                      </code>
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Examples Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12 text-gray-100">
              API Examples
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {examples.map((example: any, index: number) => (
                <div
                  key={index}
                  className="bg-slate-800/30 border border-blue-500/20 rounded-xl p-6 backdrop-blur-sm hover:border-blue-400/50 transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-100">
                      {example.name}
                    </h3>
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
                      {example.price}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">
                    {example.description}
                  </p>
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-gray-500">
                        {example.method} {example.endpoint}
                      </span>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Request</div>
                      <pre className="text-xs text-cyan-400 overflow-x-auto">
                        <code>{JSON.stringify(example.request, null, 2)}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Swagger Documentation CTA */}
        {configData.swagger?.enabled && (
          <section className="container mx-auto px-4 py-16">
            <div className="max-w-4xl mx-auto text-center">
              <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/50 rounded-xl p-12 backdrop-blur-sm">
                <h2 className="text-3xl font-bold mb-4 text-gray-100">
                  {configData.swagger.title || "API Documentation"}
                </h2>
                <p className="text-gray-300 mb-8">
                  {configData.swagger.description || ""}
                </p>
                <Link
                  href={configData.swagger.url || "/dashboard/docs"}
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300"
                >
                  {configData.swagger.buttonText || "View Swagger Docs"}
                  <svg
                    className="w-5 h-5 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </Link>
              </div>
            </div>
          </section>
        )}

        <Footer />
      </div>
    </div>
  );
}
