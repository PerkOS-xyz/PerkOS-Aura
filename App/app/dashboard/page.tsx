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
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
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

  // Project state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Conversation state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(false);

  // UI state
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showConversationList, setShowConversationList] = useState(false);

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

  // Fetch conversations for selected project
  const fetchConversations = useCallback(async (preserveOptimistic = false) => {
    console.log("[Dashboard] fetchConversations called", {
      hasAccount: !!account?.address,
      selectedProjectId: selectedProject?.id,
      preserveOptimistic,
    });

    if (!account?.address) return;

    setLoadingConversations(true);
    try {
      let url = `/api/conversations?walletAddress=${account.address}`;
      if (selectedProject) {
        url += `&projectId=${selectedProject.id}`;
      }

      console.log("[Dashboard] Fetching conversations from:", url);
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const fetchedConversations = data.conversations || [];
        console.log("[Dashboard] Fetched conversations:", fetchedConversations.length);

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

        if (preserveOptimistic) {
          // Merge with existing conversations, prioritizing fetched ones but keeping optimistic updates
          setConversations((prev) => {
            const fetchedIds = new Set(uniqueConversations.map((c: Conversation) => c.conversation_id));
            const optimisticOnly = prev.filter((c) => !fetchedIds.has(c.conversation_id));
            // Combine: fetched conversations first, then optimistic-only ones
            // Also deduplicate the combined result
            const combined = [...uniqueConversations, ...optimisticOnly];
            return combined.reduce((acc: Conversation[], curr: Conversation) => {
              if (!acc.find((c) => c.conversation_id === curr.conversation_id)) {
                acc.push(curr);
              }
              return acc;
            }, [] as Conversation[]);
          });
        } else {
          // Replace entirely (normal refresh)
          setConversations(uniqueConversations);
        }
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoadingConversations(false);
    }
  }, [account?.address, selectedProject]);

  // Track previous project to detect actual changes
  const prevProjectIdRef = useRef<string | null | undefined>(undefined);
  // Track if initial load has happened
  const initialLoadDoneRef = useRef(false);

  // Load projects on mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Load conversations on mount and when project changes
  useEffect(() => {
    const currentProjectId = selectedProject?.id || null;
    const prevProjectId = prevProjectIdRef.current;

    console.log("[Dashboard] Conversations useEffect triggered", {
      currentProjectId,
      prevProjectId,
      initialLoadDone: initialLoadDoneRef.current,
      selectedConversation,
    });

    // Fetch conversations (normal refresh)
    fetchConversations(false);

    // Only reset selected conversation when project actually changes (not on mount)
    if (initialLoadDoneRef.current && prevProjectId !== currentProjectId) {
      console.log("[Dashboard] Project changed - resetting selected conversation");
      setSelectedConversation(null);
    }

    prevProjectIdRef.current = currentProjectId;
    initialLoadDoneRef.current = true;
    // Only depend on selectedProject?.id to avoid re-running when fetchConversations changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject?.id, account?.address]);

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
          fetchConversations(false); // Normal refresh after deletion
        }, 1000);
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
  };

  // Handle conversation change from ChatInterface
  const handleConversationChange = async (conversationId: string, firstMessage?: string) => {
    console.log("[Dashboard] handleConversationChange called", {
      conversationId,
      firstMessage,
      currentSelectedConversation: selectedConversation,
    });

    setSelectedConversation(conversationId);

    // Optimistically add the new conversation to the list if it doesn't exist
    const exists = conversations.some((c) => c.conversation_id === conversationId);
    if (!exists) {
      const newConversation: Conversation = {
        conversation_id: conversationId,
        first_message: firstMessage || "New conversation",
        last_message_at: new Date().toISOString(),
        message_count: 1,
      };
      setConversations((prev) => [newConversation, ...prev]);
    }

    // Refresh conversations from server to ensure we have the latest data
    // Use preserveOptimistic=true to keep the optimistic update if server hasn't processed it yet
    // Use a longer delay to allow the server to fully process the new conversation
    setTimeout(() => {
      fetchConversations(true); // preserveOptimistic = true
    }, 1500);
  };

  if (!account?.address) {
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
    <div className="h-full flex overflow-hidden bg-background">
      {/* Sidebar */}
      <div
        className={`${sidebarCollapsed ? "w-12" : "w-64 sm:w-72"
          } bg-card border-r border-border flex flex-col transition-all duration-300 flex-shrink-0`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          {!sidebarCollapsed && (
            <h2 className="font-semibold text-foreground">Projects</h2>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 hover:bg-muted rounded transition-colors"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              className={`w-5 h-5 text-muted-foreground transition-transform ${sidebarCollapsed ? "rotate-180" : ""
                }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          </button>
        </div>

        {!sidebarCollapsed && (
          <>
            {/* New Project Button */}
            <div className="p-3">
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Project
              </button>
            </div>

            {/* Projects List */}
            <div className="flex-1 overflow-y-auto scroll-smooth">
              {/* All Chats Option */}
              <button
                onClick={() => setSelectedProject(null)}
                className={`w-full text-left px-4 py-3 hover:bg-muted transition-colors flex items-center gap-3 ${!selectedProject ? "bg-muted border-l-2 border-primary" : ""
                  }`}
              >
                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">All Chats</div>
                  <div className="text-xs text-muted-foreground">General conversations</div>
                </div>
              </button>

              {/* Project Items */}
              {loadingProjects ? (
                <div className="p-4 text-center text-muted-foreground text-xs sm:text-sm">Loading projects...</div>
              ) : projects.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-xs sm:text-sm">
                  No projects yet. Create one to organize your chats!
                </div>
              ) : (
                projects.map((project) => (
                  <div
                    key={project.id}
                    className={`group relative ${selectedProject?.id === project.id ? "bg-muted border-l-2 border-primary" : ""
                      }`}
                  >
                    <button
                      onClick={() => setSelectedProject(project)}
                      className="w-full text-left px-4 py-3 hover:bg-muted transition-colors flex items-center gap-3"
                    >
                      <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                        />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground truncate">{project.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {project.conversation_count || 0} chats
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteProjectDialog(project.id, project.name);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-red-500/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete project"
                    >
                      <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Wallet Info */}
            <div className="p-3 border-t border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-bold">
                  {account.address.slice(2, 4).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono text-foreground truncate">
                    {formatAddress(account.address)}
                  </div>
                </div>
                <button
                  onClick={handleCopyAddress}
                  className="p-1.5 hover:bg-muted rounded transition-colors"
                  title="Copy address"
                >
                  {copied ? (
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between bg-card flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold font-heading text-foreground truncate">
              {selectedProject ? selectedProject.name : "All Chats"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {selectedProject?.description || "Your AI agent remembers your conversation history"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile conversation list toggle */}
            <button
              onClick={() => setShowConversationList(!showConversationList)}
              className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
              title="Toggle conversations"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
            <button
              onClick={handleNewConversation}
              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">New Chat</span>
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex overflow-hidden min-h-0 relative">
          {/* Mobile Conversation List Overlay */}
          {showConversationList && (
            <>
              <div
                className="md:hidden fixed inset-0 bg-black/50 z-40"
                onClick={() => setShowConversationList(false)}
              />
              <div className="md:hidden fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border z-50 flex flex-col">
                <div className="p-3 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">Recent Conversations</h3>
                  <button
                    onClick={() => setShowConversationList(false)}
                    className="p-1 hover:bg-muted rounded transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto scroll-smooth">
                  {loadingConversations ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">Loading...</div>
                  ) : conversations.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No conversations yet. Start a new chat!
                    </div>
                  ) : (
                    conversations.map((conv) => (
                      <div
                        key={conv.conversation_id}
                        className={`group relative w-full border-b border-border/50 ${selectedConversation === conv.conversation_id ? "bg-muted" : ""
                          }`}
                      >
                        <button
                          onClick={() => {
                            console.log("[Dashboard] Selecting conversation:", conv.conversation_id);
                            setSelectedConversation(conv.conversation_id);
                            setShowConversationList(false);
                          }}
                          className="w-full text-left p-3 hover:bg-muted transition-colors"
                        >
                          <div className="text-sm text-foreground line-clamp-2">
                            {conv.first_message || "New conversation"}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{formatRelativeTime(conv.last_message_at)}</span>
                            <span>•</span>
                            <span>{conv.message_count} messages</span>
                          </div>
                        </button>
                        <button
                          onClick={(e) => openDeleteConversationDialog(conv.conversation_id, e)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-destructive/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete conversation"
                        >
                          <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {/* Desktop Conversation List */}
          <div className="hidden md:flex w-56 lg:w-64 border-r border-border bg-muted/30 flex flex-col flex-shrink-0">
            <div className="p-3 border-b border-border">
              <h3 className="text-sm font-medium text-muted-foreground">Recent Conversations</h3>
            </div>
            <div className="flex-1 overflow-y-auto scroll-smooth">
              {loadingConversations ? (
                <div className="p-4 text-center text-muted-foreground text-sm">Loading...</div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No conversations yet. Start a new chat!
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.conversation_id}
                    className={`group relative w-full border-b border-border/50 ${selectedConversation === conv.conversation_id ? "bg-muted" : ""
                      }`}
                  >
                    <button
                      onClick={() => {
                        console.log("[Dashboard] Selecting conversation:", conv.conversation_id);
                        setSelectedConversation(conv.conversation_id);
                      }}
                      className="w-full text-left p-3 hover:bg-muted transition-colors"
                    >
                      <div className="text-sm text-foreground line-clamp-2">
                        {conv.first_message || "New conversation"}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{formatRelativeTime(conv.last_message_at)}</span>
                        <span>•</span>
                        <span>{conv.message_count} messages</span>
                      </div>
                    </button>
                    <button
                      onClick={(e) => openDeleteConversationDialog(conv.conversation_id, e)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-destructive/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete conversation"
                    >
                      <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Interface */}
          <div className="flex-1 flex flex-col bg-background min-w-0 overflow-hidden">
            <ChatInterface
              conversationId={selectedConversation || undefined}
              projectId={selectedProject?.id}
              onConversationChange={handleConversationChange}
            />
          </div>
        </div>
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-foreground mb-4">Create New Project</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="My AI Project"
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="What is this project about?"
                  rows={3}
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary resize-none"
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
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
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
