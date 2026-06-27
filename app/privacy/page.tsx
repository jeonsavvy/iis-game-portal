import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "개인정보처리방침 | iis",
  description: "iis 개인정보처리방침",
};

const PRIVACY_SECTIONS = [
  {
    title: "1. 처리하는 개인정보 항목",
    items: [
      "로그인 및 권한 확인을 위해 이메일 주소, 인증 식별자, 세션 쿠키, 사용자 역할 정보를 처리합니다.",
      "게임 제작 기능 제공을 위해 제작 세션, 프롬프트, 대화 이력, 첨부 파일 메타데이터, 생성·수정·퍼블리시 상태를 처리합니다.",
      "공개 게임 운영을 위해 게임 메타데이터, 썸네일, 공개 URL, 플레이 이벤트, 리더보드 이름과 점수를 처리할 수 있습니다.",
      "중복 플레이 집계 방지를 위해 IP와 User-Agent를 조합한 fingerprint hash를 처리합니다. 원본 IP와 User-Agent를 그대로 공개하지 않습니다.",
    ],
  },
  {
    title: "2. 개인정보의 처리 목적",
    items: [
      "회원 인증, 작업공간 및 운영실 접근 권한 확인, 계정별 제작 세션 복원에 사용합니다.",
      "게임 생성, 수정 검토, 퍼블리시, 공개 카탈로그와 플레이 화면 제공에 사용합니다.",
      "플레이 집계, 리더보드 표시, 장애 대응, 보안 점검, 부정 이용 방지에 사용합니다.",
    ],
  },
  {
    title: "3. 보유 및 이용 기간",
    items: [
      "계정 및 권한 정보는 서비스 이용 종료 또는 삭제 요청 시까지 보관합니다.",
      "제작 세션, 프롬프트, 첨부 파일 메타데이터, 공개 게임 정보는 서비스 제공과 이력 관리에 필요한 기간 동안 보관합니다.",
      "플레이 이벤트와 리더보드 정보는 공개 게임 운영에 필요한 기간 동안 보관하며, 목적 달성 또는 삭제 요청 시 지체 없이 파기합니다.",
      "법령상 보존 의무가 있는 경우 해당 기간 동안 별도 보관할 수 있습니다.",
    ],
  },
  {
    title: "4. 제3자 제공 및 처리위탁",
    items: [
      "서비스 제공을 위해 Supabase, Cloudflare, IIS Core Engine 및 게임 산출물 저장소를 사용할 수 있습니다.",
      "법령에 근거가 있거나 이용자의 동의가 있는 경우를 제외하고 개인정보를 외부에 판매하거나 목적 외로 제공하지 않습니다.",
    ],
  },
  {
    title: "5. 정보주체의 권리",
    items: [
      "이용자는 개인정보 열람, 정정, 삭제, 처리정지를 요청할 수 있습니다.",
      "요청은 아래 개인정보 문의 이메일로 접수하며, 본인 확인 후 관련 법령에 따라 처리합니다.",
    ],
  },
  {
    title: "6. 안전성 확보 조치",
    items: [
      "작업공간과 운영실은 Supabase Auth 및 역할 기반 권한 확인 후 접근을 허용합니다.",
      "서버 전용 키와 Core Engine 토큰은 브라우저 번들에 포함하지 않으며, BFF 라우트에서 필요한 범위로만 사용합니다.",
      "플레이 산출물은 artifact proxy와 iframe sandbox 정책을 통해 격리해 제공합니다.",
    ],
  },
] as const;

export default function PrivacyPage() {
  return (
    <section className="grid gap-6">
      <Card className="p-2">
        <CardHeader>
          <CardDescription>Privacy</CardDescription>
          <CardTitle className="text-[clamp(2rem,4vw,3rem)] tracking-[-0.05em]">개인정보처리방침</CardTitle>
          <CardDescription className="max-w-3xl text-sm leading-7">
            iis는 브라우저 게임 제작과 플레이 서비스를 제공하기 위해 필요한 최소한의 개인정보를 처리합니다.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
          <CardDescription>본 방침은 iis Game Portal 서비스에 적용됩니다.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
          <div className="rounded-2xl border border-[#1b1337]/10 bg-white/60 p-4">
            <p className="font-semibold text-foreground">개인정보처리자</p>
            <p className="mt-1">전찬혁</p>
          </div>
          <div className="rounded-2xl border border-[#1b1337]/10 bg-white/60 p-4">
            <p className="font-semibold text-foreground">개인정보 문의</p>
            <p className="mt-1">jeonsavvy@gmail.com</p>
          </div>
          <div className="rounded-2xl border border-[#1b1337]/10 bg-white/60 p-4">
            <p className="font-semibold text-foreground">시행일</p>
            <p className="mt-1">2026년 3월 1일</p>
          </div>
        </CardContent>
      </Card>

      {PRIVACY_SECTIONS.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
