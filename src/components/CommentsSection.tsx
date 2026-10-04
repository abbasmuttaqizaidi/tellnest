import { INITIAL_COMMENTS } from '../data/mockData'
import type { CommentItem } from '../data/mockData'
import { Heart, Reply, Flag, Trash2, Send, CornerDownRight } from 'lucide-react'
import { useApp } from '../context/AppContext'

interface CommentsSectionProps {
  workId: string
  chapterId: string
}

export default function CommentsSection({ workId, chapterId }: CommentsSectionProps) {
  const { showToast } = useApp()
  const [comments, setComments] = useState<CommentItem[]>(INITIAL_COMMENTS)
  const [newCommentText, setNewCommentText] = useState('')
  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCommentText.trim()) return

    const newComment: CommentItem = {
      id: `comm-${Date.now()}`,
      workId,
      chapterId,
      authorName: 'Syed Abbas',
      authorHandle: 'syedabbas',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      content: newCommentText.trim(),
      timestamp: 'Just now',
      likesCount: 0,
      userLiked: false
    }

    setComments(prev => [newComment, ...prev])
    setNewCommentText('')
    showToast('Your perspective was noted')
  }

  const handleAddReply = (parentId: string) => {
    if (!replyText.trim()) return

    const newReply: CommentItem = {
      id: `reply-${Date.now()}`,
      workId,
      chapterId,
      authorName: 'Syed Abbas',
      authorHandle: 'syedabbas',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      content: replyText.trim(),
      timestamp: 'Just now',
      likesCount: 0
    }

    setComments(prev => prev.map(c => {
      if (c.id === parentId) {
        return {
          ...c,
          replies: [...(c.replies || []), newReply]
        }
      }
      return c
    }))
    setReplyText('')
    setReplyingToId(null)
    showToast('Reply published')
  }

  const handleToggleLike = (commentId: string) => {
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        const nextLiked = !c.userLiked
        return {
          ...c,
          userLiked: nextLiked,
          likesCount: nextLiked ? c.likesCount + 1 : Math.max(0, c.likesCount - 1)
        }
      }
      return c
    }))
  }

  const handleDeleteComment = (commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId))
    showToast('Comment removed')
  }

  return (
    <section className="mt-16 pt-12 border-t border-[var(--border-subtle)] font-sans">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="font-serif text-xl font-semibold text-[var(--ink-primary)]">
            Reader Reflections
          </h3>
          <p className="text-xs text-[var(--ink-muted)] mt-0.5">
            Measured literary commentary on this chapter
          </p>
        </div>
        <span className="font-mono text-xs text-[var(--ink-faint)]">
          {comments.length} Reflections
        </span>
      </div>

      {/* New Comment Input */}
      <form onSubmit={handleAddComment} className="mb-10">
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 focus-within:border-[var(--border-strong)] transition-all">
          <textarea
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Share an observation on the language, rhythm, or narrative..."
            rows={3}
            className="w-full resize-none bg-transparent text-xs text-[var(--ink-primary)] placeholder-[var(--ink-faint)] focus:outline-none"
          />
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] mt-2">
            <span className="text-[11px] text-[var(--ink-faint)] font-mono">
              Posting as <strong className="text-[var(--ink-secondary)]">@syedabbas</strong>
            </span>
            <button
              type="submit"
              disabled={!newCommentText.trim()}
              className="inline-flex items-center gap-1.5 rounded border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-3 py-1.5 text-xs font-medium text-[var(--accent-contrast)] hover:opacity-90 disabled:opacity-40 transition-all"
            >
              <Send className="h-3 w-3" />
              <span>Publish Note</span>
            </button>
          </div>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-6">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src={comment.authorAvatar}
                  alt={comment.authorName}
                  className="h-7 w-7 rounded-full object-cover grayscale border border-[var(--border-subtle)]"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--ink-primary)]">
                      {comment.authorName}
                    </span>
                    {comment.isWorkAuthor && (
                      <span className="rounded bg-[var(--ink-primary)] px-1.5 py-0.2 font-mono text-[9px] font-medium text-[var(--accent-contrast)] uppercase tracking-wider">
                        Author
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-[var(--ink-faint)]">
                    @{comment.authorHandle} • {comment.timestamp}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {comment.authorHandle === 'syedabbas' && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="p-1 text-[var(--ink-faint)] hover:text-red-500 transition-colors"
                    title="Delete your comment"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => showToast('Reflection reported for review')}
                  className="p-1 text-[var(--ink-faint)] hover:text-[var(--ink-primary)] transition-colors"
                  title="Report"
                >
                  <Flag className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-[var(--ink-secondary)]">
              {comment.content}
            </p>

            {/* Bottom Actions */}
            <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex items-center gap-4 text-xs font-mono">
              <button
                onClick={() => handleToggleLike(comment.id)}
                className={`flex items-center gap-1.5 transition-colors ${
                  comment.userLiked
                    ? 'text-red-500 font-semibold'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                }`}
              >
                <Heart className={`h-3.5 w-3.5 ${comment.userLiked ? 'fill-current' : ''}`} />
                <span>{comment.likesCount}</span>
              </button>

              <button
                onClick={() => setReplyingToId(replyingToId === comment.id ? null : comment.id)}
                className="flex items-center gap-1 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors"
              >
                <Reply className="h-3.5 w-3.5" />
                <span>Reply</span>
              </button>
            </div>

            {/* Nested Reply Input */}
            {replyingToId === comment.id && (
              <div className="mt-3 pl-4 border-l-2 border-[var(--border-strong)] pt-2 space-y-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply to ${comment.authorName}...`}
                  className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--border-strong)]"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setReplyingToId(null)}
                    className="px-2.5 py-1 text-[11px] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleAddReply(comment.id)}
                    className="rounded bg-[var(--ink-primary)] px-3 py-1 text-[11px] font-medium text-[var(--accent-contrast)] hover:opacity-90"
                  >
                    Send Reply
                  </button>
                </div>
              </div>
            )}

            {/* Render Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-4 space-y-3 pl-4 border-l-2 border-[var(--border-subtle)]">
                {comment.replies.map((reply) => (
                  <div key={reply.id} className="pt-2">
                    <div className="flex items-center gap-2">
                      <CornerDownRight className="h-3 w-3 text-[var(--ink-faint)]" />
                      <span className="text-xs font-semibold text-[var(--ink-primary)]">
                        {reply.authorName}
                      </span>
                      {reply.isWorkAuthor && (
                        <span className="rounded bg-[var(--ink-primary)] px-1 py-0.2 font-mono text-[8px] font-medium text-[var(--accent-contrast)] uppercase">
                          Author
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-[var(--ink-faint)]">
                        • {reply.timestamp}
                      </span>
                    </div>
                    <p className="mt-1 pl-5 text-xs leading-relaxed text-[var(--ink-muted)]">
                      {reply.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
