/**
 * 카카오 소셜 로그인 서비스
 * ─────────────────────────────────────────────────────────
 * 카카오 OAuth 2.0 인증 흐름을 처리합니다.
 * 
 * 흐름:
 * 1. 사용자가 카카오 로그인 버튼 클릭 → getKakaoAuthUrl()로 인증 URL 생성
 * 2. 카카오 로그인 페이지에서 사용자 동의
 * 3. 카카오가 Redirect URI로 인가 코드(code) 전달
 * 4. getKakaoToken()으로 인가 코드 → 액세스 토큰 교환
 * 5. getKakaoUserInfo()로 액세스 토큰 → 사용자 정보 조회
 * 6. findOrCreateKakaoUser()로 DB에 사용자 생성 또는 조회
 */

import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { env } from '../utils/env';

const prisma = new PrismaClient();

// 카카오 OAuth URL
const KAKAO_AUTH_URL = 'https://kauth.kakao.com/oauth/authorize';
const KAKAO_TOKEN_URL = 'https://kauth.kakao.com/oauth/token';
const KAKAO_USER_INFO_URL = 'https://kapi.kakao.com/v2/user/me';

/**
 * 카카오 사용자 정보 타입
 */
interface KakaoUserInfo {
  id: number;
  kakao_account?: {
    email?: string;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
    };
  };
}

/**
 * 카카오 로그인 URL 생성
 * - 사용자를 이 URL로 리다이렉트하면 카카오 로그인 페이지가 나타남
 */
export function getKakaoAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: env.KAKAO_CLIENT_ID,
    redirect_uri: env.KAKAO_REDIRECT_URI,
    response_type: 'code',
    scope: 'profile_nickname profile_image account_email',
  });

  return `${KAKAO_AUTH_URL}?${params.toString()}`;
}

/**
 * 인가 코드로 액세스 토큰 교환
 * @param code 카카오에서 받은 인가 코드
 */
export async function getKakaoToken(code: string): Promise<string> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: env.KAKAO_CLIENT_ID,
    redirect_uri: env.KAKAO_REDIRECT_URI,
    code,
  });

  // 클라이언트 시크릿이 설정된 경우 추가
  if (env.KAKAO_CLIENT_SECRET) {
    params.append('client_secret', env.KAKAO_CLIENT_SECRET);
  }

  const response = await axios.post(KAKAO_TOKEN_URL, params.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  return response.data.access_token;
}

/**
 * 액세스 토큰으로 카카오 사용자 정보 조회
 * @param accessToken 카카오 액세스 토큰
 */
export async function getKakaoUserInfo(accessToken: string): Promise<KakaoUserInfo> {
  const response = await axios.get(KAKAO_USER_INFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data;
}

/**
 * 카카오 사용자 정보로 DB 사용자 찾거나 생성
 * @param kakaoUser 카카오에서 받은 사용자 정보
 */
export async function findOrCreateKakaoUser(kakaoUser: KakaoUserInfo) {
  const kakaoId = String(kakaoUser.id);
  const email = kakaoUser.kakao_account?.email;
  const nickname = kakaoUser.kakao_account?.profile?.nickname;
  const profileImage = kakaoUser.kakao_account?.profile?.profile_image_url;

  // 1) 카카오 ID로 기존 사용자 찾기
  let user = await prisma.user.findFirst({
    where: {
      provider: 'kakao',
      providerId: kakaoId,
    },
  });

  if (user) {
    // 프로필 정보 업데이트 (닉네임, 이미지가 변경되었을 수 있음)
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: nickname || user.name,
        profileImage: profileImage || user.profileImage,
      },
    });
    return user;
  }

  // 2) 이메일로 기존 사용자 찾기 (이미 이메일로 가입한 경우)
  if (email) {
    user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // 기존 계정에 카카오 연결
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          provider: 'kakao',
          providerId: kakaoId,
          profileImage: profileImage || user.profileImage,
        },
      });
      return user;
    }
  }

  // 3) 새 사용자 생성
  // 이메일이 없는 경우 카카오 ID 기반 임시 이메일 생성
  const userEmail = email || `kakao_${kakaoId}@kakao.user`;

  user = await prisma.user.create({
    data: {
      email: userEmail,
      name: nickname || `카카오사용자${kakaoId.slice(-4)}`,
      provider: 'kakao',
      providerId: kakaoId,
      profileImage,
      passwordHash: null, // 소셜 로그인은 비밀번호 없음
    },
  });

  return user;
}

