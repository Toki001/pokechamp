import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

interface Comment {
  id: string;
  team_id: string;
  author_name: string;
  content: string;
  created_at: string;
  parent_id: string | null;
}

interface TeamDiscussionProps {
  teamId: string;
}

export default function TeamDiscussion({ teamId }: TeamDiscussionProps) {
  const { user, setAuthModalOpen } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);

  useEffect(() => {
    const fetchComments = async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setComments(data as Comment[]);
      }
    };

    fetchComments();

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
    if (!newComment.trim() || !user) return;

    setIsPosting(true);
    
    const payload: any = {
      team_id: teamId,
      author_name: authorName.trim() || user.email?.split('@')[0] || 'Trainer',
      content: newComment.trim(),
      user_id: user.id
    };
    
    if (replyTo) {
      payload.parent_id = replyTo;
    }

    const { error } = await supabase.from('comments').insert([payload]);

    setIsPosting(false);
    if (!error) {
      setNewComment('');
      setReplyTo(null);
    } else {
      console.error("Failed to post comment:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const topLevelComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId);

  return (
    <div className="w-full bg-[#13141c] border border-[#2e3040] rounded-xl p-8 shadow-2xl mt-8">
      <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
        Team Discussion
        <span className="bg-sky-500/20 text-sky-400 text-xs px-3 py-1 rounded-full border border-sky-500/30">
          {comments.length} Comments
        </span>
      </h3>

      <div className="space-y-6 mb-8 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {topLevelComments.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-[#2e3040] rounded-xl text-slate-500 font-medium">
            No critiques yet. Be the first to review this team!
          </div>
        ) : (
          topLevelComments.map(comment => (
            <div key={comment.id} className="flex flex-col gap-3">
              <div className="bg-[#1a1b26] border border-[#2e3040] rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-sky-400">{comment.author_name}</span>
                  <span className="text-xs text-slate-500 font-mono">{formatDate(comment.created_at)}</span>
                </div>
                <p className="text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">{comment.content}</p>
                
                {/* Reply Button Aligned Right with Icon */}
                {user && (
                  <div className="flex justify-end mt-4 pt-3 border-t border-[#2e3040]/50">
                    <button 
                      onClick={() => setReplyTo(comment.id)} 
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 text-sky-400 hover:bg-sky-500 hover:text-white rounded-lg text-xs font-bold transition-all border border-sky-500/30 shadow-sm"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                      Reply
                    </button>
                  </div>
                )}
              </div>

              {getReplies(comment.id).length > 0 && (
                <div className="flex flex-col gap-3 pl-8 border-l-2 border-[#2e3040] ml-4">
                  {getReplies(comment.id).map(reply => (
                    <div key={reply.id} className="bg-[#13141c] border border-[#2e3040] rounded-xl p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-emerald-400">{reply.author_name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{formatDate(reply.created_at)}</span>
                      </div>
                      <p className="text-slate-400 whitespace-pre-wrap text-sm leading-relaxed">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="relative pr-2">
        {!user ? (
          <div className="bg-[#1a1b26] border border-[#2e3040] rounded-xl p-8 text-center flex flex-col items-center justify-center">
            <p className="text-slate-300 font-bold mb-4">You must be logged in to join the discussion.</p>
            <button 
              onClick={() => setAuthModalOpen(true)}
              className="px-8 py-3 bg-sky-500 text-white font-black rounded-xl hover:bg-sky-400 transition-colors shadow-lg uppercase tracking-widest text-sm"
            >
              Sign In / Sign Up
            </button>
          </div>
        ) : (
          <>
            {replyTo && (
              <div className="bg-sky-500/10 text-sky-400 text-xs px-4 py-3 rounded-t-xl flex justify-between items-center border border-b-0 border-sky-500/30 w-full backdrop-blur-md mb-[-1px] relative z-10">
                <span className="font-bold flex items-center gap-2">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                  Replying to {comments.find(c => c.id === replyTo)?.author_name}
                </span>
                <button onClick={() => setReplyTo(null)} className="hover:text-white font-black">✕</button>
              </div>
            )}
            
            <form onSubmit={handlePostComment} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Display Name (Defaults to Email)"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className={`w-full bg-[#1a1b26] border border-[#2e3040] ${replyTo ? 'rounded-b-xl rounded-t-none' : 'rounded-xl'} p-4 text-white text-sm outline-none focus:border-sky-500 transition-colors shadow-sm`}
              />
              <textarea
                placeholder={replyTo ? "Write your reply..." : "Suggest EV spreads, point out weaknesses, or ask questions about this build..."}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                className="w-full bg-[#1a1b26] border border-[#2e3040] rounded-xl p-4 text-white text-sm outline-none focus:border-sky-500 resize-none transition-colors shadow-sm"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isPosting || !newComment.trim()}
                  className="px-6 py-3 bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm rounded-xl shadow-[0_0_15px_rgba(14,165,233,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPosting ? 'Posting...' : replyTo ? 'Post Reply' : 'Post Critique'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}