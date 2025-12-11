import React from "react";
import { Routes, Route } from "react-router-dom";

// 페이지 컴포넌트들을 import 합니다.
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Today from "./pages/Today";
import Calendar from "./pages/Calendar";
import Search from "./pages/Search";
import Records from "./pages/Records";
import MeditationList from "./pages/MeditationList";
import MeditationNew from "./pages/MeditationNew";
import MeditationView from "./pages/MeditationView";
import MeditationEdit from "./pages/MeditationEdit";
import PrayerList from "./pages/PrayerList";
import PrayerNew from "./pages/PrayerNew";
import PrayerView from "./pages/PrayerView";
import PrayerEdit from "./pages/PrayerEdit";
import GratitudeList from "./pages/GratitudeList";
import GratitudeNew from "./pages/GratitudeNew";
import GratitudeView from "./pages/GratitudeView";
import GratitudeEdit from "./pages/GratitudeEdit";
import DiaryList from "./pages/DiaryList";
import DiaryNew from "./pages/DiaryNew";
import DiaryView from "./pages/DiaryView";
import DiaryEdit from "./pages/DiaryEdit";
import CardDesigner from "./pages/CardDesigner";
import CardsVault from "./pages/CardsVault";
import Settings from "./pages/Settings";
import ProfileEdit from "./pages/ProfileEdit";
import NotificationSettings from "./pages/NotificationSettings";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";
import CustomRecordNew from "./pages/CustomRecordNew";
import CustomRecordList from "./pages/CustomRecordList";
import CustomRecordView from "./pages/CustomRecordView";

export const AppRoutes = () => {
  return (
    <Routes>
      {/* 기본 및 인증 라우트 */}
      <Route path="/auth" element={<Auth />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/" element={<Index />} />
      <Route path="/today" element={<Today />} />
      <Route path="/calendar" element={<Calendar />} />
      <Route path="/search" element={<Search />} />
      <Route path="/records" element={<Records />} />

      {/* 묵상(Meditation) 관련 라우트 */}
      <Route path="/meditation" element={<MeditationList />} />
      <Route path="/meditation/new" element={<MeditationNew />} />
      <Route path="/meditation/:id" element={<MeditationView />} />
      <Route path="/meditation/:id/edit" element={<MeditationEdit />} />

      {/* 기도(Prayer) 관련 라우트 */}
      <Route path="/prayer" element={<PrayerList />} />
      <Route path="/prayer/new" element={<PrayerNew />} />
      <Route path="/prayer/:id" element={<PrayerView />} />
      <Route path="/prayer/:id/edit" element={<PrayerEdit />} />

      {/* 감사(Gratitude) 관련 라우트 */}
      <Route path="/gratitude" element={<GratitudeList />} />
      <Route path="/gratitude/new" element={<GratitudeNew />} />
      <Route path="/gratitude/:id" element={<GratitudeView />} />
      <Route path="/gratitude/:id/edit" element={<GratitudeEdit />} />

      {/* 일기(Diary) 관련 라우트 */}
      <Route path="/diary" element={<DiaryList />} />
      <Route path="/diary/new" element={<DiaryNew />} />
      <Route path="/diary/:id" element={<DiaryView />} />
      <Route path="/diary/:id/edit" element={<DiaryEdit />} />

      {/* 카드 관련 라우트 */}
      <Route path="/cards/designer" element={<CardDesigner />} />
      <Route path="/cards/vault" element={<CardsVault />} />

      {/* 커스텀 기록 관련 라우트 */}
      <Route path="/custom/:categoryId" element={<CustomRecordList />} />
      <Route path="/custom/:categoryId/new" element={<CustomRecordNew />} />
      <Route path="/custom/:categoryId/edit/:recordId" element={<CustomRecordNew />} />
      <Route path="/custom/:categoryId/:recordId" element={<CustomRecordView />} />

      {/* 설정 관련 라우트 */}
      <Route path="/settings" element={<Settings />} />
      <Route path="/settings/account" element={<ProfileEdit />} />
      <Route path="/settings/notifications" element={<NotificationSettings />} />
      <Route path="/help" element={<Help />} />

      {/* 일치하는 라우트가 없을 경우 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};