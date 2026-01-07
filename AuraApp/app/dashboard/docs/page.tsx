"use client";

import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import dynamic from "next/dynamic";
import { PaymentButton } from "@/app/components/PaymentButton";

// Dynamically import Swagger UI (client-side only)
const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });
import "swagger-ui-react/swagger-ui.css";

export default function DocsPage() {
  const account = useActiveAccount();
  const [spec, setSpec] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentRequirements, setPaymentRequirements] = useState<any>(null);

  useEffect(() => {
    fetchSpec();
  }, []);

  const fetchSpec = async () => {
    try {
      const response = await fetch("/api/docs/json");
      if (response.ok) {
        const data = await response.json();
        setSpec(data);
      }
    } catch (error) {
      console.error("Failed to fetch API spec:", error);
    } finally {
      setLoading(false);
    }
  };

  // Custom requestInterceptor to handle x402 payments
  const requestInterceptor = async (request: any) => {
    // Check if this endpoint requires payment
    const url = new URL(request.url);
    const path = url.pathname;

    // Endpoints that require payment
    const paidEndpoints = [
      "/api/ai/analyze",
      "/api/ai/generate",
      "/api/ai/transcribe",
      "/api/ai/synthesize"
    ];

    if (paidEndpoints.includes(path)) {
      // First, try request without payment to get requirements
      const testResponse = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      if (testResponse.status === 402) {
        // Payment required - show payment UI
        const paymentHeader = testResponse.headers.get("PAYMENT-REQUIRED");
        if (paymentHeader) {
          const decoded = atob(paymentHeader);
          const requirements = JSON.parse(decoded);

          return new Promise((resolve) => {
            setPaymentRequirements({
              ...requirements.accepts[0],
              endpoint: path,
              onPaymentSigned: (envelope: any) => {
                // Add payment to request
                const paymentSig = btoa(JSON.stringify(envelope));
                request.headers["PAYMENT-SIGNATURE"] = paymentSig;
                setShowPayment(false);
                setPaymentRequirements(null);
                resolve(request);
              },
              onCancel: () => {
                setShowPayment(false);
                setPaymentRequirements(null);
                resolve(null); // Cancel request
              }
            });
            setShowPayment(true);
          });
        }
      }
    }

    return request;
  };

  if (loading || !spec) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12 text-gray-400">Loading API documentation...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          API Documentation
        </h1>
        <p className="text-gray-400">
          Interactive API documentation with Swagger UI. Paid endpoints will prompt for x402 payment.
        </p>
        {account?.address && (
          <div className="mt-2 text-sm text-green-400">
            ✓ Wallet connected: {account.address.slice(0, 6)}...{account.address.slice(-4)}
          </div>
        )}
        {!account?.address && (
          <div className="mt-2 text-sm text-yellow-400">
            ⚠ Connect wallet to test paid endpoints
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPayment && paymentRequirements && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-blue-500/30 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-100 mb-4">Payment Required</h3>
            <p className="text-gray-300 mb-4">
              This endpoint requires an x402 payment to proceed.
            </p>
            <div className="bg-slate-900/50 rounded-lg p-4 mb-4 text-sm">
              <div className="text-gray-400">Endpoint: <span className="text-cyan-400">{paymentRequirements.endpoint}</span></div>
              <div className="text-gray-400">Price: <span className="text-green-400">${(Number(paymentRequirements.maxAmountRequired) / 1_000_000).toFixed(2)}</span></div>
              <div className="text-gray-400">Network: <span className="text-blue-400">{paymentRequirements.network}</span></div>
            </div>
            <div className="flex gap-3">
              <PaymentButton
                requirements={paymentRequirements}
                onPaymentSigned={paymentRequirements.onPaymentSigned}
                onError={(error) => {
                  console.error("Payment error:", error);
                  alert(`Payment failed: ${error.message}`);
                }}
              />
              <button
                onClick={paymentRequirements.onCancel}
                className="flex-1 px-4 py-2 bg-slate-700 text-gray-300 rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl overflow-hidden">
        <SwaggerUI
          spec={spec}
          requestInterceptor={requestInterceptor}
        />
      </div>
    </div>
  );
}
