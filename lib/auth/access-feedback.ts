export function getLoginRequiredCopy(nextPath: string) {
  return {
    message: "로그인 후 계속할 수 있습니다.",
    ctaLabel: "로그인하고 계속하기",
    href: `/login?next=${encodeURIComponent(nextPath)}`,
  };
}

export function getAccessDeniedCopy(identity: string) {
  return {
    message: "이 계정으로는 이 화면에 접근할 수 없습니다.",
    detail: `현재 계정: ${identity}`,
    primaryCtaLabel: "홈으로 이동",
    primaryHref: "/",
  };
}
