import type { ActivityEvent, ActivityEventInput } from "@/types";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseActivityEventLogger } from "./supabase-event-logger";

/**
 * Activity Event Logger 인터페이스.
 *
 * Mock Mode: 메모리/콘솔 기록
 * Supabase Mode: activity_events 테이블에 실제로 저장/조회한다.
 *
 * 모든 메서드가 Promise를 반환한다 (Supabase 쿼리는 비동기이므로).
 * 저장/조회 실패는 조용히 무시하지 않고 던진다 (DataSourceError) —
 * 호출부가 이벤트 유실을 인지할 수 있어야 한다.
 */
export interface ActivityEventLogger {
  log(input: ActivityEventInput): Promise<ActivityEvent>;
  getRecentEvents(limit?: number): Promise<ActivityEvent[]>;
  getEventsByUser(userId: string): Promise<ActivityEvent[]>;
  /** 비회원(anonymous_id)으로 쌓인 과거 이벤트를 회원(userId)으로 재귀속시킨다. */
  linkAnonymousToUser?(anonymousId: string, userId: string): Promise<number>;
}

function generateEventId(): string {
  return `evt-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

/**
 * 메모리 기반 Mock 로거.
 * 개발환경에서는 console에도 출력해 개발 중 이벤트 흐름을 바로 확인할 수 있게 한다.
 * 서버리스/새로고침 환경에서는 메모리가 초기화되므로 영속 저장용이 아니라 데모/디버깅용이다.
 */
class MemoryActivityEventLogger implements ActivityEventLogger {
  private events: ActivityEvent[] = [];
  private readonly maxEvents = 500;

  async log(input: ActivityEventInput): Promise<ActivityEvent> {
    const event: ActivityEvent = {
      ...input,
      id: generateEventId(),
      occurredAt: input.occurredAt ?? new Date().toISOString(),
    };

    this.events = [event, ...this.events].slice(0, this.maxEvents);

    if (process.env.NODE_ENV !== "production") {
      console.log("[ActivityEvent:Mock]", event.eventType, {
        userId: event.userId,
        anonymousId: event.anonymousId,
        entityType: event.entityType,
        entityId: event.entityId,
        metadata: event.metadata,
      });
    }

    return event;
  }

  async getRecentEvents(limit = 50): Promise<ActivityEvent[]> {
    return this.events.slice(0, limit);
  }

  async getEventsByUser(userId: string): Promise<ActivityEvent[]> {
    return this.events.filter((event) => event.userId === userId);
  }

  async linkAnonymousToUser(anonymousId: string, userId: string): Promise<number> {
    let count = 0;
    this.events = this.events.map((event) => {
      if (event.anonymousId === anonymousId) {
        count++;
        return { ...event, userId, anonymousId: undefined };
      }
      return event;
    });
    return count;
  }
}

let logger: ActivityEventLogger | null = null;

function createMockActivityEventLogger(): ActivityEventLogger {
  return new MemoryActivityEventLogger();
}

/** 앱 전역에서 사용하는 싱글턴 로거. resolveRepository 정책을 그대로 따른다. */
export function getActivityEventLogger(): ActivityEventLogger {
  if (!logger) {
    logger = resolveRepository("ActivityEventLogger", {
      mock: createMockActivityEventLogger,
      supabase: createSupabaseActivityEventLogger,
    });
  }
  return logger;
}

/**
 * 하위호환용 프록시 객체.
 * 기존 호출부가 `activityEventLogger.log(...)` 형태로 그대로 쓸 수 있게 유지한다.
 * 내부적으로는 매 호출마다 resolveRepository로 결정된 싱글턴에 위임한다.
 */
export const activityEventLogger: ActivityEventLogger = {
  log: (input) => getActivityEventLogger().log(input),
  getRecentEvents: (limit) => getActivityEventLogger().getRecentEvents(limit),
  getEventsByUser: (userId) => getActivityEventLogger().getEventsByUser(userId),
  linkAnonymousToUser: (anonymousId, userId) => {
    const impl = getActivityEventLogger().linkAnonymousToUser;
    return impl ? impl(anonymousId, userId) : Promise.resolve(0);
  },
};

/** 컴포넌트/서비스 레이어에서 간단히 호출할 수 있는 헬퍼. */
export function logActivityEvent(input: ActivityEventInput): Promise<ActivityEvent> {
  return getActivityEventLogger().log(input);
}
