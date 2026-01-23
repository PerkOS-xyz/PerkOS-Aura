"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useActiveAccount } from "thirdweb/react";
import { ChatInterface } from "../components/ChatInterface";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  conversation_count: number;
}

interface Conversation {
  conversation_id: string;
  first_message: string | null;
  last_message_at: string;
  message_count: number;
}

/**
 * Format wallet address to show first 6 and last 6 characters
 */
function formatAddress(address: string): string {
  if (!address || address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-5)}`;
}

/**
 * Format date to relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function DashboardPage() {
  const account = useActiveAccount();
  const [copied, setCopied] = useState(false);

  // Wallet connection loading state - gives wallet time to auto-reconnect after hot reload
  const [walletLoading, setWalletLoading] = useState(true);
  const walletLoadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Track last known wallet address to prevent unmounting during temporary disconnections
  const lastKnownWalletRef = useRef<string | null>(null);
  const [walletTemporarilyDisconnected, setWalletTemporarilyDisconnected] = useState(false);

  // Project state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Conversation state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(false);
  // Key to force ChatInterface re-mount on "New Chat" click
  const [chatKey, setChatKey] = useState(0);

  // Track recently deleted conversations to prevent race conditions
  const recentlyDeletedRef = useRef<Set<string>>(new Set());

  // Handle wallet loading state - wait a bit for wallet to auto-reconnect after hot reload
  useEffect(() => {
    console.log("[Dashboard] Wallet state changed:", {
      hasAccount: !!account,
      address: account?.address,
      walletLoading,
      hasTimeout: !!walletLoadingTimeoutRef.current,
      lastKnownWallet: lastKnownWalletRef.current,
    });

    if (account?.address) {
      // Wallet connected, save address and stop loading
      console.log("[Dashboard] Wallet connected, stopping loading state");
      lastKnownWalletRef.current = account.address;
      setWalletLoading(false);
      setWalletTemporarilyDisconnected(false);
      if (walletLoadingTimeoutRef.current) {
        clearTimeout(walletLoadingTimeoutRef.current);
        walletLoadingTimeoutRef.current = null;
      }
    } else if (lastKnownWalletRef.current) {
      // Wallet was connected but now appears disconnected - likely temporary
      // Keep the UI mounted and wait longer for reconnection
      console.log("[Dashboard] Wallet temporarily disconnected, waiting for reconnection");
      setWalletTemporarilyDisconnected(true);
      if (!walletLoadingTimeoutRef.current) {
        walletLoadingTimeoutRef.current = setTimeout(() => {
          console.log("[Dashboard] Wallet reconnection timeout expired");
          // Only clear the last known wallet if still disconnected after timeout
          if (!account?.address) {
            console.log("[Dashboard] Wallet still disconnected, clearing state");
            lastKnownWalletRef.current = null;
            setWalletTemporarilyDisconnected(false);
          }
          walletLoadingTimeoutRef.current = null;
        }, 10000); // Wait 10 seconds for reconnection during operations
      }
    } else {
      // No wallet and no previous connection - wait a short time for initial auto-connect
      console.log("[Dashboard] No wallet detected, starting initial timeout");
      if (!walletLoadingTimeoutRef.current) {
        walletLoadingTimeoutRef.current = setTimeout(() => {
          console.log("[Dashboard] Initial wallet timeout expired, showing connect prompt");
          setWalletLoading(false);
          walletLoadingTimeoutRef.current = null;
        }, 1500); // Wait 1.5 seconds for initial auto-reconnect
      }
    }

    return () => {
      if (walletLoadingTimeoutRef.current) {
        clearTimeout(walletLoadingTimeoutRef.current);
      }
    };
  }, [account?.address]);

  // Global error handler for debugging
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("[Dashboard] GLOBAL ERROR CAUGHT:", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("[Dashboard] UNHANDLED PROMISE REJECTION:", {
        reason: event.reason,
        stack: event.reason?.stack,
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  // Cache configuration
  const CACHE_DURATION_MS = 30000; // 30 seconds cache validity
  const getCacheKey = (projectId?: string) =>
    `aura_conversations_${account?.address}_${projectId || "all"}`;

  // Check if cached data is still valid
  const getCachedConversations = useCallback((projectId?: string): { data: Conversation[], isValid: boolean } | null => {
    if (typeof window === "undefined") return null;
    try {
      const cacheKey = getCacheKey(projectId);
      const cached = sessionStorage.getItem(cacheKey);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const isValid = Date.now() - timestamp < CACHE_DURATION_MS;
      return { data, isValid };
    } catch {
      return null;
    }
  }, [account?.address]);

  // Save conversations to cache
  const setCachedConversations = useCallback((conversations: Conversation[], projectId?: string) => {
    if (typeof window === "undefined") return;
    try {
      const cacheKey = getCacheKey(projectId);
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data: conversations,
        timestamp: Date.now(),
      }));
    } catch {
      // Ignore storage errors (quota exceeded, etc.)
    }
  }, [account?.address]);

  // UI state
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showConversationList, setShowConversationList] = useState(false);
  const [showAllConversations, setShowAllConversations] = useState(false);
  const [recentSectionExpanded, setRecentSectionExpanded] = useState(false);
  const hasLoadedConversationsRef = useRef(false);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<"conversation" | "project" | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteItemName, setDeleteItemName] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    if (!account?.address) return;

    setLoadingProjects(true);
    try {
      const response = await fetch(`/api/projects?walletAddress=${account.address}`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoadingProjects(false);
    }
  }, [account?.address]);

  // Fetch conversations for selected project (with caching)
  const fetchConversations = useCallback(async (options: { preserveOptimistic?: boolean; forceRefresh?: boolean } = {}) => {
    const { preserveOptimistic = false, forceRefresh = false } = options;
    const projectId = selectedProject?.id;

    console.log("[Dashboard] fetchConversations called", {
      hasAccount: !!account?.address,
      selectedProjectId: projectId,
      preserveOptimistic,
      forceRefresh,
    });

    if (!account?.address) return;

    // Check cache first (unless force refresh)
    if (!forceRefresh && !preserveOptimistic) {
      const cached = getCachedConversations(projectId);
      if (cached) {
        console.log("[Dashboard] Using cached conversations", {
          count: cached.data.length,
          isValid: cached.isValid,
        });

        // Use cached data immediately
        const filteredCached = cached.data.filter(
          (c) => !recentlyDeletedRef.current.has(c.conversation_id)
        );
        setConversations(filteredCached);

        // If cache is still valid, don't fetch from server
        if (cached.isValid) {
          console.log("[Dashboard] Cache is valid, skipping server fetch");
          return;
        }

        // Cache is stale - fetch in background without showing loading state
        console.log("[Dashboard] Cache is stale, fetching in background");
      }
    }

    // Show loading only if we don't have cached data
    const cached = getCachedConversations(projectId);
    if (!cached || forceRefresh) {
      setLoadingConversations(true);
    }

    try {
      let url = `/api/conversations?walletAddress=${account.address}`;
      if (projectId) {
        url += `&projectId=${projectId}`;
      }

      console.log("[Dashboard] Fetching conversations from server:", url);
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        const fetchedConversations = data.conversations || [];
        console.log("[Dashboard] Fetched conversations from server:", fetchedConversations.length);

        // Deduplicate conversations by conversation_id
        const uniqueConversations = fetchedConversations.reduce((acc: Conversation[], curr: Conversation) => {
          if (!acc.find((c) => c.conversation_id === curr.conversation_id)) {
            acc.push(curr);
          }
          return acc;
        }, [] as Conversation[]);

        if (uniqueConversations.length !== fetchedConversations.length) {
          console.warn("[Dashboard] Removed duplicate conversations:", {
            original: fetchedConversations.length,
            unique: uniqueConversations.length,
          });
        }

        // Save to cache
        setCachedConversations(uniqueConversations, projectId);

        if (preserveOptimistic) {
          // Merge with existing conversations, prioritizing fetched ones but keeping optimistic updates
          setConversations((prev) => {
            const fetchedIds = new Set(uniqueConversations.map((c: Conversation) => c.conversation_id));
            const optimisticOnly = prev.filter((c) => !fetchedIds.has(c.conversation_id));
            // Combine: fetched conversations first, then optimistic-only ones
            // Also deduplicate the combined result
            const combined = [...uniqueConversations, ...optimisticOnly];
            // Filter out recently deleted conversations to prevent race conditions
            return combined
              .filter((c) => !recentlyDeletedRef.current.has(c.conversation_id))
              .reduce((acc: Conversation[], curr: Conversation) => {
                if (!acc.find((c) => c.conversation_id === curr.conversation_id)) {
                  acc.push(curr);
                }
                return acc;
              }, [] as Conversation[]);
          });
        } else {
          // Replace entirely (normal refresh) - still filter out recently deleted
          setConversations(
            uniqueConversations.filter((c: Conversation) => !recentlyDeletedRef.current.has(c.conversation_id))
          );
        }
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoadingConversations(false);
    }
  }, [account?.address, selectedProject, getCachedConversations, setCachedConversations]);

  // Track previous project to detect actual changes
  const prevProjectIdRef = useRef<string | null | undefined>(undefined);
  // Track if initial load has happened
  const initialLoadDoneRef = useRef(false);

  // Load projects on mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Load conversations when section is expanded or project changes
  useEffect(() => {
    const currentProjectId = selectedProject?.id || null;
    const prevProjectId = prevProjectIdRef.current;

    console.log("[Dashboard] Conversations useEffect triggered", {
      currentProjectId,
      prevProjectId,
      initialLoadDone: initialLoadDoneRef.current,
      recentSectionExpanded,
      selectedConversation,
    });

    // Only fetch if section is expanded OR if there's a selected conversation (need to show it)
    const shouldFetch = recentSectionExpanded || selectedConversation;

    if (shouldFetch && !hasLoadedConversationsRef.current) {
      // First time loading
      fetchConversations({});
      hasLoadedConversationsRef.current = true;
    } else if (shouldFetch) {
      // Subsequent loads - force refresh if project changed
      const projectChanged = initialLoadDoneRef.current && prevProjectId !== currentProjectId;
      if (projectChanged) {
        fetchConversations({ forceRefresh: true });
      }
    }

    // Only reset selected conversation when project actually changes (not on mount)
    const projectChanged = initialLoadDoneRef.current && prevProjectId !== currentProjectId;
    if (projectChanged) {
      console.log("[Dashboard] Project changed - resetting selected conversation");
      setSelectedConversation(null);
      hasLoadedConversationsRef.current = false; // Reset so we reload when section expands
    }

    prevProjectIdRef.current = currentProjectId;
    initialLoadDoneRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject?.id, account?.address, recentSectionExpanded, selectedConversation]);

  // Keyboard navigation for modals (Escape key to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showNewProjectModal) {
          setShowNewProjectModal(false);
          setNewProjectName("");
          setNewProjectDescription("");
        }
      }
    };

    if (showNewProjectModal) {
      document.addEventListener("keydown", handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [showNewProjectModal]);

  // Create new project
  const handleCreateProject = async () => {
    if (!account?.address || !newProjectName.trim()) return;

    setCreatingProject(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: account.address,
          name: newProjectName.trim(),
          description: newProjectDescription.trim() || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // API returns projectId, so we need to fetch the full project list to get the project object
        await fetchProjects();
        // Find and select the newly created project
        const projectsResponse = await fetch(`/api/projects?walletAddress=${account.address}`);
        if (projectsResponse.ok) {
          const projectsData = await projectsResponse.json();
          const newProject = projectsData.projects?.find((p: Project) => p.id === data.projectId);
          if (newProject) {
            setSelectedProject(newProject);
          }
        }
        setShowNewProjectModal(false);
        setNewProjectName("");
        setNewProjectDescription("");
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to create project");
      }
    } catch (error) {
      console.error("Failed to create project:", error);
      alert("Failed to create project. Please try again.");
    } finally {
      setCreatingProject(false);
    }
  };

  // Open delete confirmation dialog for project
  const openDeleteProjectDialog = (projectId: string, projectName: string) => {
    setDeleteType("project");
    setDeleteId(projectId);
    setDeleteItemName(projectName);
    setDeleteDialogOpen(true);
  };

  // Delete project
  const handleDeleteProject = async () => {
    if (!account?.address || !deleteId) return;

    try {
      const response = await fetch(`/api/projects/${deleteId}?walletAddress=${account.address}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== deleteId));
        if (selectedProject?.id === deleteId) {
          setSelectedProject(null);
        }
        setDeleteDialogOpen(false);
        setDeleteId(null);
        setDeleteType(null);
        setDeleteItemName(null);
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to delete project");
      }
    } catch (error) {
      console.error("Failed to delete project:", error);
      alert("Failed to delete project. Please try again.");
    }
  };

  // Open delete confirmation dialog for conversation
  const openDeleteConversationDialog = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const conversation = conversations.find((c) => c.conversation_id === conversationId);
    setDeleteType("conversation");
    setDeleteId(conversationId);
    setDeleteItemName(conversation?.first_message || "conversation");
    setDeleteDialogOpen(true);
  };

  // Delete conversation
  const handleDeleteConversation = async () => {
    if (!account?.address || !deleteId || isDeleting) {
      console.warn("[Dashboard] Delete blocked:", { hasAccount: !!account?.address, deleteId, isDeleting });
      return;
    }

    setIsDeleting(true);

    // Get the exact conversation object to ensure we have the right ID
    const conversation = conversations.find((c) => c.conversation_id === deleteId);

    console.log("[Dashboard] Deleting conversation:", {
      deleteId,
      conversationFromList: conversation,
      conversationIdFromList: conversation?.conversation_id,
      match: conversation?.conversation_id === deleteId,
      allConversationIds: conversations.map((c) => c.conversation_id),
      conversationCount: conversations.length,
    });

    try {
      // Use the exact conversation_id from the list, URL encoded
      const conversationIdToDelete = conversation?.conversation_id || deleteId;
      const encodedConversationId = encodeURIComponent(conversationIdToDelete);

      const response = await fetch(
        `/api/conversations/${encodedConversationId}?walletAddress=${encodeURIComponent(account.address)}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("[Dashboard] Delete response:", data);

        // Track deleted conversation to prevent race conditions with optimistic refreshes
        recentlyDeletedRef.current.add(deleteId);

        // Remove from UI immediately (optimistic update)
        // Always remove from UI, even if deletedCount is 0
        // The server refresh will confirm if it's really gone
        setConversations((prev) => prev.filter((c) => c.conversation_id !== deleteId));
        if (selectedConversation === deleteId) {
          setSelectedConversation(null);
        }
        setDeleteDialogOpen(false);
        setDeleteId(null);
        setDeleteType(null);
        setDeleteItemName(null);

        // Refresh from server to ensure consistency
        // Use a longer delay to allow the server to process the deletion
        // If the conversation still appears, it means the delete didn't work
        setTimeout(() => {
          fetchConversations({ forceRefresh: true }); // Force refresh after deletion to ensure consistency
        }, 1000);

        // Clean up the recently deleted tracking after 5 seconds
        // This prevents memory leaks while ensuring race conditions are handled
        setTimeout(() => {
          recentlyDeletedRef.current.delete(deleteId);
        }, 5000);
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.message || errorData.error || "Failed to delete conversation";

        alert(errorMessage);
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      alert("Failed to delete conversation. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyAddress = async () => {
    if (!account?.address) return;

    try {
      await navigator.clipboard.writeText(account.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy address:", error);
    }
  };

  // Start new conversation
  const handleNewConversation = () => {
    setSelectedConversation(null);
    setShowConversationList(false); // Close mobile conversation list
    // Increment key to force ChatInterface to re-mount with fresh state
    setChatKey(prev => prev + 1);
  };

  // Handle conversation change from ChatInterface
  const handleConversationChange = async (conversationId: string, firstMessage?: string) => {
    console.log("[Dashboard] handleConversationChange called", {
      conversationId,
      firstMessage,
      currentSelectedConversation: selectedConversation,
    });

    setSelectedConversation(conversationId);
    // Auto-expand the Recent section when a new conversation is created
    setRecentSectionExpanded(true);

    // Optimistically add the new conversation to the list if it doesn't exist
    // Use callback form to ensure we're checking against the latest state
    setConversations((prev) => {
      const exists = prev.some((c) => c.conversation_id === conversationId);
      if (exists) {
        // Already exists, return unchanged
        return prev;
      }
      // Add new conversation at the beginning
      const newConversation: Conversation = {
        conversation_id: conversationId,
        first_message: firstMessage || "New conversation",
        last_message_at: new Date().toISOString(),
        message_count: 1,
      };
      return [newConversation, ...prev];
    });

    // Refresh conversations from server to ensure we have the latest data
    // Use preserveOptimistic=true to keep the optimistic update if server hasn't processed it yet
    // Use a longer delay to allow the server to fully process the new conversation
    setTimeout(() => {
      fetchConversations({ preserveOptimistic: true }); // Keep optimistic updates while syncing with server
    }, 1500);
  };

  // Use last known wallet address if temporarily disconnected during operations
  const effectiveWalletAddress = account?.address || lastKnownWalletRef.current;

  // Show loading state while waiting for wallet to potentially reconnect
  if (!effectiveWalletAddress && walletLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-aura-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Connecting wallet...</p>
        </div>
      </div>
    );
  }

  // Only show connect prompt if wallet was never connected
  if (!effectiveWalletAddress) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-muted-foreground">Please connect your wallet to access the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Wallet temporarily disconnected banner */}
      {walletTemporarilyDisconnected && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 flex items-center justify-center gap-2 text-yellow-600 dark:text-yellow-400 text-sm">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Wallet temporarily disconnected. Reconnecting...</span>
        </div>
      )}
      <div className="flex-1 flex overflow-hidden">
      {/* Mobile Sidebar Backdrop */}
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-10 md:hidden transition-opacity"
          onClick={() => setSidebarCollapsed(true)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div
        className={`${sidebarCollapsed ? "w-0 md:w-0" : "w-64 sm:w-72"
          } bg-muted/30 border-r border-border flex flex-col transition-all duration-300 flex-shrink-0 absolute md:relative z-20 h-full overflow-hidden`}
      >
        {/* Sidebar Header */}
        <div className="p-4 flex items-center justify-between">
          <div className="font-semibold text-lg text-aura-gradient">Aura</div>
          <button
            onClick={() => setSidebarCollapsed(true)}
            className="md:hidden p-1 hover:bg-muted rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* New Chat & Project Buttons */}
        <div className="px-3 pb-4 space-y-2">
          <button
            onClick={handleNewConversation}
            className="w-full flex items-center gap-3 px-4 py-3 bg-aura-gradient text-white rounded-xl hover:opacity-90 transition-all shadow-sm group aura-glow-sm"
          >
            <div className="bg-white/20 p-1 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold">New Chat</div>
              <div className="text-[10px] opacity-80">Start a new conversation</div>
            </div>
          </button>

          <button
            onClick={() => setShowNewProjectModal(true)}
            className="w-full flex items-center gap-3 px-4 py-2 bg-card border border-border hover:bg-muted/50 rounded-xl transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span>New Project</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scroll-smooth px-3 space-y-6">

          {/* Recent Section - Collapsible */}
          <div>
            <button
              onClick={() => setRecentSectionExpanded(!recentSectionExpanded)}
              className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-muted/50 rounded-lg transition-colors group"
            >
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
                Recent
                {conversations.length > 0 && (
                  <span className="ml-1.5 text-[10px] font-normal opacity-60">({conversations.length})</span>
                )}
              </h3>
              <svg
                className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${recentSectionExpanded ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Collapsible content */}
            <div
              className={`overflow-hidden transition-all duration-200 ${recentSectionExpanded ? "max-h-[500px] opacity-100 mt-1" : "max-h-0 opacity-0"}`}
            >
              <div className="space-y-1">
                {loadingConversations ? (
                  <div className="px-2 py-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-aura-purple/40 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-aura-purple/40 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <div className="w-2 h-2 bg-aura-purple/40 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="px-2 text-xs text-muted-foreground">No recent chats</div>
                ) : (
                  <>
                    {(showAllConversations ? conversations : conversations.slice(0, 5)).map((conv) => (
                      <div key={conv.conversation_id} className="group relative">
                        <button
                          onClick={() => setSelectedConversation(conv.conversation_id)}
                          title={conv.first_message || "New Chat"}
                          className={`w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm flex items-center gap-2 truncate ${selectedConversation === conv.conversation_id ? "bg-muted font-medium text-foreground" : "text-muted-foreground"
                            }`}
                        >
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                          <span className="truncate">{conv.first_message || "New Chat"}</span>
                        </button>
                        <button
                          onClick={(e) => openDeleteConversationDialog(conv.conversation_id, e)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-3 h-3 text-muted-foreground hover:text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {conversations.length > 5 && (
                      <button
                        onClick={() => setShowAllConversations(!showAllConversations)}
                        className="w-full text-left px-3 py-2 text-xs text-aura-purple hover:text-aura-cyan hover:bg-muted/50 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <svg
                          className={`w-3 h-3 transition-transform ${showAllConversations ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        {showAllConversations
                          ? "Show less"
                          : `Show ${conversations.length - 5} more`}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Projects Section */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">Projects</h3>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedProject(null)}
                className={`w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm flex items-center gap-2 ${!selectedProject ? "bg-muted font-medium text-foreground" : "text-muted-foreground"
                  }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                All Chats
              </button>
              {projects.map((project) => (
                <div key={project.id} className="group relative">
                  <button
                    onClick={() => setSelectedProject(project)}
                    className={`w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm flex items-center gap-2 truncate ${selectedProject?.id === project.id ? "bg-muted font-medium text-foreground" : "text-muted-foreground"
                      }`}
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span className="truncate">{project.name}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openDeleteProjectDialog(project.id, project.name);
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-3 h-3 text-muted-foreground hover:text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer / Wallet */}
        <div className="p-3 border-t border-border mt-auto">
          <div className="flex items-center gap-2 p-2 hover:bg-background rounded-lg transition-colors cursor-pointer" onClick={handleCopyAddress}>
            <div className="w-8 h-8 rounded-full bg-aura-gradient flex items-center justify-center text-white text-xs font-bold">
              {account.address.slice(2, 4).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-foreground truncate">
                {/* TODO: Integrate ENS resolution */}
                {formatAddress(account.address)}
              </div>
              <div className="text-[10px] text-muted-foreground">{copied ? "Copied!" : "Click to copy"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="md:hidden p-2 bg-background/80 backdrop-blur rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Header Actions if needed */}
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 flex flex-col bg-background min-w-0 overflow-hidden pt-0">
          <ChatInterface
            key={`chat-${chatKey}-${selectedConversation || 'new'}`}
            conversationId={selectedConversation || undefined}
            projectId={selectedProject?.id}
            onConversationChange={handleConversationChange}
          />
        </div>
      </div>
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            // Close when clicking backdrop (not modal content)
            if (e.target === e.currentTarget) {
              setShowNewProjectModal(false);
              setNewProjectName("");
              setNewProjectDescription("");
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div
            className="bg-card border border-border rounded-xl p-6 w-full max-w-md mx-4 animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="modal-title" className="text-xl font-bold text-foreground mb-4">Create New Project</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="project-name" className="block text-sm font-medium text-foreground mb-1">
                  Project Name
                </label>
                <input
                  id="project-name"
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="My AI Project"
                  autoFocus
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-aura-purple focus:ring-1 focus:ring-aura-purple/50"
                />
              </div>
              <div>
                <label htmlFor="project-description" className="block text-sm font-medium text-foreground mb-1">
                  Description (optional)
                </label>
                <textarea
                  id="project-description"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="What is this project about?"
                  rows={3}
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-aura-purple focus:ring-1 focus:ring-aura-purple/50 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowNewProjectModal(false);
                  setNewProjectName("");
                  setNewProjectDescription("");
                }}
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim() || creatingProject}
                className="px-4 py-2 bg-aura-gradient text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-colors"
              >
                {creatingProject ? "Creating..." : "Create Project"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteType === "project" ? "Project" : "Conversation"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === "project" ? (
                <>
                  Are you sure you want to delete <strong>{deleteItemName}</strong>? All conversations will be kept but unlinked from this project.
                </>
              ) : (
                <>
                  Are you sure you want to delete this conversation? This action cannot be undone.
                  {deleteItemName && deleteItemName !== "conversation" && (
                    <span className="block mt-2 text-xs opacity-75">
                      Conversation: &quot;{deleteItemName}&quot;
                    </span>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setDeleteId(null);
              setDeleteType(null);
              setDeleteItemName(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (deleteType === "project") {
                  handleDeleteProject();
                } else {
                  handleDeleteConversation();
                }
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
