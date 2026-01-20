"use client";

import { useState } from "react";
import { aiServiceConfig } from "@/lib/config/x402";

interface ServiceOption {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    category: "Vision & Audio" | "NLP" | "Business" | "Developer" | "Advanced";
    promptTemplate: string | (() => string);
    endpoint?: string; // Paid API endpoint (if any)
    priceUsd?: number; // Price in USD (for display)
}

// Random image generation prompts for variety
const imagePrompts = [
    "Generate an image of a futuristic city with flying cars in a cyberpunk style.",
    "Generate an image of a serene Japanese garden with cherry blossoms and a koi pond.",
    "Generate an image of an astronaut floating in space with Earth in the background.",
    "Generate an image of a magical forest with glowing mushrooms and fireflies at night.",
    "Generate an image of a cozy coffee shop on a rainy day with warm lighting.",
    "Generate an image of a majestic dragon perched on a mountain peak at sunset.",
    "Generate an image of an underwater city with bioluminescent architecture.",
    "Generate an image of a steampunk airship floating above Victorian London.",
    "Generate an image of a crystal cave with rainbow light refractions.",
    "Generate an image of a robot chef cooking in a high-tech kitchen.",
    "Generate an image of a mystical library with floating books and candles.",
    "Generate an image of a northern lights display over a snowy mountain landscape.",
    "Generate an image of a treehouse village connected by rope bridges in a giant forest.",
    "Generate an image of a neon-lit street market in a futuristic Asian city.",
    "Generate an image of a phoenix rising from flames in a dramatic sky.",
];

function getRandomImagePrompt(): string {
    return imagePrompts[Math.floor(Math.random() * imagePrompts.length)];
}

export interface ServiceSelection {
    prompt: string;
    endpoint?: string;
    priceUsd?: number;
    serviceId: string;
    serviceTitle: string;
}

interface ServiceSelectorProps {
    onSelect: (selection: ServiceSelection) => void;
}

