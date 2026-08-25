import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const Legal: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <header className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-[#FAFAF9] border-b border-[#EDEDED]">
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="p-2 -ml-2"
          aria-label="뒤로 가기"
        >
          <ChevronLeft className="w-6 h-6 text-[#2E2E2E]" />
        </button>

        <h1 className="text-base font-medium text-[#2E2E2E] absolute left-1/2 transform -translate-x-1/2">
          약관 및 정책
        </h1>

        <div className="w-10" />
      </header>

      <main className="max-w-3xl mx-auto px-5 py-6 pb-12">
        <section className="mb-8">
          <p className="text-[13px] font-medium text-[#7E7C78] mb-2">
            Daily Grace
          </p>
          <h2 className="text-[28px] font-bold leading-tight text-[#2E2E2E]">
            이용약관 및 콘텐츠 정책
          </h2>
          <p className="mt-3 text-[14px] leading-6 text-[#7E7C78]">
            Daily Grace는 사용자가 직접 입력한 기록과 말씀을 바탕으로 묵상, 기록, 말씀카드 제작을 돕는 서비스입니다.
          </p>
        </section>

        <div className="space-y-4">
          <section className="bg-white rounded-2xl p-5 border border-[#EDEDED]">
            <h3 className="text-[18px] font-semibold text-[#2E2E2E] mb-4">
              1. 이용약관
            </h3>
            <div className="space-y-3 text-[15px] leading-7 text-[#4B4A47]">
              <p>
                사용자가 입력하거나 업로드하는 콘텐츠의 저작권 및 이용 권한은 사용자에게 있습니다.
              </p>
              <p>
                사용자는 본인이 이용 권한을 가진 콘텐츠만 입력하거나 업로드해야 하며, 제3자의 저작권, 초상권, 개인정보 및 기타 권리를 침해하지 않아야 합니다.
              </p>
              <p>
                사용자가 생성, 저장, 공유하는 기록, 이미지, 말씀카드 등 콘텐츠에 대한 책임은 사용자에게 있습니다.
              </p>
            </div>
          </section>

          <section className="bg-white rounded-2xl p-5 border border-[#EDEDED]">
            <h3 className="text-[18px] font-semibold text-[#2E2E2E] mb-4">
              2. 개인정보/콘텐츠 정책
            </h3>
            <div className="space-y-3 text-[15px] leading-7 text-[#4B4A47]">
              <p>
                Daily Grace는 성경 본문을 제공하지 않습니다.
              </p>
              <p>
                앱에서 사용되는 모든 말씀 및 본문 텍스트는 사용자가 직접 입력한 내용입니다.
              </p>
              <p>
                Daily Grace는 사용자가 입력한 텍스트를 기반으로 기록 작성, 카드 제작, 이미지 생성 등의 기능을 제공합니다.
              </p>
              <p>
                사용자는 개인정보나 민감한 정보가 포함된 내용을 입력하거나 업로드할 때 신중하게 확인해야 합니다.
              </p>
            </div>
          </section>

          <section className="bg-white rounded-2xl p-5 border border-[#EDEDED]">
            <h3 className="text-[18px] font-semibold text-[#2E2E2E] mb-4">
              저작권 유의사항
            </h3>
            <div className="space-y-3 text-[15px] leading-7 text-[#4B4A47]">
              <p>
                성경 번역본, 묵상 글, 이미지, 사진 등 제3자 콘텐츠를 사용할 경우 각 권리자의 이용 조건을 확인해야 합니다.
              </p>
              <p>
                생성한 콘텐츠를 외부에 공유하거나 배포하기 전, 해당 콘텐츠를 사용할 권한이 있는지 확인해 주세요.
              </p>
            </div>
          </section>
        </div>

        <p className="mt-6 text-[12px] text-[#9A9894]">
          최종 업데이트: 2026년 8월 18일
        </p>
      </main>
    </div>
  );
};

export default Legal;
