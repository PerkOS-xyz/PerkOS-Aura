"use client";

import { useState, useEffect } from "react";
import { networkDisplayNames, type NetworkName } from "@/lib/config/x402";

interface NetworkOption {
  network: string; // CAIP-2 format (e.g., "eip155:43114")
  networkName: string; // Legacy name (e.g., "avalanche")
  asset: string; // USDC contract address
}

interface NetworkSelectorProps {
  accepts: NetworkOption[];
  defaultNetwork?: string; // Legacy network name
  value?: string; // Controlled value - the network (CAIP-2 format) or networkName
  onNetworkChange: (selectedAccept: NetworkOption) => void;
  disabled?: boolean;
}

/**
 * Network selector dropdown for multi-chain payment support
 * Displays available networks from x402 accepts array
 * Can be controlled via `value` prop or uncontrolled with internal state
 */
export function NetworkSelector({
  accepts,
  defaultNetwork,
  value,
  onNetworkChange,
  disabled = false,
}: NetworkSelectorProps) {
  // Find default selection based on defaultNetwork or first in list
  const findDefaultOption = (): NetworkOption | undefined => {
    if (defaultNetwork) {
      const found = accepts.find(
        (a) => a.networkName === defaultNetwork || a.network.includes(defaultNetwork)
      );
      if (found) return found;
    }
    return accepts[0];
  };

  // Find option matching the controlled value
  const findValueOption = (): NetworkOption | undefined => {
    if (value) {
      // Try matching by network (CAIP-2) first, then by networkName
      const found = accepts.find(
        (a) => a.network === value || a.networkName === value
      );
      if (found) return found;
    }
    return undefined;
  };

  const [selectedNetwork, setSelectedNetwork] = useState<NetworkOption | undefined>(
    findValueOption() || findDefaultOption()
  );

  // Sync internal state with controlled value prop
  useEffect(() => {
    if (value) {
      const valueOption = findValueOption();
      if (valueOption && valueOption.network !== selectedNetwork?.network) {
        setSelectedNetwork(valueOption);
      }
    }
  }, [value, accepts]);

  // Update selection when accepts change (only for uncontrolled mode)
  useEffect(() => {
    if (value) return; // Skip if controlled
    const defaultOption = findDefaultOption();
    if (defaultOption && (!selectedNetwork || !accepts.find((a) => a.network === selectedNetwork.network))) {
      setSelectedNetwork(defaultOption);
      onNetworkChange(defaultOption);
    }
  }, [accepts, defaultNetwork, value]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const networkId = e.target.value;
    const selected = accepts.find((a) => a.network === networkId);
    if (selected) {
      setSelectedNetwork(selected);
      onNetworkChange(selected);
    }
  };

  if (accepts.length === 0) {
    return null;
  }

  // If only one network, show it as text instead of dropdown
  if (accepts.length === 1) {
    const singleNetwork = accepts[0];
    const displayName = networkDisplayNames[singleNetwork.networkName] || singleNetwork.networkName;
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Network:</span>
        <span className="font-medium text-foreground">{displayName}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="network-selector" className="text-sm text-muted-foreground">
        Network:
      </label>
      <select
        id="network-selector"
        value={selectedNetwork?.network || ""}
        onChange={handleChange}
        disabled={disabled}
        className="px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {accepts.map((option) => {
          const displayName = networkDisplayNames[option.networkName] || option.networkName;
          return (
            <option key={option.network} value={option.network}>
              {displayName}
            </option>
          );
        })}
      </select>
    </div>
  );
}
