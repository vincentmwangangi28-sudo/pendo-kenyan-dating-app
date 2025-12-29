import React, { useState } from 'react';
import { ChatSession } from '../types';
import { Users, User, Plus, PlusCircle, ChevronRight, MessageSquare, Clock } from 'lucide-react';

interface ChatListProps {
  chats: ChatSession[];
  onSelectChat: (matchId: string) => void;
  onCreateGroup: () => void;
}

export const ChatList: React.FC<ChatListProps> = ({ chats, onSelectChat, onCreateGroup }) => {
  const [activeTab, setActiveTab] = useState<'direct' | 'groups'>('direct');

  const directChats = chats.filter(c => !c.isGroup);
  const groupChats = chats.filter(c => c.isGroup);

  const displayChats = activeTab === 'direct' ? directChats : groupChats;

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <div className="px-4 pb-2 pt-2 bg-white sticky top-0 z-10 shadow-sm border-b border-slate-100">
        <div className="flex items-center justify-between mb-4 mt-2">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Connections</h2>
          <button 
            onClick={onCreateGroup}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-full text-xs font-bold hover:bg-rose-100 transition-colors shadow-sm active:scale-95"
          >
            <PlusCircle size={16} />
            <span>New Group</span>
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-2 relative">
          <button 
            onClick={() => setActiveTab('direct')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 ${
              activeTab === 'direct' 
                ? 'bg-white text-slate-900 shadow-md transform scale-100 ring-1 ring-black/5' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <User size={16} className={activeTab === 'direct' ? 'text-rose-500' : ''} /> Direct
          </button>
          <button 
             onClick={() => setActiveTab('groups')}
             className={`flex-1 py-2.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 ${
              activeTab === 'groups' 
                ? 'bg-white text-rose-600 shadow-md transform scale-100 ring-1 ring-black/5' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <Users size={16} className={activeTab === 'groups' ? 'text-rose-500' : ''} /> Groups
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-20 no-scrollbar">
        {activeTab === 'groups' && (
          <button 
            onClick={onCreateGroup}
            className="w-full py-4 border-2 border-dashed border-rose-200 rounded-2xl flex items-center justify-center gap-2 text-rose-600 font-semibold hover:bg-rose-50 transition-colors active:scale-95 group mb-2"
          >
            <div className="bg-rose-100 p-1.5 rounded-full group-hover:scale-110 transition-transform duration-300">
                <Plus size={18} /> 
            </div>
            Create New Group
          </button>
        )}

        {displayChats.length === 0 ? (
          <div className="p-8 text-center text-slate-500 mt-10 flex flex-col items-center animate-fade-in">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
                 {activeTab === 'direct' ? <MessageSquare size={32} className="text-slate-300" /> : <Users size={32} className="text-slate-300" />}
            </div>
            <p className="font-semibold text-lg text-slate-600 mb-1">{activeTab === 'direct' ? 'No chats yet' : 'No groups yet'}</p>
            <p className="text-sm text-slate-400 max-w-[200px]">{activeTab === 'direct' ? 'Start matching to chat with new people!' : 'Join or create a group to start connecting.'}</p>
          </div>
        ) : (
          displayChats.map((chat, index) => (
            <div 
              key={chat.matchId}
              onClick={() => onSelectChat(chat.matchId)}
              style={{ animationDelay: `${index * 50}ms` }}
              className={`group flex items-center gap-3 p-3.5 rounded-2xl shadow-sm border cursor-pointer 
                transition-all duration-300 ease-out relative overflow-hidden animate-slide-up
                ${chat.unreadCount > 0 
                    ? 'bg-gradient-to-r from-rose-50 via-white to-white border-rose-100 hover:border-rose-200 hover:shadow-lg' 
                    : 'bg-white border-slate-100 hover:border-rose-100 hover:shadow-md'
                }
                hover:scale-[1.02]
              `}
            >
              {/* Highlight bar for unread - Enhanced */}
              {chat.unreadCount > 0 && (
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500 shadow-[0_0_12px_rgba(225,29,72,0.5)]" />
              )}

              <div className="relative flex-shrink-0 pl-1.5">
                <div className={`relative overflow-hidden rounded-2xl w-14 h-14 shadow-sm group-hover:shadow-md transition-all duration-300 ${chat.unreadCount > 0 ? 'ring-2 ring-rose-500 ring-offset-2' : ''}`}>
                    <img 
                    src={chat.matchPhoto} 
                    alt={chat.matchName} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                    />
                </div>
                {chat.isGroup && (
                   <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow-sm z-10">
                     <div className="bg-rose-100 p-1 rounded-full">
                        <Users size={10} className="text-rose-600" />
                     </div>
                   </div>
                )}
              </div>

              <div className="flex-1 min-w-0 py-0.5">
                <div className="flex justify-between items-center mb-0.5">
                  <h3 className={`font-bold truncate text-base transition-colors duration-300 ${chat.unreadCount > 0 ? 'text-slate-900' : 'text-slate-700 group-hover:text-rose-600'}`}>{chat.matchName}</h3>
                  {chat.messages.length > 0 && (
                    <span className={`text-[10px] font-medium flex items-center gap-0.5 ${chat.unreadCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {chat.unreadCount === 0 && <Clock size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                      {new Date(chat.messages[chat.messages.length - 1].timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  )}
                </div>
                
                <div className="flex justify-between items-center">
                    <p className={`text-sm truncate pr-2 leading-relaxed transition-colors ${chat.unreadCount > 0 ? 'font-bold text-slate-800' : 'text-slate-500 group-hover:text-slate-600'}`}>
                    {chat.messages.length > 0 ? (
                        <span>
                            {chat.isGroup && chat.messages[chat.messages.length - 1].senderName && (
                            <span className="text-slate-800 font-medium mr-1">
                                {chat.messages[chat.messages.length - 1].senderName}:
                            </span>
                            )}
                            {chat.messages[chat.messages.length - 1].text}
                        </span>
                    ) : (
                        <span className="italic text-slate-400 text-xs">Start the conversation...</span>
                    )}
                    </p>
                    
                    {/* Unread Badge - Enhanced */}
                    {chat.unreadCount > 0 ? (
                        <div className="flex-shrink-0 w-6 h-6 bg-rose-600 rounded-full flex items-center justify-center text-xs text-white font-bold shadow-lg shadow-rose-200 animate-pulse">
                        {chat.unreadCount}
                        </div>
                    ) : (
                        <ChevronRight size={18} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0 duration-300" />
                    )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};