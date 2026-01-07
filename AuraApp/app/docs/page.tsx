"use client";

export default function DocsPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <main className="container max-w-6xl mx-auto px-4 py-12">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl font-bold font-heading mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        Developer Documentation
                    </h1>
                    <p className="text-muted-foreground">Complete guide to all 20 AI service endpoints with x402 micropayments</p>
                </div>

                {/* x402 Payment Info */}
                <div className="bg-primary/10 border border-primary/30 rounded-xl p-6 mb-8">
                    <h2 className="text-xl font-semibold text-primary mb-3">🔐 x402 v2 Payment Required</h2>
                    <p className="text-muted-foreground mb-3">All endpoints require x402 v2 payment envelope headers:</p>
                    <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm text-muted-foreground">
                        <div>x-authorization: {`{ "from": "0x...", "to": "0x...", "amount": "1000", "token": "0x...",... } `}</div>
                        <div className="mt-2">x-signature: 0x...</div>
                    </div>
                    <p className="text-muted-foreground mt-3 text-sm">
                        💡 Use the Dashboard to test endpoints with automatic payment handling
                    </p>
                </div>

                {/* Vision & Audio Services */}
                <Section title="Vision & Audio Services" icon="🎨">
                    <Endpoint
                        method="POST"
                        path="/api/ai/analyze"
                        price="$0.05"
                        description="Analyze images using GPT-4o vision"
                        request={{ image: "base64_image_data", prompt: "Describe this image" }}
                    />
                    <Endpoint
                        method="POST"
                        path="/api/ai/generate"
                        price="$0.15"
                        description="Generate images with DALL-E 3"
                        request={{ prompt: "A serene landscape", size: "1024x1024" }}
                    />
                    <Endpoint
                        method="POST"
                        path="/api/ai/transcribe"
                        price="$0.04"
                        description="Transcribe audio to text with Whisper"
                        request={{ audio: "base64_audio_data", language: "en" }}
                    />
                    <Endpoint
                        method="POST"
                        path="/api/ai/synthesize"
                        price="$0.04"
                        description="Convert text to speech"
                        request={{ text: "Hello world", voice: "alloy" }}
                    />
                </Section>

                {/* NLP Services */}
                <Section title="NLP Services" icon="💬">
                    <Endpoint
                        method="POST"
                        path="/api/ai/summarize"
                        price="$0.03"
                        description="Summarize long text"
                        request={{ text: "Long article...", maxLength: 200 }}
                    />
                    <Endpoint
                        method="POST"
                        path="/api/ai/translate"
                        price="$0.03"
                        description="Translate between languages"
                        request={{ text: "Hello", targetLang: "es" }}
                    />
                    <Endpoint
                        method="POST"
                        path="/api/ai/sentiment"
                        price="$0.02"
                        description="Analyze sentiment"
                        request={{ text: "This is amazing!" }}
                    />
                    <Endpoint
                        method="POST"
                        path="/api/ai/moderate"
                        price="$0.01"
                        description="Content moderation"
                        request={{ text: "Text to check" }}
                    />
                    <Endpoint
                        method="POST"
                        path="/api/ai/simplify"
                        price="$0.02"
                        description="Simplify complex text"
                        request={{ text: "Complex explanation...", level: "beginner" }}
                    />
                    <Endpoint
                        method="POST"
                        path="/api/ai/extract"
                        price="$0.03"
                        description="Extract entities (NER)"
                        request={{ text: "Apple Inc. is in California" }}
                    />
                </Section>

                {/* Business Tools */}
                <Section title="Business Tools" icon="💼">
                    <Endpoint
                        method="POST"
                        path="/api/ai/email/generate"
                        price="$0.02"
                        description="Generate professional emails"
                        request={{ context: "Follow-up meeting", tone: "professional" }}
                    />
                    <Endpoint
                        method="POST"
                        path="/api/ai/product/describe"
                        price="$0.03"
                        description="Create product descriptions"
                        request={{ productName: "Smartwatch", features: ["GPS", "Heart rate"] }}
                    />
                    <Endpoint
                        method="POST"
                        path="/api/ai/seo/optimize"
                        price="$0.05"
                        description="SEO optimization"
                        request={{ title: "Blog post", content: "Article content..." }}
                    />
                </Section>

                {/* Developer Tools */}
                <Section title="Developer Tools" icon="⚡">
                    <Endpoint
                        method="POST"
                        path="/api/ai/code/generate"
                        price="$0.08"
                        description="Generate code from description"
                        request={{ description: "Sort array", language: "python" }}
                    />
                    <Endpoint
                        method="POST"
                        path="/api/ai/code/review"
                        price="$0.05"
                        description="Review code for issues"
                        request={{ code: "def foo():\\n  return x" }}
                    />
                    <Endpoint
                        method="POST"
                        path="/api/ai/sql/generate"
                        price="$0.03"
                        description="Generate SQL queries"
                        request={{ description: "Get all users", schema: "users(id, name)" }}
                    />
                    <Endpoint
                        method="POST"
                        path="/api/ai/regex/generate"
                        price="$0.02"
                        description="Generate regex patterns"
                        request={{ description: "Match email addresses" }}
                    />
                    <Endpoint
                        method="POST"
                        path="/api/ai/docs/generate"
                        price="$0.05"
                        description="Generate API documentation"
                        request={{ code: "function add(a, b) { return a + b; }" }}
                    />
                </Section>

                {/* Advanced Services */}
                <Section title="Advanced Services" icon="🚀">
                    <Endpoint
                        method="POST"
                        path="/api/ai/ocr"
                        price="$0.04"
                        description="Extract text from images (OCR)"
                        request={{ image: "base64_image_data" }}
                    />
                    <Endpoint
                        method="POST"
                        path="/api/ai/quiz/generate"
                        price="$0.05"
                        description="Generate quiz questions"
                        request={{ topic: "JavaScript", count: 5 }}
                    />
                </Section>

                {/* Quick Links */}
                <div className="mt-12 bg-card border border-border rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-primary mb-4">Quick Links</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <a href="/dashboard" className="text-primary hover:text-primary/80">→ Try in Dashboard</a>
                        <a href="/admin" className="text-primary hover:text-primary/80">→ Admin Panel</a>
                        <a href="https://docs.perkos.xyz" className="text-primary hover:text-primary/80">→ x402 Protocol Docs</a>
                    </div>
                </div>
            </main>
        </div>
    );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
    return (
        <div className="mb-8">
            <h2 className="text-2xl font-bold font-heading text-foreground mb-4 flex items-center gap-2">
                <span>{icon}</span>
                {title}
            </h2>
            <div className="space-y-4">{children}</div>
        </div>
    );
}

function Endpoint({
    method,
    path,
    price,
    description,
    request,
}: {
    method: string;
    path: string;
    price: string;
    description: string;
    request: any;
}) {
    return (
        <div className="bg-card border border-border rounded-lg p-5 hover:border-primary/50 transition-colors">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">{method}</span>
                        <code className="text-secondary font-mono text-sm">{path}</code>
                    </div>
                    <p className="text-muted-foreground text-sm mt-2">{description}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                    <span className="px-3 py-1 bg-green-600/20 text-green-400 text-sm font-semibold rounded-full border border-green-600/30">
                        {price}
                    </span>
                    <span className="px-2 py-1 bg-secondary/10 text-secondary text-xs rounded border border-secondary/30" title="Requires x402 payment">
                        🔐 x402
                    </span>
                </div>
            </div>
            <details className="mt-3">
                <summary className="text-muted-foreground text-sm cursor-pointer hover:text-foreground">
                    Show example request →
                </summary>
                <pre className="mt-2 bg-muted/50 rounded p-3 overflow-x-auto text-xs text-muted-foreground">
                    {JSON.stringify(request, null, 2)}
                </pre>
            </details>
        </div>
    );
}
