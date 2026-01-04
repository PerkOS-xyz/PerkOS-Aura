"use client";

import { useState } from "react";

interface ServiceOption {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    category: "Vision & Audio" | "NLP" | "Business" | "Developer" | "Advanced";
    promptTemplate: string | (() => string);
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

interface ServiceSelectorProps {
    onSelect: (prompt: string) => void;
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
            promptTemplate: "Summarize the following text in 3 bullet points:\n\n",
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
            promptTemplate: "Translate the following text to Spanish:\n\n",
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
            promptTemplate: "Analyze the sentiment of this text:\n\n",
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
            promptTemplate: "Check if the following text contains any harmful content:\n\n",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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
            promptTemplate: "Optimize the following blog post title and description for SEO keywords 'AI services' and 'automation':\n\n",
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
            promptTemplate: "Review this code for potential security vulnerabilities and performance issues:\n\n",
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
            promptTemplate: "Extract all text from this image and format it as a table.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
                                ? "bg-primary text-primary-foreground"
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
                            onSelect(prompt);
                        }}
                        className="flex flex-col items-start p-4 h-full bg-card border border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 rounded-xl transition-all text-left group"
                    >
                        <div className="p-2 bg-muted rounded-lg text-primary mb-3 group-hover:scale-110 transition-transform duration-300">
                            {service.icon}
                        </div>
                        <h3 className="font-semibold text-foreground mb-1">{service.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">{service.description}</p>
                    </button>
                ))}
            </div>
        </div>
    );
}
