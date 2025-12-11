import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { get, update } from '@/utils/prayerStorage';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AnsweredDetailInput } from '@/components/AnsweredDetailInput';

export default function PrayerEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [answered, setAnswered] = useState(false);
  const [answeredDetail, setAnsweredDetail] = useState('');

  useEffect(() => {
    if (!id) return;
    const found = get(id);
    if (!found) {
      toast.error('기도제목을 찾을 수 없습니다');
      navigate('/prayer');
      return;
    }
    setContent(found.content);

    // URL 파라미터에 showAnswered=true가 있으면 자동으로 체크
    const showAnswered = searchParams.get('showAnswered') === 'true';
    console.log('showAnswered param:', showAnswered);
    console.log('found.answered:', found.answered);

    // showAnswered가 true이거나 기존에 answered가 true면 체크
    const shouldBeAnswered = showAnswered || found.answered || false;
    console.log('Setting answered to:', shouldBeAnswered);
    setAnswered(shouldBeAnswered);
    setAnsweredDetail((found as any).answeredDetail || '')
  }, [id, navigate, searchParams]);

  const canSave = content.trim().length > 0;

  const handleSave = async () => {
    if (!id) return;
    const contentTrimmed = content.trim();

    await update(id, {
      title: contentTrimmed,
      content: contentTrimmed,
      answered,
      answeredAt: answered ? (get(id)?.answeredAt || new Date().toISOString()) : null,
      answeredDetail: answered ? answeredDetail : undefined
    });

    toast.success('클라우드에 백업되었습니다.');
    navigate(`/prayer/${id}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      <header className="flex items-center justify-between px-5 py-4 border-b border-[#F0EFED]">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2"
        >
          <ChevronLeft className="w-6 h-6 text-[#2E2E2E]" />
        </button>
        
        <h1 className="text-base font-medium text-[#2E2E2E] absolute left-1/2 transform -translate-x-1/2">기도 작성</h1>
        
        <button
          onClick={handleSave}
          disabled={!canSave}
          className={`h-9 px-5 rounded-full text-sm font-medium transition-colors ${
            canSave 
              ? 'bg-[#A57DB8] hover:bg-[#956daa] text-white' 
              : 'bg-[#E8E7E5] text-[#ACACAC] cursor-not-allowed'
          }`}
        >
          저장
        </button>
      </header>

      <div className="px-5 py-6 pb-24">
        <div className="mb-8">
          <div className="mb-2 text-sm text-[#9B9B9B]">기도 제목(내용)</div>
          <Textarea
            autoFocus
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="기도 제목(내용)을 적어보세요&#10;예) 아버지의 건강 회복을 위해"
            rows={12}
            className="w-full bg-transparent text-[16px] leading-7 outline-none resize-none placeholder-[#B6B6B6] border-none p-0 focus-visible:ring-0"
          />
          <div className="mt-2 text-xs text-[#8A8A8A]">
            줄바꿈으로 길게 적어도 돼요. 저장하면 리스트에 한 줄 요약으로 보여줘요.
          </div>
        </div>

        <AnsweredDetailInput
          answered={answered}
          answeredDetail={answeredDetail}
          onAnsweredChange={setAnswered}
          onDetailChange={setAnsweredDetail}
          label="응답"
          checkboxLabel="응답됨"
          detailLabel="응답 내용 / 간증"
          detailPlaceholder="어떻게 응답되었는지, 은혜받은 내용을 기록해보세요"
          categoryName="기도"
          categoryColor="#A57DB8"
        />
      </div>
    </div>
  );
}
