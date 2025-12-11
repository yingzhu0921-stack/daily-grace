import React from 'react';
import { Header } from '@/components/Header';

const Help: React.FC = () => {
  return (
    <div className="min-h-screen bg-[rgba(249,248,246,1)]">
      <Header />
      <main className="max-w-5xl mx-auto p-4">
        <h1 className="text-2xl font-bold text-[#2E2E2E] mb-4">도움말·피드백</h1>
        <div className="bg-white rounded-2xl p-8 text-center text-[#7E7C78]">
          준비 중입니다
        </div>
      </main>
    </div>
  );
};

export default Help;
