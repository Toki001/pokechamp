import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

interface Comment {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
}

interface TeamDiscussionProps {
  teamId: string;
}

export default function TeamDiscussion({ teamId }: TeamDiscussionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    const fetchComments = async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setComments(data);
      }
    };

    fetchComments();

    // Set up a real-time subscription to instantly show new comments
    const subscription = supabase
      .channel(`public:comments:team_id=eq.${teamId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `team_id=eq.${teamId}` }, (payload) => {
        setComments((current) => [...current, payload.new as Comment]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [teamId]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsPosting(true);
    const { error } = await supabase
      .from('comments')
      .insert([
        {
          team_id: teamId,
          author_name: authorName.trim() || 'Anonymous Trainer',
          content: newComment.trim(),
        }
      ]);

    setIsPosting(false);
    if (!error) {
      setNewComment('');
    } else {
      console.error("Failed to post comment:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="w-full bg-[#13141c] border border-[#2e3040] rounded-xl p-8 shadow-2xl mt-8">
      <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
        Locker Room Discussion
        <span className="bg-sky-500/20 text-sky-400 text-xs px-3 py-1 rounded-full border border-sky-500/30">
          {comments.length} Comments
        </span>
      </h3>

      <div className="space-y-6 mb-8 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {comments.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-[#2e3040] rounded-xl text-slate-500 font-medium">
            No critiques yet. Be the first to review this team!
          </div>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="bg-[#1a1b26] border border-[#2e3040] rounded-lg p-5">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-sky-400">{comment.author_name}</span>
                <span className="text-xs text-slate-500 font-mono">{formatDate(comment.created_at)}</span>
              </div>
              <p className="text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">{comment.content}</p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handlePostComment} className="bg-[#1a1b26] border border-[#2e3040] rounded-xl p-4">
        <input
          type="text"
          placeholder="Your Name (Optional)"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          className="w-full bg-[#13141c] border border-[#2e3040] rounded-lg p-3 text-white text-sm outline-none focus:border-sky-500 mb-3 transition-colors"
        />
        <textarea
          placeholder="Suggest EV spreads, point out weaknesses, or ask questions about this build..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          className="w-full bg-[#13141c] border border-[#2e3040] rounded-lg p-3 text-white text-sm outline-none focus:border-sky-500 mb-3 resize-none transition-colors"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPosting || !newComment.trim()}
            className="px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm rounded-lg shadow-[0_0_15px_rgba(14,165,233,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPosting ? 'Posting...' : 'Post Critique'}
          </button>
        </div>
      </form>
    </div>
  );
}