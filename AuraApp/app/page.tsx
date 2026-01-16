"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Footer } from "./components/Footer";
import configData from "./config.json";

// Icon mapping
const iconMap: Record<string, string> = {
  zap: "⚡",
  send: "📤",
  bot: "🤖",
  shield: "🛡️",
  image: "🖼️",
  audio: "🎤",
  code: "💻",
  translate: "🌐",
};

export default function Home() {
  const hero = configData.hero || {};
  const features = configData.features || [];
  const examples = configData.examples || [];
  const mcp = configData.mcp || {};

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Animated Background Grid with Aura Gradient Overlay */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,hsl(var(--muted)/0.05)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--muted)/0.05)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] pointer-events-none" />

      {/* Subtle Aura gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/4 w-[800px] h-[800px] bg-aura-purple/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/4 w-[800px] h-[800px] bg-aura-cyan/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative">
        {/* Hero Section with Banner */}
        <section className="container mx-auto px-4 pt-12 pb-20">
          <div className="max-w-6xl mx-auto">
            {/* Banner Image */}
            <div className="flex justify-center mb-12">
              <div className="relative aura-glow rounded-2xl overflow-hidden">
                <Image
                  src="/banner.png"
                  alt="Aura - Intelligent AI Services"
                  width={600}
                  height={200}
                  className="rounded-2xl"
                  priority
                />
              </div>
            </div>

            {/* Hero Content */}
            <div className="text-center">
              <h1 className="text-5xl md:text-7xl font-bold mb-6 text-aura-gradient leading-tight">
                {hero.title || "Intelligent AI Services"}
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-3xl mx-auto">
                {hero.subtitle || "20 AI endpoints powered by GPT-4o, FLUX, and Whisper"}
              </p>
              <p className="text-lg text-muted-foreground/80 mb-12 max-w-2xl mx-auto">
                {hero.description || "x402 v2 micropayments on Avalanche, Base, and Celo"}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                {hero.cta?.primary && (
                  <Link
                    href={hero.cta.primary.link}
                    className="btn-aura-primary text-lg"
                  >
                    {hero.cta.primary.text}
                  </Link>
                )}
                {hero.cta?.secondary && (
                  <Link
                    href={hero.cta.secondary.link}
                    className="px-8 py-4 border-2 border-aura-purple/30 text-foreground hover:border-aura-purple/60 hover:text-aura-purple font-semibold rounded-xl transition-all duration-300 text-lg backdrop-blur-sm"
                  >
                    {hero.cta.secondary.text}
                  </Link>
                )}
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
                <div className="text-center">
                  <div className="text-4xl font-bold text-aura-gradient">20</div>
                  <div className="text-sm text-muted-foreground mt-1">AI Endpoints</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-aura-gradient">3</div>
                  <div className="text-sm text-muted-foreground mt-1">Chains Supported</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-aura-gradient">$0.01</div>
                  <div className="text-sm text-muted-foreground mt-1">Starting Price</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-4 text-aura-gradient">
              Features
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              Premium AI capabilities with seamless micropayments
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature: any, index: number) => (
                <div
                  key={index}
                  className={`card-aura p-6 transition-all duration-300 hover:aura-glow-sm ${
                    feature.highlight
                      ? "border-aura-gradient"
                      : "hover:border-aura-purple/40"
                  }`}
                >
                  <div className="text-4xl mb-4">
                    {iconMap[feature.icon] || "✨"}
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Service Categories */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-4 text-aura-gradient">
              AI Services
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              Comprehensive AI toolkit for every use case
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Vision & Audio */}
              <div className="card-aura p-6">
                <div className="w-12 h-12 rounded-xl bg-aura-gradient flex items-center justify-center mb-4">
                  <span className="text-2xl">🖼️</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Vision & Audio</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex justify-between"><span>Image Analysis</span><span className="text-aura-cyan">$0.05</span></li>
                  <li className="flex justify-between"><span>Image Generation</span><span className="text-aura-cyan">$0.15</span></li>
                  <li className="flex justify-between"><span>Transcription</span><span className="text-aura-cyan">$0.04</span></li>
                  <li className="flex justify-between"><span>Text-to-Speech</span><span className="text-aura-cyan">$0.04</span></li>
                </ul>
              </div>

              {/* NLP Services */}
              <div className="card-aura p-6">
                <div className="w-12 h-12 rounded-xl bg-aura-gradient flex items-center justify-center mb-4">
                  <span className="text-2xl">📝</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-3">NLP Services</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex justify-between"><span>Summarization</span><span className="text-aura-cyan">$0.03</span></li>
                  <li className="flex justify-between"><span>Translation</span><span className="text-aura-cyan">$0.03</span></li>
                  <li className="flex justify-between"><span>Sentiment</span><span className="text-aura-cyan">$0.02</span></li>
                  <li className="flex justify-between"><span>Entity Extraction</span><span className="text-aura-cyan">$0.03</span></li>
                </ul>
              </div>

              {/* Business Tools */}
              <div className="card-aura p-6">
                <div className="w-12 h-12 rounded-xl bg-aura-gradient flex items-center justify-center mb-4">
                  <span className="text-2xl">💼</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Business Tools</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex justify-between"><span>Email Generator</span><span className="text-aura-cyan">$0.02</span></li>
                  <li className="flex justify-between"><span>Product Desc</span><span className="text-aura-cyan">$0.03</span></li>
                  <li className="flex justify-between"><span>SEO Optimize</span><span className="text-aura-cyan">$0.05</span></li>
                  <li className="flex justify-between"><span>Quiz Generator</span><span className="text-aura-cyan">$0.05</span></li>
                </ul>
              </div>

              {/* Developer Tools */}
              <div className="card-aura p-6">
                <div className="w-12 h-12 rounded-xl bg-aura-gradient flex items-center justify-center mb-4">
                  <span className="text-2xl">💻</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Developer Tools</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex justify-between"><span>Code Generate</span><span className="text-aura-cyan">$0.08</span></li>
                  <li className="flex justify-between"><span>Code Review</span><span className="text-aura-cyan">$0.05</span></li>
                  <li className="flex justify-between"><span>SQL Generator</span><span className="text-aura-cyan">$0.03</span></li>
                  <li className="flex justify-between"><span>Regex Generator</span><span className="text-aura-cyan">$0.02</span></li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {mcp.enabled && (
          <section className="container mx-auto px-4 py-16">
            <div className="max-w-4xl mx-auto">
              <div className="card-aura p-8">
                <h2 className="text-3xl font-bold mb-4 text-aura-gradient">
                  {(mcp as any).title || "Configure with MCP"}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {(mcp as any).description || ""}
                </p>

                {/* Instructions */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    Setup Instructions
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
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
                    <h3 className="text-lg font-semibold text-foreground mb-3">
                      Configuration Example
                    </h3>
                    <pre className="bg-aura-bg-primary border border-border rounded-xl p-4 overflow-x-auto">
                      <code className="text-aura-cyan text-sm">
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
            <h2 className="text-4xl font-bold text-center mb-4 text-aura-gradient">
              API Examples
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              Simple integration with any platform
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {examples.map((example: any, index: number) => (
                <div
                  key={index}
                  className="card-aura p-6 hover:aura-glow-sm transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-foreground">
                      {example.name}
                    </h3>
                    <span className="px-3 py-1 bg-aura-gradient text-white text-xs font-medium rounded-full">
                      {example.price}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4">
                    {example.description}
                  </p>
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-aura-purple font-mono">
                        {example.method} {example.endpoint}
                      </span>
                    </div>
                    <div className="bg-aura-bg-primary rounded-xl p-3 border border-border">
                      <div className="text-xs text-muted-foreground mb-1">Request</div>
                      <pre className="text-xs text-aura-cyan overflow-x-auto">
                        <code>{JSON.stringify(example.request, null, 2)}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Documentation CTA */}
        {configData.swagger?.enabled && (
          <section className="container mx-auto px-4 py-16">
            <div className="max-w-4xl mx-auto text-center">
              <div className="border-aura-gradient rounded-2xl p-12 backdrop-aura">
                <h2 className="text-3xl font-bold mb-4 text-aura-gradient">
                  {configData.swagger.title || "API Documentation"}
                </h2>
                <p className="text-muted-foreground mb-8">
                  {configData.swagger.description || "Explore all 20 AI endpoints with interactive documentation"}
                </p>
                <Link
                  href={configData.swagger.url || "/dashboard/docs"}
                  className="btn-aura-primary inline-flex items-center"
                >
                  {configData.swagger.buttonText || "View API Docs"}
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
