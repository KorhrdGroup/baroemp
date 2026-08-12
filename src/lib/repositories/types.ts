/**
 * Repository 인터페이스 정의.
 *
 * 이 서비스는 STEP 1에서 실제 DB(Supabase)에 연결하지 않지만,
 * 모든 데이터 접근을 Repository 인터페이스 뒤로 숨겨두면
 * 이후 Mock -> Supabase 구현체 교체가 파일 하나만 바꾸는 작업이 된다.
 *
 * 모든 메서드는 Promise를 반환한다. Mock 구현체는 즉시 resolve 하지만,
 * 이렇게 해두면 호출부 코드는 나중에 실제 비동기 DB 호출로 바뀌어도 변경할 필요가 없다.
 */
export interface ReadRepository<T, TFilter = undefined> {
  findAll(filter?: TFilter): Promise<T[]>;
  findById(id: string): Promise<T | null>;
}

export interface WriteRepository<T, TInput> {
  create(input: TInput): Promise<T>;
  update(id: string, input: Partial<TInput>): Promise<T | null>;
  remove(id: string): Promise<boolean>;
}

export interface CrudRepository<T, TInput, TFilter = undefined>
  extends ReadRepository<T, TFilter>,
    WriteRepository<T, TInput> {}