export function ServiceSelector({ onSelect }: ServiceSelectorProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>("All");

    const services: ServiceOption[] = [
        // Vision & Audio
        {
            id: "analyze_image",
            title: "Analyze Image",
            description: "Get detailed insights from visuals",
            category: "Vision & Audio",
            promptTemplate: "Analyze this image and describe what you see in detail.",
            endpoint: "/api/ai/analyze",
            priceUsd: aiServiceConfig.analyzePriceUsd,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
            )
        },
        {
            id: "generate_image",
            title: "Generate Image",
            description: "Create images from text descriptions",
            category: "Vision & Audio",
            promptTemplate: getRandomImagePrompt,
            endpoint: "/api/ai/generate",
            priceUsd: aiServiceConfig.generatePriceUsd,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            )
        },
        {
            id: "transcribe_audio",
            title: "Transcribe Audio",
            description: "Convert speech to text",
            category: "Vision & Audio",
            promptTemplate: "Transcribe the following audio file:",
            endpoint: "/api/ai/transcribe",
            priceUsd: aiServiceConfig.transcribePriceUsd,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
            )
        },
        {
            id: "synthesize_speech",
            title: "Synthesize Speech",
            description: "Turn text into lifelike speech",
            category: "Vision & Audio",
            promptTemplate: "Generate speech for the following text: 'Hello, welcome to PerkOS AI services.'",
            endpoint: "/api/ai/synthesize",
            priceUsd: aiServiceConfig.synthesizePriceUsd,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
            )
        },

        // NLP Services
        {
            id: "summarize",
            title: "Summarize Text",
            description: "Condense long content into summaries",
            category: "NLP",
            promptTemplate: "Summarize this text in 3 bullet points:\n\nArtificial intelligence has transformed numerous industries, from healthcare to finance. Machine learning algorithms can now diagnose diseases with remarkable accuracy, predict market trends, and automate complex tasks. However, these advancements also raise important ethical questions about privacy, job displacement, and algorithmic bias that society must address.",
            endpoint: "/api/ai/summarize",
            priceUsd: aiServiceConfig.summarizePriceUsd,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
            )
        },
        {
            id: "translate",
            title: "Translate",
            description: "Translate text between languages",
            category: "NLP",
            promptTemplate: "Translate this text to Spanish:\n\nWelcome to our platform! We're excited to help you build amazing applications with AI-powered features.",
            endpoint: "/api/ai/translate",
            priceUsd: aiServiceConfig.translatePriceUsd,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
            )
        },
        {
            id: "sentiment",
            title: "Sentiment Analysis",
            description: "Detect emotion and tone in text",
            category: "NLP",
            promptTemplate: "Analyze the sentiment of this text:\n\nI absolutely love this new feature! It makes my workflow so much easier and saves me hours every week. The team did an amazing job!",
            endpoint: "/api/ai/sentiment",
            priceUsd: aiServiceConfig.sentimentPriceUsd,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },
        {
            id: "moderate",
            title: "Content Moderation",
            description: "Check text for sensitive content",
            category: "NLP",
            promptTemplate: "Check if this text contains harmful content:\n\nThis product is amazing and will change your life forever! Buy now or regret it!",
            endpoint: "/api/ai/moderate",
            priceUsd: aiServiceConfig.moderatePriceUsd,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            )
        },
        {
            id: "simplify",
            title: "Simplify Text",
            description: "Make complex text easier to read",
            category: "NLP",
            promptTemplate: "Simplify this text for a general audience:\n\nThe implementation of quantum computing paradigms necessitates a fundamental reconceptualization of classical algorithmic methodologies.",
            endpoint: "/api/ai/simplify",
            priceUsd: aiServiceConfig.simplifyPriceUsd,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            )
        },
        {
            id: "extract",
            title: "Extract Entities",
            description: "Find names, places, dates in text",
            category: "NLP",
            promptTemplate: "Extract all entities (people, places, dates, organizations) from this text:\n\nApple CEO Tim Cook announced at WWDC 2024 in San Jose that iOS 18 will launch on September 16th.",
            endpoint: "/api/ai/extract",
            priceUsd: aiServiceConfig.extractPriceUsd,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                </svg>
            )
        },

        // Business Tools
        {
            id: "email",
            title: "Generate Email",
            description: "Draft professional emails specifically",
            category: "Business",
            promptTemplate: "Write a professional email to a client about project delays due to technical issues.",
            endpoint: "/api/ai/email/generate",
            priceUsd: aiServiceConfig.emailGeneratePriceUsd,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
            )
        },
        {
            id: "product",
            title: "Product Description",
            description: "Create compelling marketing copy",
            category: "Business",
            promptTemplate: "Write a compelling product description for a smart water bottle that tracks hydration.",
            endpoint: "/api/ai/product/describe",
            priceUsd: aiServiceConfig.productDescribePriceUsd,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
            )
        },
        {
            id: "seo",
            title: "SEO Optimization",
            description: "Optimize content for search engines",
            category: "Business",
            promptTemplate: "Optimize this content for SEO with keywords 'AI services' and 'automation':\n\nTitle: How to Use AI in Your Business\nDescription: Learn about artificial intelligence tools that can help your company.",
            endpoint: "/api/ai/seo/optimize",
            priceUsd: aiServiceConfig.seoOptimizePriceUsd,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            )
        },

        // Developer Tools
        {
            id: "code",
            title: "Generate Code",
            description: "Write code functions and snippets",
            category: "Developer",
            promptTemplate: "Write a React component that displays a countdown timer.",
            endpoint: "/api/ai/code/generate",
            priceUsd: aiServiceConfig.codeGeneratePriceUsd,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
            )
        },
        {
            id: "code_review",
            title: "Code Review",
            description: "Analyze code for bugs and improvements",
            category: "Developer",
            promptTemplate: "Review this code for bugs and security issues:\n\nfunction login(user, pass) {\n  const query = `SELECT * FROM users WHERE username='${user}' AND password='${pass}'`;\n  return db.execute(query);\n}",
            endpoint: "/api/ai/code/review",
            priceUsd: aiServiceConfig.codeReviewPriceUsd,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },
        {
            id: "sql",
            title: "SQL Generation",
            description: "Convert natural language to SQL queries",
            category: "Developer",
            promptTemplate: "Write a SQL query to find the top 5 customers by total purchase amount in the last month.",
            endpoint: "/api/ai/sql/generate",
            priceUsd: aiServiceConfig.sqlGeneratePriceUsd,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
            )
        },
        {
            id: "regex",
            title: "Regex Generator",
            description: "Create patterns for text matching",
            category: "Developer",
            promptTemplate: "Write a Regular Expression to validate an email address.",
            endpoint: "/api/ai/regex/generate",
            priceUsd: aiServiceConfig.regexGeneratePriceUsd,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
            )
        },

        // Advanced
        {
            id: "ocr",
            title: "OCR Extraction",
            description: "Extract text from images",
            category: "Advanced",
            promptTemplate: "[Attach an image] Extract all text from this image and format it clearly.",
            endpoint: "/api/ai/ocr",
            priceUsd: aiServiceConfig.ocrPriceUsd,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            )
        },
        {
            id: "docs",
            title: "Generate Docs",
            description: "Create API documentation from code",
            category: "Developer",
            promptTemplate: "Generate API documentation for this function:\n\nfunction calculateTotal(items: CartItem[], discount?: number): { subtotal: number; tax: number; total: number }",
            endpoint: "/api/ai/docs/generate",
            priceUsd: aiServiceConfig.docsGeneratePriceUsd,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            )
        },
        {
            id: "quiz",
            title: "Generate Quiz",
            description: "Create quiz questions on any topic",
            category: "Advanced",
            promptTemplate: "Generate 5 multiple-choice quiz questions about:\n\nThe history of artificial intelligence and machine learning",
            endpoint: "/api/ai/quiz/generate",
            priceUsd: aiServiceConfig.quizGeneratePriceUsd,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },
    ];

    const categories = ["All", "Vision & Audio", "NLP", "Business", "Developer", "Advanced"];

    const filteredServices = selectedCategory === "All"
        ? services
        : services.filter(s => s.category === selectedCategory);

    return (
        <div className="w-full max-w-5xl mx-auto p-4 animate-fadeIn">
            <div className="flex overflow-x-auto pb-4 gap-2 mb-4 scrollbar-hide justify-center">
                {categories.map((category) => (
                    <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${selectedCategory === category
                                ? "bg-aura-gradient text-white"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                    >
                        {category}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredServices.map((service) => (
                    <button
                        key={service.id}
                        onClick={() => {
                            const prompt = typeof service.promptTemplate === "function"
                                ? service.promptTemplate()
                                : service.promptTemplate;
                            onSelect({
                                prompt,
                                endpoint: service.endpoint,
                                priceUsd: service.priceUsd,
                                serviceId: service.id,
                                serviceTitle: service.title,
                            });
                        }}
                        className="flex flex-col items-start p-4 h-full bg-card border border-border hover:border-aura-purple/50 hover:shadow-lg hover:shadow-aura-purple/10 rounded-xl transition-all text-left group"
                    >
                        <div className="flex items-center justify-between w-full mb-3">
                            <div className="p-2 bg-muted rounded-lg text-aura-purple group-hover:scale-110 transition-transform duration-300">
                                {service.icon}
                            </div>
                            {service.priceUsd && (
                                <span className="text-xs font-medium text-aura-cyan bg-aura-cyan/10 px-2 py-0.5 rounded-full">
                                    ${service.priceUsd.toFixed(2)}
                                </span>
                            )}
                        </div>
                        <h3 className="font-semibold text-foreground mb-1">{service.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">{service.description}</p>
                    </button>
                ))}
            </div>
        </div>
    );
}
