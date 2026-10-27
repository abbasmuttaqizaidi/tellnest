import React, { useState, useEffect, useCallback } from 'react'
import { Heart, Reply, Flag, Trash2, Send, CornerDownRight, MessageSquare, Sparkles, AlertCircle, Lock } from 'lucide-react'
import { useUser, useClerk } from '@clerk/react'
import { useApp } from '../context/AppContext'
import { UnisexAvatar } from './UnisexAvatar'
import { formatHeartCount } from '../lib/utils'
import {
  getChapterCommentsServerFn,
  postChapterCommentServerFn,
  toggleCommentLikeServerFn,
  deleteChapterCommentServerFn,
  reportChapterCommentServerFn,
  type FormattedCommentItem,
} from '../server/comments'

interface CommentsSectionProps {
  workId: string
  chapterId?: string
  workAuthorId?: string
  workAuthorHandle?: string
  title?: string
  subtitle?: string
}

export default function CommentsSection({
  workId,
  chapterId,
  workAuthorId,
  workAuthorHandle,
  title = 'Reader Reflections',
  subtitle,
}: CommentsSectionProps) {
  const { user, isLoaded: isUserLoaded } = useUser()
  const { openSignIn } = useClerk()
  const { showToast, userProfileUsername, userDisplayName, customAvatarUrl } = useApp()

  const [comments, setComments] = useState<FormattedCommentItem[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [newCommentText, setNewCommentText] = useState('')
  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isSubmittingReply, setIsSubmittingReply] = useState<boolean>(false)

  // Fetch comments from server
  const loadComments = useCallback(async () => {
    if (!workId) return
    setIsLoading(true)
    try {
      const res = await getChapterCommentsServerFn({
        data: {
          workId,
          chapterId: chapterId || undefined,
          clerkUserId: user?.id || null,
          workAuthorId,
          workAuthorHandle,
        },
      })
      if (res.success) {
        setComments(res.comments)
        setTotalCount(res.totalCount)
      }
    } catch (err: any) {
      console.warn('[CommentsSection] Failed to load comments:', err?.message)
    } finally {
      setIsLoading(false)
    }
  }, [workId, chapterId, user?.id, workAuthorId, workAuthorHandle])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  // Current reader profile info with unique handle priority
  const currentUsername =
    userProfileUsername ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress?.split('@')[0] ||
    'reader'
  const currentDisplayName =
    userDisplayName ||
    user?.fullName ||
    user?.firstName ||
    currentUsername ||
    'Reader'
  const currentAvatar = customAvatarUrl || user?.imageUrl || '/unisex-avatar.svg'

  // Post top-level reflection
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      openSignIn?.()
      return
    }
    const cleanContent = newCommentText.trim()
    if (!cleanContent || isSubmitting) return

    // Optimistic comment insert
    const tempId = `temp-${Date.now()}`
    const isAuthor =
      (workAuthorId && user.id === workAuthorId) ||
      (workAuthorHandle && currentUsername.toLowerCase() === workAuthorHandle.toLowerCase())

    const optimisticComment: FormattedCommentItem = {
      id: tempId,
      workId,
      chapterId,
      parentId: null,
      authorName: currentDisplayName,
      authorHandle: currentUsername,
      authorAvatar: currentAvatar,
      isWorkAuthor: Boolean(isAuthor),
      content: cleanContent,
      timestamp: 'Just now',
      likesCount: 0,
      userLiked: false,
      replies: [],
    }

    setComments((prev) => [optimisticComment, ...prev])
    setTotalCount((prev) => prev + 1)
    setNewCommentText('')
    setIsSubmitting(true)

    try {
      const res = await postChapterCommentServerFn({
        data: {
          clerkUserId: user.id,
          workId,
          chapterId,
          content: cleanContent,
          workAuthorId,
          workAuthorHandle,
        },
      })

      if (res.success && res.comment) {
        // Replace temporary item with verified server item
        setComments((prev) =>
          prev.map((c) => (c.id === tempId ? { ...res.comment, replies: [] } : c))
        )
        showToast('Your reflection was noted')
      }
    } catch (err: any) {
      // Revert optimistic insertion on failure
      setComments((prev) => prev.filter((c) => c.id !== tempId))
      setTotalCount((prev) => Math.max(0, prev - 1))
      showToast(err?.message || 'Could not post reflection')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Post nested reply
  const handleAddReply = async (parentId: string) => {
    if (!user) {
      openSignIn?.()
      return
    }
    const cleanContent = replyText.trim()
    if (!cleanContent || isSubmittingReply) return

    const tempReplyId = `temp-reply-${Date.now()}`
    const isAuthor =
      (workAuthorId && user.id === workAuthorId) ||
      (workAuthorHandle && currentUsername.toLowerCase() === workAuthorHandle.toLowerCase())

    const optimisticReply: FormattedCommentItem = {
      id: tempReplyId,
      workId,
      chapterId,
      parentId,
      authorName: currentDisplayName,
      authorHandle: currentUsername,
      authorAvatar: currentAvatar,
      isWorkAuthor: Boolean(isAuthor),
      content: cleanContent,
      timestamp: 'Just now',
      likesCount: 0,
      userLiked: false,
    }

    // Optimistically update replies
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === parentId) {
          return {
            ...c,
            replies: [...(c.replies || []), optimisticReply],
          }
        }
        return c
      })
    )
    setTotalCount((prev) => prev + 1)
    setReplyText('')
    setReplyingToId(null)
    setIsSubmittingReply(true)

    try {
      const res = await postChapterCommentServerFn({
        data: {
          clerkUserId: user.id,
          workId,
          chapterId,
          content: cleanContent,
          parentCommentId: parentId,
          workAuthorId,
          workAuthorHandle,
        },
      })

      if (res.success && res.comment) {
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === parentId) {
              return {
                ...c,
                replies: (c.replies || []).map((r) => (r.id === tempReplyId ? res.comment : r)),
              }
            }
            return c
          })
        )
        showToast('Reply published')
      }
    } catch (err: any) {
      // Revert optimistic reply
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === parentId) {
            return {
              ...c,
              replies: (c.replies || []).filter((r) => r.id !== tempReplyId),
            }
          }
          return c
        })
      )
      setTotalCount((prev) => Math.max(0, prev - 1))
      showToast(err?.message || 'Could not post reply')
    } finally {
      setIsSubmittingReply(false)
    }
  }

  // Toggle Like / Heart with optimistic count & animation
  const handleToggleLike = async (commentId: string) => {
    if (!user) {
      showToast('Sign in to like reflections')
      openSignIn?.()
      return
    }

    // Apply optimistic like update across parent comments and nested replies
    let previousLikedState = false
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          previousLikedState = c.userLiked
          const nextLiked = !c.userLiked
          return {
            ...c,
            userLiked: nextLiked,
            likesCount: nextLiked ? c.likesCount + 1 : Math.max(0, c.likesCount - 1),
          }
        }
        if (c.replies && c.replies.some((r) => r.id === commentId)) {
          return {
            ...c,
            replies: c.replies.map((r) => {
              if (r.id === commentId) {
                previousLikedState = r.userLiked
                const nextLiked = !r.userLiked
                return {
                  ...r,
                  userLiked: nextLiked,
                  likesCount: nextLiked ? r.likesCount + 1 : Math.max(0, r.likesCount - 1),
                }
              }
              return r
            }),
          }
        }
        return c
      })
    )

    try {
      await toggleCommentLikeServerFn({
        data: {
          clerkUserId: user.id,
          commentId,
        },
      })
    } catch (err: any) {
      // Revert like state on failure
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            return {
              ...c,
              userLiked: previousLikedState,
              likesCount: previousLikedState ? c.likesCount + 1 : Math.max(0, c.likesCount - 1),
            }
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === commentId
                  ? {
                      ...r,
                      userLiked: previousLikedState,
                      likesCount: previousLikedState ? r.likesCount + 1 : Math.max(0, r.likesCount - 1),
                    }
                  : r
              ),
            }
          }
          return c
        })
      )
      showToast('Network error updating like')
    }
  }

  // Delete own comment
  const handleDeleteComment = async (commentId: string, parentCommentId?: string | null) => {
    if (!user) return
    const confirmed = window.confirm('Are you sure you want to remove this reflection?')
    if (!confirmed) return

    // Optimistically remove
    setComments((prev) => {
      if (!parentCommentId) {
        return prev.filter((c) => c.id !== commentId)
      }
      return prev.map((c) => {
        if (c.id === parentCommentId) {
          return {
            ...c,
            replies: (c.replies || []).filter((r) => r.id !== commentId),
          }
        }
        return c
      })
    })
    setTotalCount((prev) => Math.max(0, prev - 1))
    showToast('Reflection removed')

    try {
      await deleteChapterCommentServerFn({
        data: {
          clerkUserId: user.id,
          commentId,
        },
      })
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete reflection')
      loadComments()
    }
  }

  // Report comment
  const handleReportComment = async (commentId: string) => {
    if (!user) {
      showToast('Sign in to report a reflection')
      openSignIn?.()
      return
    }
    try {
      await reportChapterCommentServerFn({
        data: {
          clerkUserId: user.id,
          commentId,
        },
      })
      showToast('Reflection reported for editorial review')
    } catch (err: any) {
      showToast('Failed to report reflection')
    }
  }

  return (
    <section className="mt-16 pt-12 border-t border-[var(--border-subtle)] font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-xl sm:text-2xl font-semibold text-[var(--ink-primary)]">
              {title}
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[var(--bg-subtle)] text-[var(--ink-muted)] border border-[var(--border-subtle)]">
              <MessageSquare className="h-3 w-3" />
              {totalCount}
            </span>
          </div>
          <p className="text-xs text-[var(--ink-muted)] mt-1">
            {subtitle || (chapterId
              ? 'Measured literary commentary and observations on this chapter'
              : 'Reader reflections and literary discourse on this manuscript')}
          </p>
        </div>
      </div>

      {/* New Comment Input Box */}
      {user ? (
        <form onSubmit={handleAddComment} className="mb-10">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 focus-within:border-[var(--ink-primary)] transition-all shadow-xs">
            <textarea
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Share an observation on the language, rhythm, narrative, or symbolism..."
              rows={3}
              maxLength={2500}
              className="w-full resize-none bg-transparent text-xs text-[var(--ink-primary)] placeholder-[var(--ink-faint)] focus:outline-none leading-relaxed"
            />
            <div className="flex items-center justify-between pt-2.5 border-t border-[var(--border-subtle)] mt-2">
              <div className="flex items-center gap-2">
                <UnisexAvatar src={currentAvatar} name={currentDisplayName} size="xs" />
                <span className="text-[11px] text-[var(--ink-faint)] font-mono">
                  Reflecting as <strong className="text-[var(--ink-secondary)]">@{currentUsername}</strong>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-[var(--ink-faint)]">
                  {newCommentText.length}/2500
                </span>
                <button
                  type="submit"
                  disabled={!newCommentText.trim() || isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-3.5 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer shadow-2xs"
                >
                  <Send className={`h-3 w-3 ${isSubmitting ? 'animate-spin' : ''}`} />
                  <span>{isSubmitting ? 'Publishing...' : 'Publish'}</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-10 rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 p-6 text-center space-y-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--ink-muted)]">
            <Lock className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <h4 className="font-serif text-sm font-semibold text-[var(--ink-primary)]">
              Members-Only Discussion
            </h4>
            <p className="text-xs text-[var(--ink-muted)] max-w-sm mx-auto leading-relaxed">
              Public readers can freely browse reflections. To join the literary discourse, publish notes, reply, or heart reflections, please sign in.
            </p>
          </div>
          <button
            onClick={() => openSignIn?.()}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
          >
            <span>Sign In to Leave a Reflection</span>
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4 py-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 space-y-3 animate-pulse"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-[var(--bg-subtle)]" />
                <div className="space-y-1">
                  <div className="h-3 w-28 rounded bg-[var(--bg-subtle)]" />
                  <div className="h-2 w-16 rounded bg-[var(--bg-subtle)]" />
                </div>
              </div>
              <div className="h-3 w-full rounded bg-[var(--bg-subtle)]" />
              <div className="h-3 w-3/4 rounded bg-[var(--bg-subtle)]" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && comments.length === 0 && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center space-y-2">
          <p className="font-serif text-sm font-medium text-[var(--ink-secondary)]">
            No reflections on this chapter yet.
          </p>
          <p className="text-xs text-[var(--ink-muted)] max-w-md mx-auto">
            Be the first reader to share an observation on the language, rhythm, or narrative arc of this chapter.
          </p>
        </div>
      )}

      {/* Comments List */}
      {!isLoading && comments.length > 0 && (
        <div className="space-y-4">
          {comments.map((comment) => {
            const isCommentOwner = user && comment.authorHandle && currentUsername.toLowerCase() === comment.authorHandle.toLowerCase()

            return (
              <div
                key={comment.id}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5 transition-all shadow-2xs hover:border-[var(--border-strong)]"
              >
                {/* Comment Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <UnisexAvatar src={comment.authorAvatar} name={comment.authorName} size="xs" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[var(--ink-primary)]">
                          {comment.authorName}
                        </span>
                        {comment.isWorkAuthor && (
                          <span className="rounded bg-amber-600 dark:bg-amber-500 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white uppercase tracking-wider">
                            Author
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-[var(--ink-faint)]">
                        @{comment.authorHandle} • {comment.timestamp}
                      </span>
                    </div>
                  </div>

                  {/* Actions (Delete if owner, Report) */}
                  <div className="flex items-center gap-1 text-[var(--ink-faint)]">
                    {isCommentOwner && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="p-1.5 hover:text-rose-500 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="Delete your reflection"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleReportComment(comment.id)}
                      className="p-1.5 hover:text-[var(--ink-primary)] rounded hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                      title="Report this reflection"
                    >
                      <Flag className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <p className="mt-3 text-xs leading-relaxed text-[var(--ink-secondary)] whitespace-pre-wrap">
                  {comment.content}
                </p>

                {/* Bottom Action Bar */}
                <div className="mt-3.5 pt-2.5 border-t border-[var(--border-subtle)] flex items-center gap-5 text-xs font-mono">
                  {/* Like Button */}
                  <button
                    onClick={() => handleToggleLike(comment.id)}
                    className={`inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                      comment.userLiked
                        ? 'text-[var(--ink-primary)] font-semibold'
                        : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                    }`}
                    title={comment.userLiked ? `Unlike reflection (${formatHeartCount(comment.likesCount, false)})` : `Heart this reflection (${formatHeartCount(comment.likesCount, false)})`}
                  >
                    <Heart className={`h-3.5 w-3.5 ${comment.userLiked ? 'fill-current text-[var(--ink-primary)]' : ''}`} />
                    <span>{formatHeartCount(comment.likesCount, true)}</span>
                  </button>

                  {/* Reply Button */}
                  <button
                    onClick={() => {
                      if (!user) {
                        showToast('Sign in to reply to reflections')
                        openSignIn?.()
                        return
                      }
                      setReplyingToId(replyingToId === comment.id ? null : comment.id)
                    }}
                    className="inline-flex items-center gap-1 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
                  >
                    <Reply className="h-3.5 w-3.5" />
                    <span>Reply</span>
                  </button>
                </div>

                {/* Nested Reply Composer */}
                {replyingToId === comment.id && (
                  <div className="mt-3 pl-3 sm:pl-4 border-l-2 border-[var(--border-strong)] pt-2 space-y-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Reply to ${comment.authorName}...`}
                      className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-1.5 text-xs text-[var(--ink-primary)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-[var(--ink-primary)]"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setReplyingToId(null)}
                        className="px-2.5 py-1 text-xs text-[var(--ink-muted)] hover:text-[var(--ink-primary)] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleAddReply(comment.id)}
                        disabled={!replyText.trim() || isSubmittingReply}
                        className="rounded-lg bg-[var(--ink-primary)] px-3 py-1 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer shadow-2xs"
                      >
                        {isSubmittingReply ? 'Sending...' : 'Send Reply'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Render Nested Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-4 space-y-3 pl-3 sm:pl-5 border-l-2 border-[var(--border-subtle)]">
                    {comment.replies.map((reply) => {
                      const isReplyOwner = user && reply.authorHandle && currentUsername.toLowerCase() === reply.authorHandle.toLowerCase()

                      return (
                        <div key={reply.id} className="pt-2 group">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CornerDownRight className="h-3 w-3 text-[var(--ink-faint)] shrink-0" />
                              <UnisexAvatar src={reply.authorAvatar} name={reply.authorName} size="xs" />
                              <span className="text-xs font-semibold text-[var(--ink-primary)]">
                                {reply.authorName}
                              </span>
                              {reply.isWorkAuthor && (
                                <span className="rounded bg-amber-600 dark:bg-amber-500 px-1 py-0.2 font-mono text-[8px] font-bold text-white uppercase">
                                  Author
                                </span>
                              )}
                              <span className="font-mono text-[10px] text-[var(--ink-faint)]">
                                • {reply.timestamp}
                              </span>
                            </div>

                            {/* Reply Actions */}
                            <div className="flex items-center gap-2 text-[var(--ink-faint)]">
                              <button
                                onClick={() => handleToggleLike(reply.id)}
                                className={`inline-flex items-center gap-1 text-[11px] font-mono cursor-pointer transition-colors ${
                                  reply.userLiked
                                    ? 'text-[var(--ink-primary)] font-semibold'
                                    : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                                }`}
                                title={reply.userLiked ? `Unlike reflection (${formatHeartCount(reply.likesCount, false)})` : `Heart this reflection (${formatHeartCount(reply.likesCount, false)})`}
                              >
                                <Heart className={`h-3 w-3 ${reply.userLiked ? 'fill-current text-[var(--ink-primary)]' : ''}`} />
                                <span>{formatHeartCount(reply.likesCount, true)}</span>
                              </button>

                              {isReplyOwner && (
                                <button
                                  onClick={() => handleDeleteComment(reply.id, comment.id)}
                                  className="p-1 hover:text-rose-500 rounded transition-colors cursor-pointer"
                                  title="Delete reply"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="mt-1 pl-5 sm:pl-6 text-xs leading-relaxed text-[var(--ink-muted)] whitespace-pre-wrap">
                            {reply.content}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
