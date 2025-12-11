import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== 계정 삭제 요청 시작 ===');
    
    const authHeader = req.headers.get('Authorization');
    console.log('Authorization header exists:', !!authHeader);
    
    if (!authHeader) {
      console.error('인증 헤더 없음');
      return new Response(
        JSON.stringify({ error: '인증이 필요합니다' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // JWT 토큰 추출
    const token = authHeader.replace('Bearer ', '');
    
    // Service Role 클라이언트로 토큰 검증 및 사용자 확인
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('JWT 토큰 검증 중...');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError) {
      console.error('토큰 검증 오류:', userError);
      return new Response(
        JSON.stringify({ error: '유효하지 않은 인증입니다' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user) {
      console.error('사용자를 찾을 수 없음');
      return new Response(
        JSON.stringify({ error: '유효하지 않은 인증입니다' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('인증된 사용자 ID:', user.id);

    console.log('계정 삭제 시작...');
    // Auth 계정 삭제 (RLS와 CASCADE로 관련 데이터 자동 삭제)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('계정 삭제 실패:', deleteError);
      return new Response(
        JSON.stringify({ error: '계정 삭제에 실패했습니다' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ 계정 삭제 완료: ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, message: '계정이 삭제되었습니다' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Delete user error:', error);
    const errorMessage = error instanceof Error ? error.message : '서버 오류가 발생했습니다';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
