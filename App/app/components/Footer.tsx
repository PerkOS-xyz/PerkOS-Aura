"use client";

import Link from "next/link";
import configData from "@/app/config.json";

export function Footer() {
  const footer = configData.footer || {};
  const social = configData.social || {};

  return (
    <footer className="border-t border-slate-800 bg-slate-950">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-lg font-bold mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {configData.service?.name || "PerkOS Vendor API"}
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              {configData.service?.description || ""}
            </p>
            <div className="flex space-x-4">
              {social.twitter && (
                <a
                  href={`https://twitter.com/${social.twitter.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-cyan-400 transition-colors"
                >
                  Twitter
                </a>
              )}
              {social.github && (
                <a
                  href={`https://github.com/${social.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-cyan-400 transition-colors"
                >
                  GitHub
                </a>
              )}
              {social.discord && (
                <a
                  href={social.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-cyan-400 transition-colors"
                >
                  Discord
                </a>
              )}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {(footer.links || []).map((link: { text: string; url: string }) => (
                <li key={link.url}>
                  <Link
                    href={link.url}
                    className="text-sm text-gray-400 hover:text-cyan-400 transition-colors"
                  >
                    {link.text}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/dashboard/docs"
                  className="text-sm text-gray-400 hover:text-cyan-400 transition-colors"
                >
                  API Documentation
                </Link>
              </li>
              <li>
                <a
                  href="https://x402.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-400 hover:text-cyan-400 transition-colors"
                >
                  x402 Protocol
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-800 text-center text-sm text-gray-400">
          {footer.copyright || "© 2025 PerkOS AI Vendor Service"}
        </div>
      </div>
    </footer>
  );
}

