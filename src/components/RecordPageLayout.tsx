import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RecordPageLayoutProps {
  title: string;
  children: React.ReactNode;
  onSave?: () => void;
  saveLabel?: string;
  showSaveButton?: boolean;
}

export const RecordPageLayout: React.FC<RecordPageLayoutProps> = ({
  title,
  children,
  onSave,
  saveLabel = '저장',
  showSaveButton = false
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      <div className="max-w-[480px] mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-[#F0EFED]">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2"
          >
            <ChevronLeft className="w-6 h-6 text-[#2E2E2E]" />
          </button>
          
          <h1 className="text-base font-medium text-[#2E2E2E] absolute left-1/2 transform -translate-x-1/2">
            {title}
          </h1>

          {showSaveButton && (
            <Button
              onClick={onSave}
              className="h-9 px-5 rounded-full bg-[#7DB87D] hover:bg-[#6da76d] text-white text-sm font-medium"
            >
              {saveLabel}
            </Button>
          )}
          {!showSaveButton && <div className="w-20" />}
        </header>

        {/* Content */}
        <main className="pb-8">
          {children}
        </main>
      </div>
    </div>
  );
};
