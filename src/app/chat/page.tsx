import { getTranslations } from 'next-intl/server';

export default async function ChatPage() {
  const t = await getTranslations('chat');

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-page-enter flex flex-col" style={{ minHeight: 'calc(100vh - 120px)' }}>
      <h1 className="text-2xl font-bold text-white mb-6">{t('title')}</h1>

      {/* Placeholder message area */}
      <div className="glass-card flex-1 flex flex-col p-4 gap-4 min-h-[400px]">
        {/* Skeleton messages */}
        <div className="flex gap-3 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-[#8B5CF6]/30 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/4 bg-white/10 rounded" />
            <div className="h-3 w-1/2 bg-white/10 rounded" />
          </div>
        </div>
        <div className="flex gap-3 justify-end animate-pulse">
          <div className="flex-1 space-y-2 flex flex-col items-end">
            <div className="h-3 w-2/3 bg-[#8B5CF6]/20 rounded" />
          </div>
          <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0" />
        </div>
        <div className="flex gap-3 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-[#8B5CF6]/30 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-full bg-white/10 rounded" />
            <div className="h-3 w-4/5 bg-white/10 rounded" />
            <div className="h-3 w-1/3 bg-white/10 rounded" />
          </div>
        </div>

        {/* Input area at bottom */}
        <div className="mt-auto pt-4 border-t border-white/10">
          <div className="flex gap-2 animate-pulse">
            <div className="flex-1 h-10 bg-white/5 rounded-lg border border-white/10" />
            <div className="w-16 h-10 bg-[#8B5CF6]/30 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
