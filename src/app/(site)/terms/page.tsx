import type { Metadata } from "next";
import { Article, PolicyArticle } from "@/components/common/policy-article";

export const metadata: Metadata = {
  title: "이용약관 | 한평생 바로취업",
};

/** 한평생그룹 공통 이용약관 (hanyouhak.com 시행문서 기준, 2026-04-14 시행). */
export default function TermsPage() {
  return (
    <PolicyArticle title="이용약관" effectiveDate="2026년 4월 14일">
      <Article heading="제 1조(목적)">
        <p>
          이 약관은 한평생그룹(이하 &lsquo;회사&rsquo;)이 제공하는 제반 서비스의 이용과 관련하여 회사와 회원과의
          권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
        </p>
      </Article>
      <Article heading="제 2조(정의)">
        <ol>
          <li>&lsquo;서비스&rsquo;란 회사가 제공하는 모든 인터넷 및 모바일 관련 서비스를 의미합니다.</li>
          <li>
            &lsquo;회원&rsquo;이란 회사에 이름, 연락처, 이메일 등 개인정보를 제공하여 등록된 자 또는 카카오, 네이버 등
            외부 플랫폼 연동을 통해 이용계약을 체결한 자를 말합니다.
          </li>
        </ol>
      </Article>
      <Article heading="제 3조(이용계약의 체결)">
        <ol>
          <li>
            이용계약은 이용자가 본 약관에 동의하고 가입을 신청하거나, 외부 플랫폼(카카오, 네이버 등)의 인증을 통해
            동의 의사를 표시하고 회사가 이를 승낙함으로써 성립합니다.
          </li>
          <li>회사는 이름, 전화번호 등 서비스 제공에 필요한 최소한의 정보를 수집합니다.</li>
        </ol>
      </Article>
      <Article heading="제 4조(회원 탈퇴 및 자격 상실)">
        <ol>
          <li>회원은 서비스 내 &lsquo;탈퇴하기&rsquo; 메뉴 또는 고객센터를 통해 언제든지 이용계약 해지를 신청할 수 있습니다.</li>
          <li>소셜 로그인 회원의 경우, 해당 플랫폼의 연동 해제와 별도로 서비스 내 탈퇴 절차를 완료해야 할 수 있습니다.</li>
          <li>
            탈퇴 시 관련 법령에 따라 보존해야 하는 경우를 제외하고 회원의 개인정보 및 이용 데이터는 즉시 삭제되며
            복구가 불가능합니다.
          </li>
        </ol>
      </Article>
      <Article heading="제 5조(개인정보 보호 의무)">
        <ol>
          <li>회사는 회원의 개인정보를 보호하기 위해 &lsquo;개인정보 보호법&rsquo; 등 관계 법령을 준수합니다.</li>
          <li>
            수집된 이름, 이메일, 전화번호 등은 서비스 운영 및 고객 응대 이외의 용도로 사용되지 않으며, 상세한 내용은
            &lsquo;개인정보 처리방침&rsquo;에 고지합니다.
          </li>
        </ol>
      </Article>
      <Article heading="제 6조(약관의 변경)">
        <p>
          회사는 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있으며, 변경 시 서비스 내 공지사항을 통해
          7일 전(회원에게 불리한 경우 30일 전)부터 공지합니다.
        </p>
      </Article>
      <Article heading="제 7조(분쟁 해결 및 준거법)">
        <p>
          본 약관은 대한민국 법률에 따라 해석되며, 서비스 이용과 관련하여 발생한 분쟁은 회사 소재지 관할 법원을
          제1심 합의관할 법원으로 합니다.
        </p>
      </Article>
    </PolicyArticle>
  );
}
