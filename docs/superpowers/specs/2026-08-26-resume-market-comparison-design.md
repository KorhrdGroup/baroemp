# 첨삭 결과 → 시장 비교 카드 설계 (Resume Market Comparison)

- 작성일: 2026-08-26
- 상태: 사용자 승인된 설계 (구현 계획 작성 전)
- 관련 기능: AI 이력서/자소서 첨삭, 커리어갭 엔진, 리드 스코어링

## 1. 배경과 목표

"이력서/자소서를 AI 첨삭하면 → 실제 취업에 무엇이 더 필요한지(자격/경험)를 실제 채용시장
데이터로 보여주고 → 준비방법(콘텐츠/수업)으로 연결하고 → 그 관심 신호를 영업 DB(리드)로
축적한다"는 핵심 제품 흐름에서, 현재 끊겨 있는 **첨삭 결과 화면 ↔ 커리어갭 엔진** 구간을
연결한다.

비교 엔진 자체는 신규 개발이 아니다. 다음이 이미 존재하며 그대로 재사용한다:

- 시장 통계(요구/우대 공고 비율): `src/services/market-requirement.service.ts`
- Counterfactual 시뮬레이션(자격 취득 가정 시 매칭 공고 수 변화): `src/services/career-gap-engine.service.ts` (스펙 17번)
- 공고 vs 사용자 비교: `src/services/job-requirement-comparison.service.ts`
- 이력서 → Career Profile 병합: `src/services/resume-career-merge.service.ts` (스펙 22/50번)
- 부족 자격 → 콘텐츠 추천: `findRecommendedContent` (career-gap-engine)
- 리드 스코어링: `src/services/lead-score.service.ts`

**신규로 만드는 것은 "첨삭 결과 화면에서 엔진을 부르는 연결부 + 시장 비교 카드 UI"뿐이다.**

핵심 원칙(기존 스펙 49/50번 유지): 카드에 표시되는 모든 수치는 AI가 생성한 값이 아니라
항상 실제 jobs/job_requirements 데이터에서 결정론적으로 산출한다.

## 2. 선택한 접근 (A안: 카드 임베드)

검토한 대안:

- **A. 카드 임베드 (채택)** — 첨삭 결과 하단에 기존 커리어갭 엔진 산출값으로 카드를 렌더.
  공수 최소, 데이터 신뢰 원칙 유지.
- B. AI 첨삭 결과를 requirement로 구조화 — AI 출력이 통계 표시를 좌우하게 되어 신뢰 원칙
  훼손 + provider 교체 부담. 기각.
- C. 커리어갭 대시보드로 CTA 이동만 — 흐름 단절로 핵심 경험 미달. 기각.

## 3. 데이터 흐름

```
[첨삭 결과 표시]  reviewResumeAiAction (기존, 변경 없음)
        ‖ (병렬·독립)
[카드 데이터]     getResumeMarketComparisonAction(resumeId)  ← 신규 Server Action
                    ├─ ① mergeResumeToCareerProfile(resumeId)   (기존) 자격/스킬 최신화
                    ├─ ② 타겟 occupation 결정 (아래 4절 fallback)
                    ├─ ③ runCareerGapAnalysis(...)              (기존)
                    └─ ④ ResumeMarketComparisonView 로 축약 반환 ← 신규 타입
```

- AI 첨삭과 카드 조회는 **서로 독립된 액션**이다. AI가 실패해도 카드는 뜨고, 엔진이
  실패해도 첨삭 결과는 정상 노출된다(카드만 숨김, 서버 로그만 남김).
- 신규 서비스 파일: `src/services/resume-market-comparison.service.ts`
  (Server Action은 `src/features/resume/resume-actions.ts`에 추가)

## 4. 타겟(직무) 결정 — 3단계 fallback

1. `resume.targetJobId`가 있으면 → 해당 공고를 `classifyJob`으로 분류한 occupation 기준
2. 없으면 → `resume.desiredJobTitle`을 occupation 카탈로그에 매칭
3. 그것도 없으면 → 수치 카드 대신 "희망직무를 설정하면 채용시장 비교를 보여드려요" CTA만
   표시 (`ResumeMarketComparisonView.state = 'NEEDS_TARGET'`)

## 5. 카드 내용

미충족(NOT_SATISFIED) requirement 중 시장 수요가 높은 순으로 **상위 2~3개**. 각 항목:

- "이 자격을 요구하거나 우대하는 공고 **N%**" — market-requirement 통계
- "취득 시 회원님 조건과 일치하는 공고 **17건 → 36건**" — counterfactual 시뮬레이션
- **[자격 준비방법 확인]** 버튼 — `findRecommendedContent` 결과 콘텐츠로 이동
- 표본 수가 confidence 최소 기준(`computeMarketConfidence`) 미달이면 % 수치를 숨기고
  정성 문구("이 직무에서 자주 요구되는 자격입니다")로 대체

"취업률 82% 더 높습니다"류 문구는 **이번 범위에서 제외**한다. 채용 결과 데이터가 없어
산출 불가능하며 표시광고 리스크가 있다. 산출 가능한 지표(공고 비율, 매칭 건수 변화)만 쓴다.

## 6. 자소서 첨삭 적용

동일 카드 컴포넌트를 자소서 첨삭 결과 하단에도 렌더한다. 타겟은 자소서에 연결된 공고
기준(연결 공고가 없으면 4절 fallback 2→3 순서 동일 적용).

## 7. 영업 DB(리드) 연결

카드 상호작용을 activity event로 기록해 lead-score 신호로 흘린다. 기존
`trackCareerGap*` 액션 패턴을 재사용하되 진입점 구분을 위해 metadata에
`source: 'resume_review' | 'cover_letter_review'`를 남긴다.

- 카드 노출 (comparison_viewed)
- 시뮬레이션 확인 (simulation_viewed)
- [자격 준비방법 확인] 클릭 (recommendation_clicked) — "자격 관심 리드" 세그먼트의 원천

## 8. 에러 처리

- 엔진/통계 실패: 카드 미표시, 첨삭 결과는 정상. 서버 로그 기록.
- merge 실패: 카드 산출은 기존 프로필 기준으로 계속 진행(merge는 best-effort).
- 타겟 미결정: NEEDS_TARGET 상태로 CTA 렌더 (에러 아님).

## 9. 테스트

서비스 레벨 (`resume-market-comparison.service`):

- 타겟 결정 fallback 3분기 (targetJobId / desiredJobTitle / 없음)
- 첨삭 후 이력서 자격이 user_qualifications에 반영된 상태로 카드가 산출되는지
- confidence 미달 시 수치 숨김 분기
- 엔진 실패 시 카드 없음 + 첨삭 흐름 무영향

## 10. 범위 외 (후속 기획 항목)

- 취업률 문구의 공식 통계 데이터 소스 확보
- 수업/자격 제휴처 연결 및 아웃링크 전환 추적 상세
- 영업 세그먼트 정의·마케팅 수신동의 UX
- 전환 퍼널 KPI 대시보드
