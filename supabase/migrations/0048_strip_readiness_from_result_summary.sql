-- 0048_strip_readiness_from_result_summary.sql
--
-- 검사 결과 화면에서 "현재 준비도"를 내렸다(result-builder.ts / occupation-recommendation-card.tsx).
-- 준비도 점수는 재료의 절반 이상이 적합도 총점과 겹쳐 두 숫자가 늘 같이 움직였고,
-- 준비도만의 고유 정보인 "필수 자격 보유 여부"는 카드의 "필요한 자격 · 부족한 조건"에
-- 자격 이름까지 구체적으로 나오므로 숫자로 뭉뚱그릴 이유가 없었다.
--
-- summary 는 검사 완료 시점에 문장으로 만들어 저장하는 값이라, 코드를 고쳐도
-- 이미 저장된 결과에는 "현재 준비도 N점" 문구가 남는다. 기존 행에서도 걷어낸다.

update public.assessment_results
set summary = regexp_replace(summary, ', 현재 준비도 [0-9]+점', '')
where summary like '%현재 준비도%';
