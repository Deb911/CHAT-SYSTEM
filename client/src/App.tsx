import { useEffect, useState, useRef } from 'react';
import { Send, MoreVertical, Search, Paperclip, Smile, Mic, CheckCheck, LogOut } from 'lucide-react';
import { insforge as insforgeClient } from './insforge';

const insforge = insforgeClient as any;

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [usersOnline, setUsersOnline] = useState<Record<string, any>>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    insforge.auth.getSession().then(({ data: { session } }: any) => {
      setSession(session);
    });

    const { data: { subscription } } = insforge.auth.onAuthStateChange((_event: string, session: unknown) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;

    const fetchMessages = async () => {
      const { data, error } = await insforge
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);
      
      if (!error && data) {
        setMessages(data);
        scrollToBottom();
      }
    };

    fetchMessages();

    const messageSub = insforge
      .channel('chat_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
        setMessages((prev) => [...prev, payload.new]);
        scrollToBottom();
      })
      .subscribe();

    const presenceChannel = insforge.channel('online_users');
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const online: Record<string, any> = {};
        for (const id in state) {
          online[state[id][0].user_id] = state[id][0];
        }
        setUsersOnline(online);
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: session.user.id,
            email: session.user.email,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      messageSub.unsubscribe();
      presenceChannel.unsubscribe();
    };
  }, [session]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    let res;
    if (isLogin) {
      res = await insforge.auth.signInWithPassword({ email, password });
    } else {
      res = await insforge.auth.signUp({ email, password });
    }
    
    if (res.error) {
      setError(res.error.message);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    insforge.auth.signOut();
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !session?.user) return;

    const content = newMessage;
    setNewMessage('');
    
    await insforge.from('messages').insert([
      { 
        content, 
        user_id: session.user.id,
        user_email: session.user.email 
      }
    ]);
  };

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-[#111b21] text-slate-100 font-sans">
        <div className="w-full max-w-md p-8 bg-[#202c33] rounded-sm shadow-xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-normal text-white flex items-center justify-center gap-3">
              <div className="w-8 h-8 bg-[#00a884] rounded-full flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white rounded-full"></div>
              </div>
              WhatsApp Web
            </h2>
            <p className="mt-2 text-[#8696a0] text-sm">Sign in to continue</p>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-4">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-[#2a3942] rounded-md focus:bg-[#202c33] focus:ring-1 focus:ring-[#00a884] outline-none text-[#d1d7db] placeholder-[#8696a0] border-none"
                  placeholder="Email address"
                  required
                />
              </div>
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#2a3942] rounded-md focus:bg-[#202c33] focus:ring-1 focus:ring-[#00a884] outline-none text-[#d1d7db] placeholder-[#8696a0] border-none"
                  placeholder="Password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-[#ff5b5b]/10 text-[#ff5b5b] text-sm rounded-md">
                {error}
              </div>
            )}

            <button
               type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-md font-medium text-[#111b21] bg-[#00a884] hover:bg-[#00c89c] disabled:opacity-50 transition-colors"
            >
               {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#8696a0]">
            <button onClick={() => setIsLogin(!isLogin)} className="hover:text-[#d1d7db] hover:underline">
              {isLogin ? 'Need an account? Sign up' : 'Have an account? Log in'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0c1317] p-0 md:p-4 font-sans text-[#e9edef]">
      <div className="flex w-full max-w-[1600px] h-full mx-auto bg-[#111b21] rounded-none md:rounded-sm shadow-xl overflow-hidden">
        
        {/* Left Sidebar */}
        <div className="w-full md:w-[30%] min-w-[300px] max-w-[400px] flex md:flex flex-col border-r border-[#222d34]">
          {/* Header */}
          <div className="h-16 flex items-center justify-between px-4 bg-[#202c33]">
            <div className="w-10 h-10 rounded-full bg-[#6b7c85] text-white flex items-center justify-center font-bold overflow-hidden cursor-pointer" title={session.user.email}>
               {session.user.email?.[0].toUpperCase()}
            </div>
            <div className="flex gap-4 text-[#aebac1]">
              <button 
                onClick={handleLogout}
                className="hover:text-[#d1d7db]" title="Log out">
                <LogOut size={20} />
              </button>
              <button className="hover:text-[#d1d7db]">
                 <MoreVertical size={20} />
              </button>
            </div>
          </div>
          
          {/* Search */}
          <div className="p-2 border-b border-[#222d34]">
            <div className="relative flex items-center bg-[#202c33] rounded-lg px-3 py-1.5 h-9">
              <Search size={18} className="text-[#8696a0]" />
              <input 
                type="text" 
                placeholder="Search or start new chat" 
                className="w-full bg-transparent outline-none ml-3 text-sm placeholder-[#8696a0] text-[#d1d7db]"
              />
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto bg-[#111b21] custom-scrollbar">
             {/* Global Chat Group */}
             <div className="flex items-center px-3 py-3 hover:bg-[#202c33] cursor-pointer" style={{ backgroundColor: '#2a3942' }}>
                <div className="w-12 h-12 rounded-full bg-[#00a884] flex-shrink-0 flex items-center justify-center text-white mr-3">
                   <div className="flex flex-wrap items-center justify-center">
                     <span className="font-bold text-xl">🌎</span>
                   </div>
                </div>
                <div className="flex-1 border-b border-transparent pb-1 min-w-0">
                   <div className="flex justify-between items-center mb-1">
                     <h3 className="text-[#e9edef] text-[17px] font-normal truncate">Global Space </h3>
                     <span className="text-[#00a884] text-xs">Now</span>
                   </div>
                   <div className="flex gap-1 text-[#8696a0] text-sm items-center truncate">
                     <span className="text-[#00a884] font-medium whitespace-nowrap">{Object.keys(usersOnline).length} online</span>
                     <span className="truncate">~ Join the global conversation</span>
                   </div>
                </div>
             </div>
             
             {/* Read-only Online Users list simulated as read-only contacts */}
             <div className="px-5 py-4 text-[#00a884] text-[11px] font-medium uppercase tracking-wider">
               Online Contacts
             </div>
             {Object.values(usersOnline).map((u: any) => (
               <div key={u.user_id} className="flex items-center px-3 py-3 hover:bg-[#202c33] cursor-pointer">
                  <div className="w-12 h-12 rounded-full bg-[#6b7c85] flex-shrink-0 flex items-center justify-center text-white mr-3 overflow-hidden">
                     <span className="text-xl uppercase">{u.email?.[0]}</span>
                  </div>
                  <div className="flex-1 border-b border-[#222d34] pb-2 min-w-0">
                     <div className="flex justify-between items-center mb-1">
                       <h3 className="text-[#e9edef] text-[17px] font-normal truncate">
                         {u.email === session.user.email ? 'You (Contact)' : u.email.split('@')[0]}
                       </h3>
                       <span className="text-[#00a884] text-xs whitespace-nowrap px-1">Online</span>
                     </div>
                     <span className="text-[#8696a0] text-sm truncate block">{u.email}</span>
                  </div>
               </div>
             ))}
          </div>
        </div>

        {/* Right Chat Area */}
        <div className="flex-1 hidden md:flex flex-col relative bg-[#0b141a]">
          {/* WhatsApp Chat Background Wallpaper */}
          <div className="absolute inset-0 z-0 opacity-20 bg-[url('https://static.whatsapp.net/rsrc.php/v3/yl/r/fs0_2LwN_xQ.png')] bg-repeat" style={{ backgroundSize: '400px' }}></div>
          
          {/* Chat Header */}
          <div className="h-16 flex items-center px-4 bg-[#202c33] z-10 w-full justify-between shadow-sm">
             <div className="flex items-center gap-4 cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center text-white shadow-sm">
                   <span className="font-bold text-xl">🌎</span>
                </div>
                <div className="flex flex-col justify-center">
                   <h2 className="text-[#e9edef] leading-tight text-base font-normal">Global Space</h2>
                   <span className="text-[13px] text-[#8696a0]">{Object.keys(usersOnline).map(id => usersOnline[id].email.split('@')[0]).join(', ')}</span>
                </div>
             </div>
             <div className="flex gap-5 text-[#aebac1]">
                <Search size={20} className="cursor-pointer" />
                <MoreVertical size={20} className="cursor-pointer" />
             </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-[5%] py-[2%] z-10 custom-scrollbar relative">
             {messages.length === 0 ? (
               <div className="flex items-center justify-center h-full">
                 <div className="bg-[#ffeecd]/90 dark:bg-[#182229] rounded-lg px-4 py-2 text-[#465057] dark:text-[#8696a0] text-[12.5px] text-center max-w-md shadow-sm">
                   Messages are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
                 </div>
               </div>
             ) : (
               <div className="space-y-[3px]">
                 <div className="flex justify-center mb-4">
                    <div className="bg-[#182229] text-[#8696a0] text-[12.5px] px-3 py-1 rounded-lg shadow-sm">
                      TODAY
                    </div>
                 </div>
                 {messages.map((msg: any, i: number) => {
                   const isMe = msg.user_id === session.user.id;
                   const lastMsg = i > 0 ? messages[i - 1] : null;
                   const isFirstInGroup = !lastMsg || lastMsg.user_id !== msg.user_id;

                   return (
                     <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} w-full`}>
                       <div className={`relative max-w-[65%] px-2 pt-1.5 pb-2 shadow-sm rounded-md ${
                         isMe 
                           ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none' 
                           : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
                       } ${!isFirstInGroup && (isMe ? 'rounded-tr-md mt-[2px]' : 'rounded-tl-md mt-[2px]')}`}>
                         
                         {/* Tail SVG */}
                         {isFirstInGroup && (
                            <div className={`absolute top-0 w-2 h-3 overflow-hidden ${isMe ? '-right-[8px] text-[#005c4b]' : '-left-[8px] text-[#202c33]'}`}>
                              <svg viewBox="0 0 8 13" width="8" height="13" fill="currentColor">
                                {isMe 
                                  ? <path d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z"></path>
                                  : <path d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z" transform="scale(-1, 1) translate(-8, 0)"></path>
                                }
                              </svg>
                            </div>
                         )}

                         {/* Sender Name */}
                         {!isMe && isFirstInGroup && (
                           <div className="text-[13px] font-bold text-[#53bdeb] mb-0.5 ml-1">
                             {msg.user_email?.split('@')[0]}
                           </div>
                         )}
                         
                         {/* Content */}
                         <div className="text-[14.2px] leading-5 ml-1 mr-2 inline-block break-words max-w-full font-normal">
                            {msg.content}
                            <span className="inline-block w-14 opacity-0 border border-transparent">.</span> {/* spacing hack for time inline */}
                         </div>
                         
                         {/* Time and Read Receipt */}
                         <div className={`absolute bottom-1 right-2 flex items-center h-[15px]`}>
                            <span className="text-[11px] text-[#8696a0] mt-[2px]">
                              {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                            {isMe && <CheckCheck size={15} className="ml-1 text-[#53bdeb] mt-[1px]" />}
                         </div>
                       </div>
                     </div>
                   );
                 })}
               </div>
             )}
             <div ref={messagesEndRef} className="h-6" />
          </div>

          {/* Input Area */}
          <div className="min-h-[62px] px-4 py-[10px] bg-[#202c33] z-10 flex items-center gap-4 w-full">
             <div className="flex gap-2 text-[#8696a0]">
                <button className="p-2 hover:bg-[#2a3942] rounded-full transition-colors"><Smile size={24} /></button>
                <button className="p-2 hover:bg-[#2a3942] rounded-full transition-colors"><Paperclip size={24} className="rotate-45" /></button>
             </div>
             <form onSubmit={sendMessage} className="flex-1 bg-[#2a3942] rounded-lg">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message"
                  className="w-full bg-transparent text-[#d1d7db] text-[15px] px-4 py-[9px] outline-none border-none focus:placeholder-[#8696a0] font-normal"
                  autoComplete="off"
                />
             </form>
             <div className="flex text-[#8696a0]">
                {newMessage.trim() ? (
                  <button onClick={sendMessage} className="p-2 hover:bg-[#2a3942] rounded-full text-[#8696a0] transition-colors">
                     <Send size={24} />
                  </button>
                ) : (
                  <button className="p-2 hover:bg-[#2a3942] rounded-full transition-colors">
                     <Mic size={24} />
                  </button>
                )}
             </div>
          </div>
        </div>
      </div>

      <style>{`
        body { margin: 0; background-color: #111b21; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.16); border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.25); }
      `}</style>
    </div>
  );
}
