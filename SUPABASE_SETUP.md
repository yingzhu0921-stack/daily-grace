# Supabase 설정 가이드

## 1. .env.local 파일 수정

프로젝트 루트의 `.env.local` 파일을 다음과 같이 수정하세요:

```env
GOOGLE_API_KEY=AIzaSyClLWNgs0YsTX6jvlLo76OAtsOE7ZVDixI
VITE_SUPABASE_URL=여기에_프로젝트_URL_붙여넣기
VITE_SUPABASE_ANON_KEY=여기에_anon_public_키_붙여넣기
VITE_SUPABASE_PUBLISHABLE_KEY=여기에_anon_public_키_붙여넣기
```

### 값 찾는 방법:

1. https://supabase.com/dashboard 로 이동
2. 새로 만든 프로젝트 선택
3. 왼쪽 메뉴에서 **Settings** → **API** 클릭
4. **Project URL** 복사 → `VITE_SUPABASE_URL`에 붙여넣기
5. **anon public** 키 복사 → `VITE_SUPABASE_ANON_KEY`와 `VITE_SUPABASE_PUBLISHABLE_KEY` 둘 다에 붙여넣기

주의: `service_role` 키는 절대 복사하지 마세요!

## 2. 개발 서버 재시작

터미널에서:

```bash
# 기존 서버 종료 (Ctrl+C)
npm run dev
```

## 3. 데이터베이스 테이블 생성

Supabase Dashboard에서:
1. 왼쪽 메뉴 **SQL Editor** 클릭
2. "New Query" 클릭
3. 아래 SQL을 복사해서 붙여넣기
4. "Run" 버튼 클릭

```sql
-- 필요한 테이블들을 생성합니다
-- 참고: 현재는 localStorage를 사용하고 있어서 당장 필요하지 않을 수 있습니다
-- 나중에 클라우드 동기화 기능을 추가할 때 필요합니다

-- Categories 테이블
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL,
  fields JSONB DEFAULT '[]',
  include_in_goal BOOLEAN DEFAULT true,
  active_days INTEGER[] DEFAULT ARRAY[0,1,2,3,4,5,6],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom Records 테이블
CREATE TABLE IF NOT EXISTS custom_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  title TEXT,
  passage TEXT,
  content TEXT,
  application TEXT[],
  apply_checked JSONB DEFAULT '{}',
  answered BOOLEAN DEFAULT false,
  answered_detail TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security 활성화
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_records ENABLE ROW LEVEL SECURITY;

-- 정책: 사용자는 자신의 데이터만 볼 수 있음
CREATE POLICY "Users can view own categories"
  ON categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON categories FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own records"
  ON custom_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own records"
  ON custom_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own records"
  ON custom_records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own records"
  ON custom_records FOR DELETE
  USING (auth.uid() = user_id);
```

## 4. 확인

브라우저에서 http://localhost:8080 접속하여 에러가 없는지 확인하세요.

---

## 보안 참고사항

✅ **공개해도 안전한 키:**
- `anon public` 키
- Project URL

❌ **절대 공개하면 안 되는 키:**
- `service_role` 키
- Database password

**왜 anon 키는 안전한가요?**
- Row Level Security (RLS) 정책으로 보호됩니다
- 프론트엔드 코드에 포함되어 사용자에게 노출되는 것이 정상입니다
- GitHub에 올라가도 괜찮습니다
