import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { AppDrawer } from './nav/AppDrawer';
import { UserMenu } from './UserMenu';

export const Header: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="bg-[rgba(249,248,246,1)] flex min-h-[72px] w-full items-center justify-between px-4">
        <button 
          onClick={() => setDrawerOpen(true)}
          className="self-stretch min-h-10 w-10 my-auto flex items-center justify-center rounded-lg hover:bg-[rgba(243,242,241,1)] transition"
          aria-label="메뉴"
        >
          <Menu size={24} className="text-[#2E2E2E]" />
        </button>
        <div className="self-stretch flex min-w-60 w-[266px] shrink h-0 flex-1 basis-4 my-auto" />
        <UserMenu />
      </header>
      
      <AppDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
};
