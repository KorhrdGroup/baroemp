import type { Metadata } from "next";
import { Article, PolicyArticle } from "@/components/common/policy-article";

export const metadata: Metadata = {
  title: "마케팅 정보·알림톡 수신 동의 | 한평생 바로취업",
};

/**
 * [선택] 마케팅 정보·알림톡 수신 동의의 내용.
 * 가입 화면의 "보기", 마이페이지 내 정보, 소셜 가입 직후 동의 창에서 연다.
 * 광고성 정보를 보내려면 누가·무엇을·어떻게 보내고 어떻게 철회하는지를 동의 전에 보여줘야 한다.
 * 맞춤 공고 알림은 이 동의와 따로다 - 회원이 마이페이지 "알림"에서 직접 켜고 지역·직종을 고르는 알림(job_alert_settings).
 */
export default function MarketingConsentPage() {
  return (
    <PolicyArticle title="마케팅 정보·알림톡 수신 동의 (선택)" effectiveDate="2026년 9월 2일">
      <Article heading="1. 보내는 사람">
        <p>한평생그룹(한평생 바로취업)</p>
      </Article>
      <Article heading="2. 보내는 내용">
        <ol>
          <li>받을 수 있는 정부 지원금·교육훈련 제도 안내</li>
          <li>직업진단·이력서 첨삭 등 서비스 소식과 이벤트 (광고성 정보 포함)</li>
        </ol>
        <p>
          맞춤 채용공고 알림은 이 동의와 별개입니다. 마이페이지 &gt; 알림에서 직접 켜고 지역·직종을 고를 수
          있으며, 이 동의를 하지 않거나 철회해도 공고 알림은 따로 받을 수 있습니다.
        </p>
      </Article>
      <Article heading="3. 보내는 방법">
        <p>카카오 알림톡(휴대전화번호 기준). 알림톡을 받을 수 없는 경우 문자 또는 이메일로 보낼 수 있습니다.</p>
        <p>수신은 무료이며, 회원에게 비용이 청구되지 않습니다.</p>
      </Article>
      <Article heading="4. 이용하는 정보">
        <p>이름, 휴대전화번호, 이메일, 취업 프로필(희망 직종·지역·근무형태·급여, 보유 자격 등)</p>
      </Article>
      <Article heading="5. 보유·이용 기간">
        <p>동의를 철회하거나 회원을 탈퇴할 때까지</p>
      </Article>
      <Article heading="6. 철회 방법">
        <ol>
          <li>마이페이지 &gt; 내 정보에서 &ldquo;마케팅 정보 · 알림톡 받기&rdquo;를 끄기</li>
          <li>이메일 korhrdpartners@naver.com 으로 철회 요청</li>
        </ol>
        <p>철회 즉시 발송이 중단되며, 철회 후에도 서비스는 그대로 이용할 수 있습니다.</p>
      </Article>
      <Article heading="7. 동의하지 않을 권리">
        <p>
          이 동의는 선택 사항입니다. 동의하지 않아도 회원 가입과 서비스 이용에 불이익이 없으며, 다만 지원금·교육훈련
          안내와 서비스 소식을 알림으로 받아볼 수 없습니다.
        </p>
      </Article>
    </PolicyArticle>
  );
}
