"use client";

import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";

interface Transaction {
  id: string;
  transaction_hash: string;
  payer_address: string;
  recipient_address: string;
  amount_usd: number;
  asset_symbol: string;
  network: string;
  status: string;
  created_at: string;
  endpoint_path?: string;
}

export default function TransactionsPage() {
  const account = useActiveAccount();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"24h" | "7d" | "30d">("7d");

  useEffect(() => {
    if (account?.address) {
      fetchTransactions();
    }
  }, [account?.address, period]);

  const fetchTransactions = async () => {
    if (!account?.address) return;

    try {
      setLoading(true);
      // Query PerkOS-Stack facilitator API for transactions
      const facilitatorUrl = process.env.NEXT_PUBLIC_FACILITATOR_URL || "https://stack.perkos.xyz";
      const response = await fetch(
        `${facilitatorUrl}/api/x402/transactions?payer=${account.address}&period=${period}&limit=50`
      );
      
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      } else {
        // Fallback: query local cache if available
        const localResponse = await fetch(`/api/transactions?owner=${account.address}`);
        if (localResponse.ok) {
          const localData = await localResponse.json();
          setTransactions(localData.transactions || []);
        }
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getExplorerUrl = (network: string, hash: string): string => {
    const explorers: Record<string, string> = {
      avalanche: "https://snowtrace.io/tx/",
      "avalanche-fuji": "https://testnet.snowtrace.io/tx/",
      base: "https://basescan.org/tx/",
      "base-sepolia": "https://sepolia.basescan.org/tx/",
      celo: "https://celoscan.io/tx/",
    };
    return `${explorers[network] || "https://etherscan.io/tx/"}${hash}`;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          Your Transactions
        </h1>
        <p className="text-gray-400">
          View your x402 payment transaction history
        </p>
      </div>

      {/* Period Filter */}
      <div className="mb-6 flex justify-end">
        <div className="inline-flex bg-slate-800/50 border border-blue-500/30 rounded-lg p-1 backdrop-blur-sm">
          {(["24h", "7d", "30d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                period === p
                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading transactions...</div>
      ) : transactions.length === 0 ? (
        <div className="bg-slate-800/50 border border-blue-500/30 rounded-xl p-12 text-center">
          <p className="text-gray-400 mb-2">No transactions found</p>
          <p className="text-gray-500 text-sm">
            Your x402 payment transactions will appear here
          </p>
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-blue-500/30 rounded-xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Transaction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Network
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Endpoint
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <a
                        href={getExplorerUrl(tx.network, tx.transaction_hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 font-mono text-sm"
                      >
                        {tx.transaction_hash.slice(0, 10)}...
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-300 capitalize text-sm">
                        {tx.network}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-100 font-medium">
                        ${tx.amount_usd?.toFixed(4) || "0.0000"} {tx.asset_symbol}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-gray-400 text-xs">
                        {tx.endpoint_path || "N/A"}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          tx.status === "success"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-400 text-sm">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

