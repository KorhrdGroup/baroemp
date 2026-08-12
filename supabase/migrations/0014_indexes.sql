-- 0014_indexes.sql

create index if not exists idx_profiles_role on public.profiles (role);
create index if not exists idx_profiles_last_active on public.profiles (last_active_at desc);
create index if not exists idx_career_profiles_age_group on public.career_profiles (age_group);
create index if not exists idx_career_profiles_region on public.career_profiles (preferred_region);
create index if not exists idx_activity_user_occurred on public.activity_events (user_id, occurred_at desc);
create index if not exists idx_activity_anonymous_occurred on public.activity_events (anonymous_id, occurred_at desc);
create index if not exists idx_activity_event_type on public.activity_events (event_type);
create index if not exists idx_activity_entity on public.activity_events (entity_type, entity_id);
create index if not exists idx_activity_utm_campaign on public.activity_events (utm_campaign);
create index if not exists idx_contents_type_status on public.contents (type, status);
create index if not exists idx_content_rules_content on public.content_recommendation_rules (content_id) where status = 'active';
create index if not exists idx_leads_grade_score on public.leads (grade, score desc);
create index if not exists idx_leads_status on public.leads (status);
create index if not exists idx_leads_last_activity on public.leads (last_activity_at desc);
create index if not exists idx_jobs_category_region on public.jobs (job_category, region);
create index if not exists idx_match_results_user_score on public.match_results (user_id, score desc);
create index if not exists idx_match_results_target on public.match_results (target_type, target_id);
create index if not exists idx_user_acquisition_source on public.user_acquisition (utm_source);
create index if not exists idx_user_acquisition_campaign on public.user_acquisition (utm_campaign);
create index if not exists idx_consultations_user on public.consultations (user_id, created_at desc);
create index if not exists idx_user_job_interests_score on public.user_job_interests (user_id, interest_score desc);
