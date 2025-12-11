import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listAll, listByDate, remove, type Diary } from "@/utils/diaryStorage";
import { ChevronLeft } from 'lucide-react';
import { SwipeableItem } from '@/components/SwipeableItem';
import { toast } from 'sonner';

function ymd(d: Date) { return d.toISOString().split("T")[0]; }
function firstLine(s: string) { return (s || "").split(/\r?\n/)[0] || "제목 없음"; }

export default function DiaryList() {
  const navigate = useNavigate();
  const [selectedDate] = useState(new Date());
  const [tab, setTab] = useState<"today" | "all">("today");
  const [items, setItems] = useState<Diary[]>([]);
  
  const refresh = () => setItems(tab === "today" ? listByDate(ymd(selectedDate)) : listAll());
  
  useEffect(() => { refresh(); }, [tab]);

  const handleDelete = (id: string) => {
    remove(id);
    refresh();
    toast.success('일기가 삭제되었습니다');
  };

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-[#F0EFED]">
        <button 
          onClick={() => navigate("/")} 
          className="p-2 -ml-2"
        >
          <ChevronLeft className="w-6 h-6 text-[#2E2E2E]" />
        </button>
        
        <h1 className="text-base font-medium text-[#2E2E2E] absolute left-1/2 transform -translate-x-1/2">
          일기
        </h1>

        <button 
          onClick={() => navigate("/diary/new")}
          className="h-9 px-5 rounded-full bg-[#DD957D] hover:bg-[#cd856d] text-white text-sm font-medium transition-colors"
        >
          새로 작성
        </button>
      </header>

      {/* 탭 */}
      <div className="px-5 py-3">
        <div className="inline-flex rounded-full border border-[#E8E7E5] bg-white p-0.5">
          <button 
            onClick={() => setTab("today")}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              tab === "today" ? "bg-[#DD957D] text-white" : "text-[#6B6B6B]"
            }`}
          >
            오늘
          </button>
          <button 
            onClick={() => setTab("all")}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              tab === "all" ? "bg-[#DD957D] text-white" : "text-[#6B6B6B]"
            }`}
          >
            전체
          </button>
        </div>
      </div>

      {/* 리스트 */}
      <div className="px-5 pb-24 pt-3">
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 px-8">
            <p className="text-[15px] text-[#8B8B8B] text-center leading-relaxed">
              아직 기록이 없어요. '새로 작성'을 눌러 첫<br />
              일기를 남겨보세요.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {items.map(d => (
            <SwipeableItem
              key={d.id}
              onEdit={() => navigate(`/diary/${d.id}`)}
              onDelete={() => handleDelete(d.id)}
              editColor="#DD957D"
              deleteColor="#E06B6B"
            >
              <button 
                onClick={() => navigate(`/diary/${d.id}`)}
                className="w-full text-left rounded-2xl bg-white border border-[#F0EFED] shadow-sm px-4 py-4 hover:shadow-md transition-all"
              >
                <div className="text-[13px] text-[#8F8C86] mb-1">
                  {new Date(d.createdAt).toLocaleDateString("ko-KR")}
                </div>
                <div className="text-[16px] font-medium line-clamp-1">
                  {firstLine(d.content)}
                </div>
                <div className="text-[13px] text-[#8A8A8A] line-clamp-1 mt-0.5">
                  {d.content.replace(/\r?\n/g, " ").slice(0, 80)}
                </div>
              </button>
            </SwipeableItem>
          ))}
        </div>
      </div>
    </div>
  );
}
