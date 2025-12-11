import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Bell, User, Info, ChevronRight, Download, FileJson, FileSpreadsheet, FileText, X } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { downloadInFormat, getBackupStats, type ExportFormat } from '@/utils/dataExport';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const handleExportData = async (format: ExportFormat) => {
    if (isExporting) return;

    setIsExporting(true);
    setShowExportDialog(false);

    try {
      // 백업 통계 가져오기
      const stats = await getBackupStats();

      const formatNames = {
        json: 'JSON',
        excel: 'Excel',
        csv: 'CSV',
        text: '텍스트',
      };

      toast({
        title: "데이터 백업 중...",
        description: `총 ${stats.totalRecords}개의 기록을 ${formatNames[format]} 형식으로 백업합니다.`,
      });

      // 다운로드 실행
      await downloadInFormat(format);

      toast({
        title: "백업 완료",
        description: `모든 데이터가 ${formatNames[format]} 파일로 다운로드되었습니다.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "백업 실패",
        description: "데이터 백업 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const menuItems = [
    {
      icon: Bell,
      title: '알림 관리',
      description: '카테고리별 알림 시간 설정',
      bgColor: 'bg-[#7DB87D]/10',
      iconColor: 'text-[#7DB87D]',
      onClick: () => navigate('/settings/notifications'),
    },
    {
      icon: Download,
      title: '데이터 백업',
      description: '내 기록을 파일로 다운로드',
      bgColor: 'bg-[#7DB8E8]/10',
      iconColor: 'text-[#7DB8E8]',
      onClick: () => setShowExportDialog(true),
    },
    {
      icon: User,
      title: '계정 관리',
      description: '프로필 및 로그아웃',
      bgColor: 'bg-[#A57DB8]/10',
      iconColor: 'text-[#A57DB8]',
      onClick: () => navigate('/settings/account'),
    },
    {
      icon: Info,
      title: '앱 정보',
      description: '버전 정보 및 개인정보처리방침',
      bgColor: 'bg-[#E8C87D]/10',
      iconColor: 'text-[#E8C87D]',
      onClick: () => {}, // TODO: 앱 정보 페이지
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-[#FAF9F7] border-b border-[#F0EFED]">
        <button
          onClick={() => navigate('/')}
          className="p-2 -ml-2"
        >
          <ChevronLeft className="w-6 h-6 text-[#2E2E2E]" />
        </button>
        
        <h1 className="text-base font-medium text-[#2E2E2E] absolute left-1/2 transform -translate-x-1/2">
          설정
        </h1>

        <div className="w-10" />
      </header>

      <main className="max-w-5xl mx-auto px-5 py-6">
        {/* 설정 메뉴 리스트 */}
        <div className="space-y-3">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              className="w-full bg-white rounded-2xl p-5 flex items-center gap-4 hover:bg-[#F7F6F4] transition-colors"
            >
              <div className={`w-12 h-12 rounded-xl ${item.bgColor} flex items-center justify-center shrink-0`}>
                <item.icon className={`w-6 h-6 ${item.iconColor}`} strokeWidth={1.75} />
              </div>
              <div className="flex-1 text-left">
                <h2 className="text-[16px] font-semibold text-[#2E2E2E] mb-0.5">
                  {item.title}
                </h2>
                <p className="text-[13px] text-[#7E7C78]">
                  {item.description}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-[#BDBDBD] shrink-0" strokeWidth={1.5} />
            </button>
          ))}
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* 형식 선택 다이얼로그 */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-[420px] rounded-3xl p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-[#F0EFED] relative">
            <DialogTitle className="text-[18px] font-semibold text-[#2E2E2E]">
              내보내기 형식 선택
            </DialogTitle>
            <DialogDescription className="sr-only">
              백업 파일 형식을 선택하세요
            </DialogDescription>
            <button
              onClick={() => setShowExportDialog(false)}
              className="absolute right-6 top-6 p-1 hover:bg-[#F3F2F1] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[#7E7C78]" />
            </button>
          </DialogHeader>

          <div className="px-6 py-5 space-y-3">
            {/* Excel */}
            <button
              onClick={() => handleExportData('excel')}
              disabled={isExporting}
              className="w-full p-4 rounded-2xl border-2 border-[#E8E7E5] bg-white hover:bg-[#F9F8F6] hover:border-[#7DB8E8] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#1D6F42]/10 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-6 h-6 text-[#1D6F42]" strokeWidth={1.75} />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-[15px] font-semibold text-[#2E2E2E] mb-0.5">
                    Excel (.xlsx)
                  </h3>
                  <p className="text-[13px] text-[#7E7C78]">
                    카테고리별 시트로 정리된 엑셀 파일
                  </p>
                </div>
              </div>
            </button>

            {/* CSV */}
            <button
              onClick={() => handleExportData('csv')}
              disabled={isExporting}
              className="w-full p-4 rounded-2xl border-2 border-[#E8E7E5] bg-white hover:bg-[#F9F8F6] hover:border-[#7DB8E8] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#7DB8E8]/10 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-6 h-6 text-[#7DB8E8]" strokeWidth={1.75} />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-[15px] font-semibold text-[#2E2E2E] mb-0.5">
                    CSV (.csv)
                  </h3>
                  <p className="text-[13px] text-[#7E7C78]">
                    스프레드시트에서 열 수 있는 CSV 파일
                  </p>
                </div>
              </div>
            </button>

            {/* 텍스트 */}
            <button
              onClick={() => handleExportData('text')}
              disabled={isExporting}
              className="w-full p-4 rounded-2xl border-2 border-[#E8E7E5] bg-white hover:bg-[#F9F8F6] hover:border-[#7DB8E8] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#A57DB8]/10 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-[#A57DB8]" strokeWidth={1.75} />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-[15px] font-semibold text-[#2E2E2E] mb-0.5">
                    텍스트 (.txt)
                  </h3>
                  <p className="text-[13px] text-[#7E7C78]">
                    읽기 편한 텍스트 문서
                  </p>
                </div>
              </div>
            </button>

            {/* JSON */}
            <button
              onClick={() => handleExportData('json')}
              disabled={isExporting}
              className="w-full p-4 rounded-2xl border-2 border-[#E8E7E5] bg-white hover:bg-[#F9F8F6] hover:border-[#7DB8E8] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#E8C87D]/10 flex items-center justify-center shrink-0">
                  <FileJson className="w-6 h-6 text-[#E8C87D]" strokeWidth={1.75} />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-[15px] font-semibold text-[#2E2E2E] mb-0.5">
                    JSON (.json)
                  </h3>
                  <p className="text-[13px] text-[#7E7C78]">
                    개발자용 데이터 형식 (전체 백업)
                  </p>
                </div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
